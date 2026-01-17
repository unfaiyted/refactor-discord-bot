#!/usr/bin/env bun

/**
 * Discord Duplicate Forum Threads Cleanup Script
 *
 * This script identifies and deletes duplicate Discord forum threads that were
 * created during the VPS re-indexing. It compares VPS database entries against
 * local database entries to find threads that don't exist in the local database.
 *
 * Usage:
 *   bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts --dry-run
 *   bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts
 */

import { PrismaClient } from '@prisma/client';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

const isDryRun = process.argv.includes('--dry-run');

interface DuplicateThread {
  forumThreadId: string;
  forumPostId: string;
  url: string;
  title: string;
  createdAt: Date;
}

async function loadLocalThreadIds(): Promise<Set<string>> {
  console.log('📖 Loading local database thread IDs...');

  // Connect to LOCAL database
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    const recommendations = await localPrisma.recommendation.findMany({
      select: { forumThreadId: true },
      where: { forumThreadId: { not: null } },
    });

    const threadIds = new Set(
      recommendations.map((r) => r.forumThreadId).filter((id): id is string => id !== null)
    );

    console.log(`✅ Found ${threadIds.size} thread IDs in local database`);
    return threadIds;
  } finally {
    await localPrisma.$disconnect();
  }
}

async function getVPSDuplicates(localThreadIds: Set<string>): Promise<DuplicateThread[]> {
  console.log('\n🔍 Querying VPS database for duplicate threads...');
  console.log('Note: You need to run this script ON the VPS to query the VPS database');
  console.log('Alternatively, provide VPS DATABASE_URL as VPS_DATABASE_URL env variable\n');

  const vpsDbUrl = process.env.VPS_DATABASE_URL;
  if (!vpsDbUrl) {
    throw new Error(
      'VPS_DATABASE_URL environment variable not set. Run this script on VPS or provide VPS database URL.'
    );
  }

  const vpsPrisma = new PrismaClient({
    datasources: {
      db: {
        url: vpsDbUrl,
      },
    },
  });

  try {
    const vpsRecommendations = await vpsPrisma.recommendation.findMany({
      select: {
        forumThreadId: true,
        forumPostId: true,
        url: true,
        title: true,
        createdAt: true,
      },
      where: { forumThreadId: { not: null } },
    });

    // Find threads that exist on VPS but NOT in local database
    const duplicates: DuplicateThread[] = vpsRecommendations
      .filter((rec) => rec.forumThreadId && !localThreadIds.has(rec.forumThreadId))
      .map((rec) => ({
        forumThreadId: rec.forumThreadId!,
        forumPostId: rec.forumPostId!,
        url: rec.url,
        title: rec.title || 'Untitled',
        createdAt: rec.createdAt,
      }));

    console.log(`✅ Found ${duplicates.length} duplicate threads to delete`);
    return duplicates;
  } finally {
    await vpsPrisma.$disconnect();
  }
}

async function deleteDiscordThreads(duplicates: DuplicateThread[]): Promise<void> {
  if (duplicates.length === 0) {
    console.log('\n✅ No duplicate threads to delete!');
    return;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('Duplicate Threads to Delete:');
  console.log(`${'='.repeat(50)}`);

  duplicates.forEach((dup, index) => {
    console.log(`\n${index + 1}. Thread ID: ${dup.forumThreadId}`);
    console.log(`   Title: ${dup.title}`);
    console.log(`   URL: ${dup.url}`);
    console.log(`   Created: ${dup.createdAt.toISOString()}`);
  });

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No threads will be deleted');
    return;
  }

  console.log('\n🚨 Proceeding with deletion...');

  // Initialize Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);

  console.log('✅ Discord client logged in');

  let deletedCount = 0;
  let errorCount = 0;

  for (const duplicate of duplicates) {
    try {
      const channel = await client.channels.fetch(duplicate.forumThreadId);

      if (!channel) {
        console.log(`⚠️  Thread ${duplicate.forumThreadId} not found (may already be deleted)`);
        continue;
      }

      if (channel.isThread()) {
        await channel.delete('Duplicate thread cleanup - database restoration');
        deletedCount++;
        console.log(`✅ Deleted thread: ${duplicate.title} (${duplicate.forumThreadId})`);
      } else {
        console.log(`⚠️  Channel ${duplicate.forumThreadId} is not a thread`);
      }

      // Rate limiting: wait 1 second between deletions
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Error deleting thread ${duplicate.forumThreadId}:`, error.message);
    }
  }

  await client.destroy();

  console.log(`\n${'='.repeat(50)}`);
  console.log('Deletion Summary:');
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Successfully deleted: ${deletedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${duplicates.length}`);
}

async function main() {
  console.log('========================================');
  console.log('Discord Duplicate Cleanup Script');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  try {
    // Load local thread IDs
    const localThreadIds = await loadLocalThreadIds();

    // Get VPS duplicates
    const duplicates = await getVPSDuplicates(localThreadIds);

    // Delete Discord threads
    await deleteDiscordThreads(duplicates);

    console.log('\n✅ Script completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

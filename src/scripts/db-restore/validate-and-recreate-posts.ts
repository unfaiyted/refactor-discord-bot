#!/usr/bin/env bun

/**
 * Validate and Recreate Discord Posts Script
 *
 * Compares VPS database records with actual Discord forum posts and recreates
 * any missing posts that should exist based on the database.
 *
 * Usage:
 *   bun src/scripts/db-restore/validate-and-recreate-posts.ts --dry-run
 *   bun src/scripts/db-restore/validate-and-recreate-posts.ts
 */

import { PrismaClient } from '@prisma/client';
import { Client, GatewayIntentBits, ChannelType, ForumChannel } from 'discord.js';
import { config } from 'dotenv';
import { resolve } from 'path';
import {
  findMatchingTag,
  type LibraryType,
} from '../../features/recommendations/config/library-tags.js';

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

const isDryRun = process.argv.includes('--dry-run');

interface DatabaseRecord {
  id: string;
  forumThreadId: string | null;
  forumPostId: string | null;
  title: string | null;
  url: string;
  libraryType: string | null;
  aiSummary: string | null;
  description: string | null;
  thumbnail: string | null;
  primaryTag: string | null;
  secondaryTags: string[];
  createdAt: Date;
}

async function getDatabaseRecords(): Promise<DatabaseRecord[]> {
  console.log('📖 Loading records from VPS database...\n');

  const vpsDbUrl = process.env.VPS_DATABASE_URL;
  if (!vpsDbUrl) {
    throw new Error('VPS_DATABASE_URL environment variable not set');
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: vpsDbUrl,
      },
    },
  });

  try {
    const records = await prisma.recommendation.findMany({
      select: {
        id: true,
        forumThreadId: true,
        forumPostId: true,
        title: true,
        url: true,
        libraryType: true,
        aiSummary: true,
        description: true,
        thumbnail: true,
        primaryTag: true,
        secondaryTags: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`✅ Found ${records.length} total recommendations in database`);

    const withForumThreads = records.filter((r) => r.forumThreadId !== null);
    console.log(`   ${withForumThreads.length} have forumThreadId (should have Discord posts)`);
    console.log(
      `   ${records.length - withForumThreads.length} without forumThreadId (no Discord post expected)\n`
    );

    return records;
  } finally {
    await prisma.$disconnect();
  }
}

async function validateDiscordPosts(
  client: Client,
  records: DatabaseRecord[]
): Promise<{
  existing: DatabaseRecord[];
  missing: DatabaseRecord[];
}> {
  console.log('🔍 Validating Discord posts exist...\n');

  const recordsWithThreadId = records.filter((r) => r.forumThreadId !== null);
  const existing: DatabaseRecord[] = [];
  const missing: DatabaseRecord[] = [];

  for (const record of recordsWithThreadId) {
    try {
      const channel = await client.channels.fetch(record.forumThreadId!);

      if (channel && channel.isThread()) {
        existing.push(record);
      } else {
        console.log(`⚠️  Thread exists but is not a thread channel: ${record.forumThreadId}`);
        missing.push(record);
      }
    } catch (error: any) {
      if (error.code === 10008) {
        // Unknown channel - thread was deleted
        missing.push(record);
      } else {
        console.error(`❌ Error checking thread ${record.forumThreadId}:`, error.message);
        missing.push(record);
      }
    }

    // Rate limit protection
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Validation Results:`);
  console.log(`   ✅ Existing posts: ${existing.length}`);
  console.log(`   ❌ Missing posts: ${missing.length}\n`);

  return { existing, missing };
}

function getForumIdForLibraryType(libraryType: string | null): string | null {
  switch (libraryType) {
    case 'fiction':
      return process.env.FICTION_VAULT_FORUM_ID || null;
    case 'athenaeum':
      return process.env.ATHENAEUM_FORUM_ID || null;
    case 'growth':
      return process.env.GROWTH_LAB_FORUM_ID || null;
    default:
      // Default to Growth Lab if no library type
      return process.env.GROWTH_LAB_FORUM_ID || null;
  }
}

async function recreateMissingPosts(client: Client, missing: DatabaseRecord[]): Promise<void> {
  if (missing.length === 0) {
    console.log('✅ No missing posts to recreate!\n');
    return;
  }

  console.log(`${'='.repeat(70)}`);
  console.log(`Found ${missing.length} missing Discord posts`);
  console.log(`${'='.repeat(70)}\n`);

  // Group by library type
  const byLibrary = new Map<string, number>();
  missing.forEach((record) => {
    const lib = record.libraryType || 'unclassified';
    byLibrary.set(lib, (byLibrary.get(lib) || 0) + 1);
  });

  console.log('📊 Breakdown by library:');
  byLibrary.forEach((count, library) => {
    console.log(`   ${library}: ${count} posts`);
  });
  console.log('');

  // Show details
  console.log('Posts to recreate:\n');
  missing.forEach((record, index) => {
    console.log(`${index + 1}. "${record.title || 'Untitled'}"`);
    console.log(`   📍 Library: ${record.libraryType || 'unclassified'}`);
    console.log(`   🔗 URL: ${record.url}`);
    console.log(`   📅 Originally created: ${record.createdAt.toISOString()}`);
    console.log(`   🆔 Old thread ID: ${record.forumThreadId}`);
    console.log('');
  });

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No posts will be created\n');
    return;
  }

  console.log('🚨 Proceeding with post recreation...\n');

  let createdCount = 0;
  let errorCount = 0;

  for (const record of missing) {
    try {
      const forumId = getForumIdForLibraryType(record.libraryType);

      if (!forumId) {
        console.log(
          `⚠️  No forum ID for library type: ${record.libraryType} - skipping "${record.title}"`
        );
        errorCount++;
        continue;
      }

      const forumChannel = await client.channels.fetch(forumId);

      if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        console.log(`⚠️  Forum channel not found or invalid: ${forumId}`);
        errorCount++;
        continue;
      }

      const forumChannelTyped = forumChannel as ForumChannel;
      const availableTags = forumChannelTyped.availableTags;

      // Create forum post content
      const title = record.title || `Recommendation: ${record.url}`;

      // Build tags array using library-specific tags (limit 5 tags per Discord)
      const appliedTags: string[] = [];

      // Add primary tag first
      if (record.primaryTag) {
        const primaryTagMatch = findMatchingTag(
          record.primaryTag,
          record.libraryType as LibraryType,
          availableTags,
          appliedTags
        );
        if (primaryTagMatch) {
          appliedTags.push(primaryTagMatch.id);
        }
      }

      // Add secondary tags
      if (record.secondaryTags) {
        for (const secondaryTag of record.secondaryTags) {
          if (appliedTags.length >= 5) break; // Discord limit

          const tagMatch = findMatchingTag(
            secondaryTag,
            record.libraryType as LibraryType,
            availableTags,
            appliedTags
          );
          if (tagMatch && !appliedTags.includes(tagMatch.id)) {
            appliedTags.push(tagMatch.id);
          }
        }
      }

      // Build message content
      let messageContent = `🔗 **URL:** ${record.url}\n\n`;

      if (record.aiSummary) {
        messageContent += `📝 **Summary:**\n${record.aiSummary}\n\n`;
      } else if (record.description) {
        messageContent += `📝 **Description:**\n${record.description}\n\n`;
      }

      if (record.secondaryTags && record.secondaryTags.length > 0) {
        messageContent += `🏷️ **Tags:** ${record.secondaryTags.join(', ')}\n\n`;
      }

      messageContent += `_Original post date: ${record.createdAt.toISOString()}_`;

      // Create the thread
      const thread = await forumChannelTyped.threads.create({
        name: title.substring(0, 100), // Discord has a 100 char limit
        message: { content: messageContent },
        appliedTags: appliedTags.length > 0 ? appliedTags : undefined,
      });

      console.log(`✅ Created: "${title}" (${thread.id})`);
      console.log(`   Old ID: ${record.forumThreadId} → New ID: ${thread.id}`);

      // Update database with new thread ID
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.VPS_DATABASE_URL,
          },
        },
      });

      await prisma.recommendation.update({
        where: { id: record.id },
        data: {
          forumThreadId: thread.id,
          forumPostId: thread.id, // The first message in a thread has the same ID
        },
      });

      await prisma.$disconnect();

      createdCount++;

      // Rate limiting: wait 2 seconds between creations
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Error recreating post for "${record.title}":`, error.message);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Recreation Summary:');
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Successfully created: ${createdCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${missing.length}`);
}

async function main() {
  console.log('========================================');
  console.log('Validate & Recreate Discord Posts');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  if (!process.env.VPS_DATABASE_URL) {
    console.error('❌ VPS_DATABASE_URL environment variable not set!');
    console.error('   Set it like: export VPS_DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  // Initialize Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  try {
    console.log('🔐 Logging into Discord...');
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('✅ Discord client logged in\n');

    // Get database records
    const records = await getDatabaseRecords();

    // Validate which posts exist
    const { existing, missing } = await validateDiscordPosts(client, records);

    // Recreate missing posts
    await recreateMissingPosts(client, missing);

    await client.destroy();

    console.log('\n✅ Script completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await client.destroy();
    process.exit(1);
  }
}

main();

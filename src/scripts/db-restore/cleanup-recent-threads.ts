#!/usr/bin/env bun

/**
 * Recent Thread Cleanup Script
 *
 * Deletes all threads created in the last 48 hours from the library forum channels
 * (Fiction Vault, Athenaeum, Growth Lab).
 *
 * Usage:
 *   bun src/scripts/db-restore/cleanup-recent-threads.ts --dry-run
 *   bun src/scripts/db-restore/cleanup-recent-threads.ts
 */

import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

const isDryRun = process.argv.includes('--dry-run');
const HOURS_AGO = 48;

interface ThreadInfo {
  id: string;
  name: string;
  createdAt: Date;
  forumName: string;
  ageHours: number;
}

async function getRecentThreads(client: Client): Promise<ThreadInfo[]> {
  console.log(`📖 Scanning Discord forums for threads created in last ${HOURS_AGO} hours...\n`);

  const forumIds = [
    { id: process.env.FICTION_VAULT_FORUM_ID, name: 'Fiction Vault' },
    { id: process.env.ATHENAEUM_FORUM_ID, name: 'Athenaeum' },
    { id: process.env.GROWTH_LAB_FORUM_ID, name: 'Growth Lab' },
  ];

  const cutoffTime = new Date(Date.now() - HOURS_AGO * 60 * 60 * 1000);
  console.log(`⏰ Cutoff time: ${cutoffTime.toISOString()}`);
  console.log(`   (Deleting threads created after this time)\n`);

  const recentThreads: ThreadInfo[] = [];

  for (const forum of forumIds) {
    if (!forum.id) {
      console.log(`⚠️  Skipping ${forum.name} - ID not configured`);
      continue;
    }

    try {
      console.log(`📂 Scanning ${forum.name} (${forum.id})...`);

      const channel = await client.channels.fetch(forum.id);

      if (!channel || channel.type !== ChannelType.GuildForum) {
        console.log(`⚠️  ${forum.name} is not a forum channel`);
        continue;
      }

      // Fetch all active threads
      const activeThreads = await channel.threads.fetchActive();

      // Fetch all archived threads
      const archivedThreads = await channel.threads.fetchArchived({ limit: 100 });

      // Combine all threads
      const threads = new Map([...activeThreads.threads, ...archivedThreads.threads]);

      // Filter for recent threads
      threads.forEach((thread) => {
        const createdAt = thread.createdAt || new Date();
        if (createdAt > cutoffTime) {
          const ageMs = Date.now() - createdAt.getTime();
          const ageHours = ageMs / (1000 * 60 * 60);

          recentThreads.push({
            id: thread.id,
            name: thread.name,
            createdAt,
            forumName: forum.name,
            ageHours,
          });
        }
      });

      const forumRecentCount = recentThreads.filter((t) => t.forumName === forum.name).length;
      console.log(`   Found ${forumRecentCount} recent threads\n`);
    } catch (error: any) {
      console.error(`❌ Error scanning ${forum.name}:`, error.message);
    }
  }

  return recentThreads;
}

async function deleteRecentThreads(client: Client, threads: ThreadInfo[]): Promise<void> {
  if (threads.length === 0) {
    console.log('✅ No recent threads found to delete!\n');
    return;
  }

  // Sort by creation date (newest first)
  threads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  console.log(`${'='.repeat(70)}`);
  console.log(`Found ${threads.length} threads created in last ${HOURS_AGO} hours`);
  console.log(`${'='.repeat(70)}\n`);

  // Group by forum for summary
  const byForum = new Map<string, number>();
  threads.forEach((thread) => {
    byForum.set(thread.forumName, (byForum.get(thread.forumName) || 0) + 1);
  });

  console.log('📊 Breakdown by forum:');
  byForum.forEach((count, forumName) => {
    console.log(`   ${forumName}: ${count} threads`);
  });
  console.log('');

  // Show details
  console.log('Threads to delete:\n');
  threads.forEach((thread, index) => {
    const ageHoursRounded = Math.round(thread.ageHours * 10) / 10;
    console.log(`${index + 1}. "${thread.name}"`);
    console.log(`   📍 Forum: ${thread.forumName}`);
    console.log(`   🕒 Created: ${thread.createdAt.toISOString()} (${ageHoursRounded}h ago)`);
    console.log(`   🆔 Thread ID: ${thread.id}`);
    console.log('');
  });

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No threads will be deleted\n');
    return;
  }

  console.log('🚨 Proceeding with deletion...\n');

  let deletedCount = 0;
  let errorCount = 0;

  for (const thread of threads) {
    try {
      const channel = await client.channels.fetch(thread.id);

      if (!channel) {
        console.log(`⚠️  Thread ${thread.id} not found (may already be deleted)`);
        continue;
      }

      if (channel.isThread()) {
        await channel.delete(
          `Cleanup of threads created in last ${HOURS_AGO} hours - database restoration`
        );
        deletedCount++;
        console.log(`✅ Deleted: "${thread.name}" (${thread.forumName})`);
      } else {
        console.log(`⚠️  Channel ${thread.id} is not a thread`);
      }

      // Rate limiting: wait 1 second between deletions
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Error deleting thread ${thread.id}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Deletion Summary:');
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Successfully deleted: ${deletedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${threads.length}`);
}

async function main() {
  console.log('========================================');
  console.log('Recent Thread Cleanup Script');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  // Initialize Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  try {
    console.log('🔐 Logging into Discord...');
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('✅ Discord client logged in\n');

    // Get recent threads
    const recentThreads = await getRecentThreads(client);

    // Delete recent threads
    await deleteRecentThreads(client, recentThreads);

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

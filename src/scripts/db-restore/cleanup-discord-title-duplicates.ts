#!/usr/bin/env bun

/**
 * Discord Title Duplicate Cleanup Script
 *
 * Scans Discord forum channels directly for duplicate thread titles
 * and deletes the newer threads, keeping only the oldest one.
 *
 * Usage:
 *   bun src/scripts/db-restore/cleanup-discord-title-duplicates.ts --dry-run
 *   bun src/scripts/db-restore/cleanup-discord-title-duplicates.ts
 */

import { Client, GatewayIntentBits, ChannelType, ThreadChannel } from 'discord.js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

const isDryRun = process.argv.includes('--dry-run');

interface ThreadInfo {
  id: string;
  name: string;
  createdAt: Date;
  forumId: string;
  forumName: string;
}

async function getAllForumThreads(client: Client): Promise<ThreadInfo[]> {
  console.log('📖 Scanning Discord forums for all threads...\n');

  const forumIds = [
    { id: process.env.FICTION_VAULT_FORUM_ID, name: 'Fiction Vault' },
    { id: process.env.ATHENAEUM_FORUM_ID, name: 'Athenaeum' },
    { id: process.env.GROWTH_LAB_FORUM_ID, name: 'Growth Lab' },
  ];

  const allThreads: ThreadInfo[] = [];

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

      console.log(`   Found ${threads.size} threads`);

      threads.forEach((thread) => {
        allThreads.push({
          id: thread.id,
          name: thread.name,
          createdAt: thread.createdAt || new Date(),
          forumId: forum.id!,
          forumName: forum.name,
        });
      });
    } catch (error: any) {
      console.error(`❌ Error scanning ${forum.name}:`, error.message);
    }
  }

  console.log(`\n✅ Total threads found across all forums: ${allThreads.length}\n`);
  return allThreads;
}

function findDuplicates(threads: ThreadInfo[]): Map<string, ThreadInfo[]> {
  const titleMap = new Map<string, ThreadInfo[]>();

  // Group threads by title
  threads.forEach((thread) => {
    const existing = titleMap.get(thread.name) || [];
    existing.push(thread);
    titleMap.set(thread.name, existing);
  });

  // Filter to only duplicates (more than 1 thread with same title)
  const duplicates = new Map<string, ThreadInfo[]>();
  titleMap.forEach((threads, title) => {
    if (threads.length > 1) {
      // Sort by creation date (oldest first)
      threads.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      duplicates.set(title, threads);
    }
  });

  return duplicates;
}

async function deleteNewerDuplicates(
  client: Client,
  duplicates: Map<string, ThreadInfo[]>
): Promise<void> {
  if (duplicates.size === 0) {
    console.log('✅ No duplicate titles found!\n');
    return;
  }

  console.log(`${'='.repeat(70)}`);
  console.log(`Found ${duplicates.size} titles with duplicates`);
  console.log(`${'='.repeat(70)}\n`);

  let totalToDelete = 0;
  duplicates.forEach((threads) => {
    totalToDelete += threads.length - 1; // Keep oldest, delete the rest
  });

  console.log(`📊 Summary:`);
  console.log(`   Unique titles with duplicates: ${duplicates.size}`);
  console.log(`   Total threads to delete: ${totalToDelete}\n`);

  // Show details
  let index = 1;
  duplicates.forEach((threads, title) => {
    console.log(`${index}. "${title}" (${threads.length} copies)`);
    console.log(`   📍 Forum: ${threads[0].forumName}`);
    console.log(`   ✅ KEEP: ${threads[0].id} (created ${threads[0].createdAt.toISOString()})`);

    for (let i = 1; i < threads.length; i++) {
      console.log(`   ❌ DELETE: ${threads[i].id} (created ${threads[i].createdAt.toISOString()})`);
    }
    console.log('');
    index++;
  });

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No threads will be deleted\n');
    return;
  }

  console.log('🚨 Proceeding with deletion...\n');

  let deletedCount = 0;
  let errorCount = 0;
  let keptCount = 0;

  for (const [title, threads] of duplicates) {
    // Keep the first (oldest) thread, delete the rest
    keptCount++;

    for (let i = 1; i < threads.length; i++) {
      const thread = threads[i];
      try {
        const channel = await client.channels.fetch(thread.id);

        if (!channel) {
          console.log(`⚠️  Thread ${thread.id} not found (may already be deleted)`);
          continue;
        }

        if (channel.isThread()) {
          await channel.delete(`Duplicate title cleanup - keeping oldest thread`);
          deletedCount++;
          console.log(`✅ Deleted: "${title}" (${thread.id})`);
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
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Deletion Summary:');
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Threads kept (oldest): ${keptCount}`);
  console.log(`✅ Duplicates deleted: ${deletedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${keptCount + deletedCount}`);
}

async function main() {
  console.log('========================================');
  console.log('Discord Title Duplicate Cleanup Script');
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

    // Get all forum threads
    const allThreads = await getAllForumThreads(client);

    // Find duplicates
    console.log('🔍 Analyzing for duplicate titles...\n');
    const duplicates = findDuplicates(allThreads);

    // Delete newer duplicates
    await deleteNewerDuplicates(client, duplicates);

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

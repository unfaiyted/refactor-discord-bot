/**
 * Deduplication script for recommendations
 * Finds and removes duplicate URLs, keeping the oldest entry
 */

import { prisma } from '@services/database/client.js';
import { logger } from '@utils/logger.js';

interface DuplicateGroup {
  url: string;
  count: number;
  ids: string[];
  titles: (string | null)[];
  createdAts: Date[];
}

async function findDuplicates(): Promise<DuplicateGroup[]> {
  logger.info('Searching for duplicate URLs...');

  // Get all recommendations grouped by URL
  const allRecs = await prisma.recommendation.findMany({
    select: {
      id: true,
      url: true,
      title: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by URL
  const urlMap = new Map<string, DuplicateGroup>();

  for (const rec of allRecs) {
    const existing = urlMap.get(rec.url);
    if (existing) {
      existing.count++;
      existing.ids.push(rec.id);
      existing.titles.push(rec.title);
      existing.createdAts.push(rec.createdAt);
    } else {
      urlMap.set(rec.url, {
        url: rec.url,
        count: 1,
        ids: [rec.id],
        titles: [rec.title],
        createdAts: [rec.createdAt],
      });
    }
  }

  // Filter to only duplicates
  const duplicates = Array.from(urlMap.values()).filter((group) => group.count > 1);

  return duplicates;
}

async function deduplicateRecommendations(dryRun: boolean = false) {
  logger.info('Starting deduplication', { dryRun });

  if (dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('='.repeat(80) + '\n');
  }

  const duplicates = await findDuplicates();

  if (duplicates.length === 0) {
    logger.info('No duplicates found!');
    console.log('\n✨ No duplicates found - database is clean!\n');
    return {
      totalDuplicateGroups: 0,
      totalRecordsToDelete: 0,
      totalRecordsToKeep: 0,
    };
  }

  logger.info(`Found ${duplicates.length} duplicate URL groups`);

  let totalToDelete = 0;
  let totalToKeep = duplicates.length;

  console.log(`\n📊 Found ${duplicates.length} URLs with duplicates:\n`);

  for (const group of duplicates) {
    const keepId = group.ids[0]; // Keep the oldest (first in array)
    const deleteIds = group.ids.slice(1); // Delete the rest
    const keepTitle = group.titles[0] || 'Untitled';

    totalToDelete += deleteIds.length;

    console.log(`🔗 ${group.url.substring(0, 80)}${group.url.length > 80 ? '...' : ''}`);
    console.log(`   Title: ${keepTitle}`);
    console.log(`   Duplicates: ${group.count} total`);
    console.log(`   ✅ Keeping: ${keepId} (created ${group.createdAts[0].toISOString()})`);
    console.log(`   ❌ Deleting: ${deleteIds.length} duplicate(s)`);

    if (!dryRun) {
      // Delete duplicates
      await prisma.recommendation.deleteMany({
        where: {
          id: { in: deleteIds },
        },
      });
      logger.info('Deleted duplicates', { url: group.url, deletedCount: deleteIds.length });
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total duplicate groups: ${duplicates.length}`);
  console.log(`Records to keep: ${totalToKeep}`);
  console.log(`Records to delete: ${totalToDelete}`);
  console.log('='.repeat(80) + '\n');

  if (dryRun) {
    console.log('To apply these changes, run without --dry-run flag:\n');
    console.log('  bun src/scripts/deduplicate.ts\n');
  } else {
    console.log(`✅ Successfully deduplicated! Removed ${totalToDelete} duplicate records.\n`);
  }

  return {
    totalDuplicateGroups: duplicates.length,
    totalRecordsToDelete: totalToDelete,
    totalRecordsToKeep: totalToKeep,
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run deduplication
deduplicateRecommendations(dryRun)
  .then((stats) => {
    logger.info('Deduplication complete', stats);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Deduplication failed', error);
    process.exit(1);
  });

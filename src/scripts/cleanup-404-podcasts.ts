/**
 * Cleanup script to remove 404 PocketCasts episodes from the database
 * These episodes no longer exist and return 404 errors
 */

import { prisma } from '@services/database/client.js';
import { contentExtractor } from '@services/content/content-extractor.js';
import { ContentExtractionError } from '@services/content/types.js';
import { logger } from '@utils/logger.js';

interface CleanupStats {
  total: number;
  deleted: number;
  errors: number;
  deletedUrls: string[];
}

async function cleanup404Podcasts(dryRun: boolean = false) {
  logger.info('Starting 404 podcast cleanup', { dryRun });

  if (dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('='.repeat(80) + '\n');
  }

  const stats: CleanupStats = {
    total: 0,
    deleted: 0,
    errors: 0,
    deletedUrls: [],
  };

  // Find all PocketCasts recommendations
  const podcasts = await prisma.recommendation.findMany({
    where: {
      url: {
        startsWith: 'https://pca.st/episode/',
      },
    },
    select: {
      id: true,
      url: true,
      title: true,
    },
  });

  stats.total = podcasts.length;

  if (stats.total === 0) {
    console.log('\n✨ No PocketCasts episodes found!\n');
    return stats;
  }

  logger.info(`Found ${stats.total} PocketCasts episodes to check`);
  console.log(`\n📊 Found ${stats.total} PocketCasts episodes to check\n`);

  for (const podcast of podcasts) {
    try {
      logger.info(`Checking ${stats.deleted + stats.errors + 1}/${stats.total}`, {
        id: podcast.id,
        url: podcast.url,
      });

      console.log(
        `[${stats.deleted + stats.errors + 1}/${stats.total}] ${podcast.title || 'Untitled'}`
      );
      console.log(`  URL: ${podcast.url}`);

      // Try to extract content - if it fails with 404, mark for deletion
      try {
        await contentExtractor.extract(podcast.url);
        console.log(`  ✅ Podcast still exists`);
      } catch (extractionError) {
        if (extractionError instanceof ContentExtractionError) {
          // Content extraction failed - likely 404
          console.log(`  ❌ Podcast returns 404 - marking for deletion`);

          if (!dryRun) {
            await prisma.recommendation.delete({
              where: { id: podcast.id },
            });
            logger.info('Deleted 404 podcast', { id: podcast.id, url: podcast.url });
          }

          stats.deleted++;
          stats.deletedUrls.push(podcast.url);
        } else {
          throw extractionError;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ⚠️ Error checking podcast: ${errorMsg}`);

      stats.errors++;

      logger.error('Failed to check podcast', {
        id: podcast.id,
        url: podcast.url,
        error,
      });
    }

    console.log('');
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total PocketCasts episodes checked: ${stats.total}`);
  console.log(`404 episodes deleted: ${stats.deleted}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('='.repeat(80) + '\n');

  if (stats.deletedUrls.length > 0) {
    console.log('🗑️  Deleted URLs:');
    stats.deletedUrls.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log('');
  }

  if (dryRun) {
    console.log('To apply these changes, run without --dry-run flag:\n');
    console.log('  bun src/scripts/cleanup-404-podcasts.ts\n');
  } else {
    console.log(`✅ Removed ${stats.deleted} 404 podcast episodes!\n`);
  }

  return stats;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run cleanup
cleanup404Podcasts(dryRun)
  .then((stats) => {
    logger.info('404 podcast cleanup complete', stats);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('404 podcast cleanup failed', error);
    process.exit(1);
  });

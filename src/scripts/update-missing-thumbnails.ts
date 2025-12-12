/**
 * Update missing thumbnails for existing recommendations
 * Re-extracts content for recommendations that don't have thumbnails
 */

import { prisma } from '@services/database/client.js';
import { contentExtractor } from '@services/content/content-extractor.js';
import { ContentExtractionError } from '@services/content/types.js';
import { logger } from '@utils/logger.js';

interface UpdateStats {
  total: number;
  updated: number;
  failed: number;
  skipped: number;
  failedUrls: Array<{ url: string; error: string }>;
}

async function updateMissingThumbnails(dryRun: boolean = false) {
  logger.info('Starting thumbnail update', { dryRun });

  if (dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('='.repeat(80) + '\n');
  }

  const stats: UpdateStats = {
    total: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    failedUrls: [],
  };

  // Find all recommendations without thumbnails
  const recommendations = await prisma.recommendation.findMany({
    where: {
      thumbnail: null,
    },
    select: {
      id: true,
      url: true,
      title: true,
      contentType: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  stats.total = recommendations.length;

  if (stats.total === 0) {
    console.log('\n✨ No recommendations missing thumbnails!\n');
    return stats;
  }

  logger.info(`Found ${stats.total} recommendations missing thumbnails`);
  console.log(`\n📊 Found ${stats.total} recommendations without thumbnails\n`);

  for (const rec of recommendations) {
    try {
      logger.info(`Processing ${stats.updated + stats.failed + stats.skipped + 1}/${stats.total}`, {
        id: rec.id,
        url: rec.url,
      });

      console.log(
        `[${stats.updated + stats.failed + stats.skipped + 1}/${stats.total}] ${rec.title || 'Untitled'}`
      );
      console.log(`  URL: ${rec.url.substring(0, 80)}${rec.url.length > 80 ? '...' : ''}`);

      // Try to extract content
      try {
        const extractedContent = await contentExtractor.extract(rec.url);

        if (extractedContent.metadata?.thumbnail) {
          console.log(
            `  ✅ Found thumbnail: ${extractedContent.metadata.thumbnail.substring(0, 60)}...`
          );

          if (!dryRun) {
            // Update only the thumbnail
            await prisma.recommendation.update({
              where: { id: rec.id },
              data: {
                thumbnail: extractedContent.metadata.thumbnail,
              },
            });
            logger.info('Updated thumbnail', { id: rec.id, url: rec.url });
          }

          stats.updated++;
        } else {
          console.log(`  ⏭️  No thumbnail available for this content type`);
          stats.skipped++;
        }
      } catch (extractionError) {
        if (extractionError instanceof ContentExtractionError) {
          console.log(`  ⚠️  Content extraction failed: ${extractionError.message}`);
          stats.skipped++;
        } else {
          throw extractionError;
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${errorMsg}`);

      stats.failed++;
      stats.failedUrls.push({
        url: rec.url,
        error: errorMsg,
      });

      logger.error('Failed to update thumbnail', {
        id: rec.id,
        url: rec.url,
        error,
      });
    }

    console.log('');
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total missing thumbnails: ${stats.total}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (no thumbnail available): ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  console.log('='.repeat(80) + '\n');

  if (stats.failedUrls.length > 0) {
    console.log('❌ Failed URLs:');
    stats.failedUrls.forEach((fail, index) => {
      console.log(`  ${index + 1}. ${fail.url}`);
      console.log(`     Error: ${fail.error}`);
    });
    console.log('');
  }

  if (dryRun) {
    console.log('To apply these changes, run without --dry-run flag:\n');
    console.log('  bun src/scripts/update-missing-thumbnails.ts\n');
  } else {
    console.log(`✅ Updated ${stats.updated} thumbnails!\n`);
  }

  return stats;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run update
updateMissingThumbnails(dryRun)
  .then((stats) => {
    logger.info('Thumbnail update complete', stats);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Thumbnail update failed', error);
    process.exit(1);
  });

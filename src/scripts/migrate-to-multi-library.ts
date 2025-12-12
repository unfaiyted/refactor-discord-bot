/**
 * Migration script to re-classify existing recommendations into the multi-library system
 *
 * This script:
 * 1. Fetches all existing recommendations from the database
 * 2. Re-analyzes each recommendation with Claude AI for library classification
 * 3. Updates database with new library type and specialized tags
 * 4. Creates new forum posts in appropriate library forums
 * 5. Tracks progress and errors
 *
 * Usage:
 *   bun src/scripts/migrate-to-multi-library.ts [--dry-run] [--limit=N]
 *
 * Options:
 *   --dry-run: Preview classification without making changes
 *   --limit=N: Only process first N recommendations (for testing)
 */

import { prisma } from '@services/database/client.js';
import { analyzeRecommendation, analyzeExtractedContent } from '@services/claude/client.js';
import { contentExtractor } from '@services/content/content-extractor.js';
import { ContentExtractionError } from '@services/content/types.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { createForumPost } from '@features/recommendations/services/forum-poster.js';
import { LIBRARY_TAGS } from '@features/recommendations/config/library-tags.js';

interface MigrationStats {
  total: number;
  processed: number;
  fiction: number;
  athenaeum: number;
  growth: number;
  errors: number;
  errorDetails: Array<{ id: string; url: string; error: string }>;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; limit?: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  return { dryRun, limit };
}

/**
 * Main migration function
 */
async function migrateToMultiLibrary() {
  const { dryRun, limit } = parseArgs();

  logger.info('Starting multi-library migration', { dryRun, limit });

  if (dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('='.repeat(80) + '\n');
  }

  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    fiction: 0,
    athenaeum: 0,
    growth: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    // Fetch all existing recommendations
    const recommendations = await prisma.recommendation.findMany({
      where: {
        // Only migrate recommendations that haven't been migrated yet
        libraryType: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    stats.total = recommendations.length;
    logger.info(`Found ${stats.total} recommendations to migrate`);

    if (stats.total === 0) {
      logger.info('No recommendations to migrate - all already have library classification');
      return stats;
    }

    // Create Discord client for forum posting (only if not dry run)
    let client: Client | null = null;
    if (!dryRun) {
      client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
      });

      await client.login(env.discord.token);
      logger.info('Discord client logged in');
    }

    // Process each recommendation
    for (const rec of recommendations) {
      try {
        logger.info(`Processing recommendation ${stats.processed + 1}/${stats.total}`, {
          id: rec.id,
          url: rec.url,
          title: rec.title,
        });

        // Re-analyze with Claude AI to get library classification
        let metadata;

        try {
          // Try content extraction first
          const extractedContent = await contentExtractor.extract(rec.url);
          metadata = await analyzeExtractedContent(
            extractedContent,
            rec.originalContent,
            rec.recommenderName
          );
          logger.debug('Used extracted content for analysis', { url: rec.url });
        } catch (extractionError) {
          // Fallback to URL-only analysis
          if (extractionError instanceof ContentExtractionError) {
            logger.debug('Content extraction failed, using URL-only analysis', {
              url: rec.url,
            });
            metadata = await analyzeRecommendation(
              rec.url,
              rec.originalContent,
              rec.recommenderName
            );
          } else {
            throw extractionError;
          }
        }

        const libraryType = metadata.libraryType;
        const primaryTag = metadata.primaryTag;
        const secondaryTags = metadata.secondaryTags;

        // Update stats
        stats[libraryType]++;

        if (dryRun) {
          // Dry run - just log what would be done
          const libraryConfig = LIBRARY_TAGS[libraryType];
          console.log(
            `\n[${stats.processed + 1}/${stats.total}] ${rec.title}\n` +
              `  URL: ${rec.url}\n` +
              `  Library: ${libraryType.toUpperCase()} - ${libraryConfig.description}\n` +
              `  Primary Tag: ${primaryTag}\n` +
              `  Secondary Tags: ${secondaryTags.join(', ')}\n` +
              `  Old Topics: ${rec.topics?.join(', ') || 'none'}`
          );
        } else {
          // Update database with new classification
          await prisma.recommendation.update({
            where: { id: rec.id },
            data: {
              libraryType,
              primaryTag,
              secondaryTags,
              // Also update other metadata if it's better
              title: metadata.title,
              description: metadata.description,
              aiSummary: metadata.summary,
            },
          });

          // Create forum post in new library
          if (client) {
            try {
              // Construct original message URL
              const originalMessageUrl = `https://discord.com/channels/${rec.originalChannelId}/${rec.originalChannelId}/${rec.originalMessageId}`;

              const { postId, threadId } = await createForumPost(
                client,
                {
                  recommendationId: rec.id,
                  url: rec.url,
                  metadata: {
                    title: metadata.title,
                    description: metadata.description,
                    contentType: rec.contentType!,
                    topics: rec.topics || [],
                    duration: rec.duration,
                    qualityScore: rec.qualityScore || 5,
                    sentiment: rec.sentiment!,
                    aiSummary: metadata.summary,
                    keyTakeaways: metadata.keyTakeaways,
                    mainIdeas: metadata.mainIdeas,
                    tldr: metadata.tldr,
                    thumbnail: rec.thumbnail,
                    libraryType,
                    primaryTag,
                    secondaryTags,
                  },
                },
                originalMessageUrl,
                rec.recommenderId
              );

              // Update recommendation with new forum post info
              await prisma.recommendation.update({
                where: { id: rec.id },
                data: {
                  forumPostId: postId,
                  forumThreadId: threadId,
                },
              });

              logger.info('Created forum post', {
                id: rec.id,
                library: libraryType,
                threadId,
              });
            } catch (forumError) {
              logger.error('Failed to create forum post', {
                id: rec.id,
                error: forumError,
              });
              // Continue even if forum posting fails
            }
          }

          logger.info('Migrated recommendation', {
            id: rec.id,
            library: libraryType,
            tags: [primaryTag, ...secondaryTags],
          });
        }

        stats.processed++;

        // Add a small delay to avoid rate limiting Claude API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        stats.errorDetails.push({
          id: rec.id,
          url: rec.url,
          error: errorMsg,
        });

        logger.error('Failed to migrate recommendation', {
          id: rec.id,
          url: rec.url,
          error,
        });

        // Continue with next recommendation
      }
    }

    // Cleanup
    if (client) {
      await client.destroy();
    }

    return stats;
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  }
}

/**
 * Print migration summary
 */
function printSummary(stats: MigrationStats, dryRun: boolean) {
  console.log('\n' + '='.repeat(80));
  console.log(dryRun ? '📊 DRY RUN SUMMARY' : '✅ MIGRATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\nTotal Recommendations: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`\nLibrary Distribution:`);
  console.log(
    `  📖 Fiction Vault: ${stats.fiction} (${Math.round((stats.fiction / stats.processed) * 100)}%)`
  );
  console.log(
    `  🏛️ Athenaeum: ${stats.athenaeum} (${Math.round((stats.athenaeum / stats.processed) * 100)}%)`
  );
  console.log(
    `  🌱 Growth Lab: ${stats.growth} (${Math.round((stats.growth / stats.processed) * 100)}%)`
  );
  console.log(`\nErrors: ${stats.errors}`);

  if (stats.errorDetails.length > 0) {
    console.log(`\n❌ Failed Migrations:`);
    stats.errorDetails.forEach((detail, index) => {
      console.log(`  ${index + 1}. ${detail.url}`);
      console.log(`     Error: ${detail.error}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  if (dryRun) {
    console.log('To apply these changes, run without --dry-run flag:\n');
    console.log('  bun src/scripts/migrate-to-multi-library.ts\n');
  } else {
    console.log('✨ Migration complete! Your recommendations have been organized into:');
    console.log('  • Fiction Vault - Stories, Art, Imagination, Entertainment');
    console.log('  • Athenaeum - Humanities, Social Sciences, History, Deep Non-Fiction');
    console.log('  • Growth Lab - Career, Tech, Skills, Lifestyle, Productivity\n');
  }
}

/**
 * Run migration
 */
migrateToMultiLibrary()
  .then((stats) => {
    const { dryRun } = parseArgs();
    printSummary(stats, dryRun);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed', error);
    process.exit(1);
  });

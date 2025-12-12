import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '@utils/logger.js';
import { env } from '@config/env.js';
import { recommendationService } from '@services/database/recommendations.js';
import { generateSyntheticMessageId } from './utils/synthetic-id.js';
import { contentExtractor } from '@services/content/content-extractor.js';
import { analyzeExtractedContent, analyzeRecommendation } from '@services/claude/client.js';
import { createForumPost } from '@features/recommendations/services/forum-poster.js';
import type { ProcessedRecommendation } from '@features/recommendations/services/processor.js';

interface BulkImportResult {
  total: number;
  processed: number;
  skippedDuplicates: number;
  failed: number;
  failedUrls: string[];
}

const BULK_IMPORT_FILE = 'data/bulk-import.txt';
const FAILED_URLS_FILE = 'data/failed-imports.txt';
const PROGRESS_INTERVAL = 10;
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between URLs

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Main bulk import function
 */
async function runBulkImport(): Promise<BulkImportResult> {
  const startTime = Date.now();

  logger.info('Starting bulk import', {
    file: BULK_IMPORT_FILE,
    dryRun: DRY_RUN,
  });

  // Read URLs from file
  const urls = await readUrlsFromFile(BULK_IMPORT_FILE);

  if (urls.length === 0) {
    logger.warn('No URLs found in import file', { file: BULK_IMPORT_FILE });
    return { total: 0, processed: 0, skippedDuplicates: 0, failed: 0, failedUrls: [] };
  }

  logger.info(`Found ${urls.length} URLs to import`);

  if (DRY_RUN) {
    logger.info('DRY RUN MODE - No changes will be made');
  }

  // Generate synthetic message IDs for all URLs
  const urlsWithIds = urls.map((url) => ({
    url,
    messageId: generateSyntheticMessageId(url),
  }));

  // Bulk check for duplicates
  const messageIds = urlsWithIds.map((u) => u.messageId);
  const existingMessageIds = await recommendationService.findExistingMessageIds(messageIds);
  const existingUrls = await recommendationService.findExistingUrls(urls);

  // Filter out duplicates
  const toProcess = urlsWithIds.filter(({ url, messageId }) => {
    const isDuplicate = existingMessageIds.has(messageId) || existingUrls.has(url);

    if (isDuplicate) {
      logger.info('Skipping duplicate URL', { url, messageId });
    }

    return !isDuplicate;
  });

  const skippedCount = urls.length - toProcess.length;

  logger.info(`Duplicate check complete`, {
    total: urls.length,
    duplicates: skippedCount,
    toProcess: toProcess.length,
  });

  if (DRY_RUN) {
    logger.info('DRY RUN SUMMARY', {
      total: urls.length,
      wouldProcess: toProcess.length,
      wouldSkip: skippedCount,
    });
    return {
      total: urls.length,
      processed: 0,
      skippedDuplicates: skippedCount,
      failed: 0,
      failedUrls: [],
    };
  }

  // Initialize Discord client for forum posting
  const client = await initializeDiscordClient();

  // Process each URL
  let processed = 0;
  const failed: string[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const { url, messageId } = toProcess[i];

    try {
      logger.info(`Processing URL ${i + 1}/${toProcess.length}`, { url });

      await processUrl(url, messageId, client);
      processed++;

      // Progress reporting
      if ((i + 1) % PROGRESS_INTERVAL === 0) {
        logger.info(
          `Progress: ${i + 1}/${toProcess.length} processed (${processed} successful, ${failed.length} failed)`
        );
      }

      // Rate limiting
      if (i < toProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    } catch (error) {
      logger.error('Failed to process URL', { url, error });
      failed.push(url);
    }
  }

  // Save failed URLs to file if any
  if (failed.length > 0) {
    await saveFailedUrls(failed);
  }

  // Cleanup
  await client.destroy();

  const duration = Date.now() - startTime;

  logger.info('Bulk import completed', {
    total: urls.length,
    processed,
    skippedDuplicates: skippedCount,
    failed: failed.length,
    durationMs: duration,
    durationSeconds: Math.round(duration / 1000),
  });

  return {
    total: urls.length,
    processed,
    skippedDuplicates: skippedCount,
    failed: failed.length,
    failedUrls: failed,
  };
}

/**
 * Read URLs from import file
 */
async function readUrlsFromFile(filePath: string): Promise<string[]> {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`Import file not found: ${filePath}`);
    }

    const content = await readFile(filePath, 'utf-8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')); // Allow comments

    return lines;
  } catch (error) {
    logger.error('Failed to read import file', { filePath, error });
    throw error;
  }
}

/**
 * Process a single URL
 */
async function processUrl(url: string, messageId: string, client: Client): Promise<void> {
  logger.debug('Processing URL', { url, messageId });

  // Create database record
  const recommendation = await recommendationService.create({
    originalMessageId: messageId,
    originalChannelId: env.discord.recommendationsChannelId,
    originalContent: `Bulk import: ${url}`,
    recommenderId: 'bulk-import',
    recommenderName: 'Bulk Import',
    url,
  });

  logger.debug('Created recommendation record', { recommendationId: recommendation.id });

  // Extract content and analyze
  let metadata;
  let thumbnail: string | undefined;

  try {
    // Extract content from URL
    logger.debug('Extracting content from URL', { url });
    const extractedContent = await contentExtractor.extract(url);

    logger.debug('Content extracted successfully', {
      url,
      type: extractedContent.type,
      contentLength: extractedContent.content.length,
      hasThumbnail: !!extractedContent.metadata?.thumbnail,
    });

    thumbnail = extractedContent.metadata?.thumbnail;

    // Analyze with Claude AI
    metadata = await analyzeExtractedContent(extractedContent, `Bulk import: ${url}`, '');
  } catch (error) {
    logger.warn('Content extraction failed, falling back to URL analysis', { url, error });

    // Fallback: analyze just the URL
    metadata = await analyzeRecommendation(url, `Bulk import: ${url}`, '');
  }

  // Update database with metadata
  await recommendationService.updateMetadata(recommendation.id, {
    title: metadata.title,
    description: metadata.description,
    contentType: metadata.contentType,
    topics: metadata.topics,
    duration: metadata.duration || null,
    qualityScore: metadata.qualityScore,
    sentiment: metadata.sentiment,
    aiSummary: metadata.summary,
    thumbnail,
  });

  // Build processed recommendation for forum post
  const processed: ProcessedRecommendation = {
    recommendationId: recommendation.id,
    url,
    metadata: {
      title: metadata.title,
      description: metadata.description,
      contentType: metadata.contentType,
      topics: metadata.topics,
      duration: metadata.duration || null,
      qualityScore: metadata.qualityScore,
      sentiment: metadata.sentiment,
      aiSummary: metadata.summary,
      keyTakeaways: metadata.keyTakeaways,
      mainIdeas: metadata.mainIdeas,
      tldr: metadata.tldr,
      thumbnail,
    },
  };

  // Create forum post
  const { postId, threadId } = await createForumPost(
    client,
    processed,
    `bulk-import://${messageId}`, // Synthetic message URL
    'Bulk Import'
  );

  // Mark as processed
  await recommendationService.markAsProcessed(recommendation.id, postId, threadId);

  logger.info('Successfully imported URL', {
    url,
    recommendationId: recommendation.id,
    forumThreadId: threadId,
  });
}

/**
 * Initialize Discord client
 */
async function initializeDiscordClient(): Promise<Client> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(env.discord.token);

  // Wait for client to be ready
  await new Promise<void>((resolve) => {
    client.once('ready', () => {
      logger.info('Discord client ready');
      resolve();
    });
  });

  return client;
}

/**
 * Save failed URLs to file
 */
async function saveFailedUrls(urls: string[]): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    const content = urls.join('\n') + '\n';
    await writeFile(FAILED_URLS_FILE, content, 'utf-8');

    logger.info('Saved failed URLs', {
      file: FAILED_URLS_FILE,
      count: urls.length,
    });
  } catch (error) {
    logger.error('Failed to save failed URLs', { error });
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const result = await runBulkImport();

    console.log('\n=== BULK IMPORT SUMMARY ===');
    console.log(`Total URLs:          ${result.total}`);
    console.log(`Processed:           ${result.processed}`);
    console.log(`Skipped (duplicate): ${result.skippedDuplicates}`);
    console.log(`Failed:              ${result.failed}`);

    if (result.failed > 0) {
      console.log(`\nFailed URLs saved to: ${FAILED_URLS_FILE}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Bulk import failed', { error });
    console.error('Bulk import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

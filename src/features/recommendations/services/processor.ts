import { analyzeRecommendation, analyzeExtractedContent } from '@services/claude/client.js';
import { recommendationService } from '@services/database/recommendations.js';
import { contentExtractor } from '@services/content/content-extractor.js';
import { ContentExtractionError } from '@services/content/types.js';
import { logger } from '@utils/logger.js';
import { extractURLsWithTypes } from '@utils/url-extractor.js';
import type { Message } from 'discord.js';

export interface ProcessedRecommendation {
  recommendationId: string;
  url: string;
  metadata: {
    title: string;
    description: string;
    contentType: string;
    topics: string[];
    duration: string | null;
    qualityScore: number;
    sentiment: string;
    aiSummary: string;
    keyTakeaways?: string[];
    mainIdeas?: string[];
    tldr?: string;
    thumbnail?: string;
  };
}

/**
 * Process a recommendation message
 * 1. Extract URLs
 * 2. Create database record
 * 3. Analyze with Claude AI
 * 4. Update database with metadata
 */
export async function processRecommendation(
  message: Message
): Promise<ProcessedRecommendation | null> {
  const startTime = Date.now();

  try {
    // Extract URLs from message
    const extractedURLs = extractURLsWithTypes(message.content);

    if (extractedURLs.length === 0) {
      logger.debug('No URLs found in message', { messageId: message.id });
      return null;
    }

    // Use the first URL (most recommendations will have one primary link)
    const primaryURL = extractedURLs[0];

    logger.info('Processing recommendation', {
      url: primaryURL.url,
      type: primaryURL.type,
      author: message.author.tag,
    });

    // Check if already processed
    const existing = await recommendationService.findByMessageId(message.id);
    if (existing) {
      logger.debug('Recommendation already processed', { messageId: message.id });
      return null;
    }

    // Create database record
    const recommendation = await recommendationService.create({
      originalMessageId: message.id,
      originalChannelId: message.channelId,
      originalContent: message.content,
      recommenderId: message.author.id,
      recommenderName: message.author.tag,
      url: primaryURL.url,
    });

    logger.debug('Created recommendation record', { recommendationId: recommendation.id });

    // Extract content from URL and analyze with Claude AI
    try {
      let metadata;
      let thumbnail: string | undefined;

      // Try to extract content first
      try {
        logger.info('Extracting content from URL', { url: primaryURL.url });
        const extractedContent = await contentExtractor.extract(primaryURL.url);

        logger.info('Content extracted successfully', {
          url: primaryURL.url,
          type: extractedContent.type,
          contentLength: extractedContent.content.length,
          hasThumbnail: !!extractedContent.metadata?.thumbnail,
        });

        // Save thumbnail from extracted content
        thumbnail = extractedContent.metadata?.thumbnail;

        // Analyze with full content
        metadata = await analyzeExtractedContent(
          extractedContent,
          message.content,
          message.author.tag
        );
      } catch (extractionError) {
        // Fallback to URL-only analysis if extraction fails
        if (extractionError instanceof ContentExtractionError) {
          logger.warn('Content extraction failed, using URL-only analysis', {
            url: primaryURL.url,
            error: extractionError.message,
          });

          metadata = await analyzeRecommendation(
            primaryURL.url,
            message.content,
            message.author.tag
          );
        } else {
          throw extractionError;
        }
      }

      // Update database with AI-extracted metadata
      await recommendationService.updateMetadata(recommendation.id, {
        title: metadata.title,
        description: metadata.description,
        contentType: metadata.contentType,
        topics: metadata.topics,
        duration: metadata.duration,
        qualityScore: metadata.qualityScore,
        sentiment: metadata.sentiment,
        aiSummary: metadata.summary,
        thumbnail, // Add thumbnail from extracted content
      });

      const processingTime = Date.now() - startTime;
      logger.info('Successfully processed recommendation', {
        recommendationId: recommendation.id,
        processingTime: `${processingTime}ms`,
        hasEnhancedData: !!(metadata.keyTakeaways && metadata.mainIdeas),
      });

      return {
        recommendationId: recommendation.id,
        url: primaryURL.url,
        metadata: {
          title: metadata.title,
          description: metadata.description,
          contentType: metadata.contentType,
          topics: metadata.topics,
          duration: metadata.duration,
          qualityScore: metadata.qualityScore,
          sentiment: metadata.sentiment,
          aiSummary: metadata.summary,
          keyTakeaways: metadata.keyTakeaways,
          mainIdeas: metadata.mainIdeas,
          tldr: metadata.tldr,
          thumbnail, // Include thumbnail in returned metadata
        },
      };
    } catch (error) {
      // Record error in database
      await recommendationService.recordError(
        recommendation.id,
        error instanceof Error ? error.message : 'Unknown error'
      );

      logger.error('Failed to analyze recommendation', {
        recommendationId: recommendation.id,
        error,
      });

      throw error;
    }
  } catch (error) {
    logger.error('Failed to process recommendation', error);
    return null;
  }
}

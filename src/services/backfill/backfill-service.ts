import type { Client, Message, TextChannel, Collection } from 'discord.js';
import { logger } from '@utils/logger.js';
import { env } from '@config/env.js';
import { recommendationService } from '@services/database/recommendations.js';
import { extractURLsWithTypes } from '@utils/url-extractor.js';
import { processRecommendation } from '@features/recommendations/services/processor.js';
import { createForumPost } from '@features/recommendations/services/forum-poster.js';

export interface BackfillResult {
  checked: number;
  processed: number;
  skipped: number;
  errors: number;
  limitReached: boolean;
}

/**
 * Backfill missed recommendations on bot startup
 * Fetches messages from the recommendations channel that were posted
 * since the last processed recommendation
 */
export async function backfillMissedRecommendations(client: Client): Promise<BackfillResult> {
  const startTime = Date.now();

  logger.info('Starting recommendation backfill...');

  try {
    // Get the recommendations channel
    const channel = await client.channels.fetch(env.discord.recommendationsChannelId);

    if (!channel || !channel.isTextBased()) {
      logger.error('Recommendations channel not found or not a text channel');
      return { checked: 0, processed: 0, skipped: 0, errors: 0, limitReached: false };
    }

    // Get the last processed timestamp from database
    const lastProcessedAt = await recommendationService.getLastProcessedTimestamp();

    if (lastProcessedAt) {
      logger.info('Backfilling from last processed timestamp', {
        lastProcessedAt: lastProcessedAt.toISOString(),
      });
    } else {
      logger.info('No previous recommendations found, will check last 100 messages');
    }

    // Fetch messages after the last processed timestamp (max 100)
    const messages = await fetchChannelMessagesAfter(
      channel as TextChannel,
      lastProcessedAt,
      100 // Safety limit
    );

    if (messages.length === 0) {
      const duration = Date.now() - startTime;
      logger.info('Backfill completed: No new messages found', {
        durationMs: duration,
      });
      return { checked: 0, processed: 0, skipped: 0, errors: 0, limitReached: false };
    }

    logger.info(`Found ${messages.length} messages to check for recommendations`);

    // Filter messages with URLs
    const messagesWithUrls = messages.filter((msg) => {
      const urls = extractURLsWithTypes(msg.content);
      return urls.length > 0 && !msg.author.bot;
    });

    logger.info(`${messagesWithUrls.length} messages contain URLs`);

    if (messagesWithUrls.length === 0) {
      const duration = Date.now() - startTime;
      logger.info('Backfill completed: No messages with URLs found', {
        checked: messages.length,
        durationMs: duration,
      });
      return {
        checked: messages.length,
        processed: 0,
        skipped: messages.length,
        errors: 0,
        limitReached: messages.length >= 100,
      };
    }

    // Bulk check which messages already exist in database
    const messageIds = messagesWithUrls.map((m) => m.id);
    const existingIds = await recommendationService.findExistingMessageIds(messageIds);

    // Filter out already processed messages
    const unprocessedMessages = messagesWithUrls.filter((msg) => !existingIds.has(msg.id));

    logger.info(`${unprocessedMessages.length} unprocessed recommendations to backfill`, {
      total: messagesWithUrls.length,
      alreadyProcessed: existingIds.size,
      toProcess: unprocessedMessages.length,
    });

    if (unprocessedMessages.length === 0) {
      const duration = Date.now() - startTime;
      logger.info('Backfill completed: All messages already processed', {
        checked: messages.length,
        durationMs: duration,
      });
      return {
        checked: messages.length,
        processed: 0,
        skipped: messages.length,
        errors: 0,
        limitReached: messages.length >= 100,
      };
    }

    // Process each unprocessed message
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < unprocessedMessages.length; i++) {
      const message = unprocessedMessages[i];

      try {
        await processHistoricalMessage(message, client);
        processed++;

        // Log progress every 10 messages
        if ((i + 1) % 10 === 0) {
          logger.info(`Backfill progress: ${i + 1}/${unprocessedMessages.length} processed`);
        }
      } catch (error) {
        logger.error('Error processing historical message', {
          messageId: message.id,
          error,
        });
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Backfill completed successfully', {
      checked: messages.length,
      processed,
      skipped: messages.length - unprocessedMessages.length,
      errors,
      limitReached: messages.length >= 100,
      durationMs: duration,
      durationSeconds: Math.round(duration / 1000),
    });

    return {
      checked: messages.length,
      processed,
      skipped: messages.length - unprocessedMessages.length,
      errors,
      limitReached: messages.length >= 100,
    };
  } catch (error) {
    logger.error('Backfill failed', { error });
    throw error;
  }
}

/**
 * Fetch messages from a channel after a specific date
 * Handles pagination and rate limiting
 */
async function fetchChannelMessagesAfter(
  channel: TextChannel,
  afterDate: Date | null,
  maxMessages: number
): Promise<Message[]> {
  const allMessages: Message[] = [];
  let lastMessageId: string | undefined;

  logger.debug('Fetching messages from channel', {
    channelId: channel.id,
    afterDate: afterDate?.toISOString() || 'none',
    maxMessages,
  });

  while (allMessages.length < maxMessages) {
    const remainingSlots = maxMessages - allMessages.length;
    const fetchLimit = Math.min(100, remainingSlots);

    try {
      const options: { limit: number; before?: string } = { limit: fetchLimit };

      // Fetch messages before the last message ID (going backwards in time)
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const messageBatch = await channel.messages.fetch(options);

      if (messageBatch.size === 0) {
        logger.debug('No more messages to fetch');
        break;
      }

      // Filter by date if provided
      const filteredBatch = afterDate
        ? messageBatch.filter((m: Message) => m.createdAt > afterDate)
        : messageBatch;

      if (filteredBatch.size > 0) {
        allMessages.push(...filteredBatch.values());
      }

      // If we got fewer messages than requested, we've reached the end
      if (messageBatch.size < fetchLimit) {
        logger.debug('Reached end of channel history');
        break;
      }

      // If afterDate is set and we found messages older than it, stop
      if (afterDate) {
        const oldestInBatch = messageBatch.last();
        if (oldestInBatch && oldestInBatch.createdAt <= afterDate) {
          logger.debug('Reached afterDate threshold, stopping pagination');
          break;
        }
      }

      // Update lastMessageId for next iteration
      lastMessageId = messageBatch.last()!.id;

      // Rate limit protection: wait 1 second between batches
      if (allMessages.length < maxMessages && messageBatch.size === fetchLimit) {
        logger.debug('Waiting 1s before next batch (rate limit protection)');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error('Error fetching message batch', { error });
      break;
    }
  }

  // Return in chronological order (oldest first)
  const sorted = allMessages.reverse();

  logger.debug('Fetched messages', {
    count: sorted.length,
    oldestId: sorted[0]?.id,
    newestId: sorted[sorted.length - 1]?.id,
  });

  return sorted;
}

/**
 * Process a single historical message (without reactions)
 * Reuses the same processing logic as real-time messages
 */
async function processHistoricalMessage(message: Message, client: Client): Promise<void> {
  logger.debug('Processing historical message', {
    messageId: message.id,
    author: message.author.tag,
    createdAt: message.createdAt.toISOString(),
  });

  try {
    // Step 1: Process the recommendation (extract URL, analyze with Claude)
    const processed = await processRecommendation(message);

    if (!processed) {
      logger.debug('Historical message did not contain processable recommendation', {
        messageId: message.id,
      });
      return;
    }

    // Step 2: Create forum post
    const { postId, threadId } = await createForumPost(
      client,
      processed,
      message.url,
      message.author.tag
    );

    // Step 3: Update database with forum post info
    await recommendationService.markAsProcessed(processed.recommendationId, postId, threadId);

    logger.info('Successfully backfilled recommendation', {
      messageId: message.id,
      recommendationId: processed.recommendationId,
      forumThreadId: threadId,
    });
  } catch (error) {
    logger.error('Failed to process historical message', {
      messageId: message.id,
      error,
    });
    throw error;
  }
}

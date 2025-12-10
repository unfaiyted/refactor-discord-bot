import type { Message } from 'discord.js';
import { logger } from '@utils/logger.js';
import { processRecommendation } from '../services/processor.js';
import { createForumPost } from '../services/forum-poster.js';
import { recommendationService } from '@services/database/recommendations.js';

/**
 * Handle a new recommendation message
 * This is the main entry point for processing recommendations
 */
export async function handleRecommendationMessage(message: Message): Promise<void> {
  try {
    logger.info('Handling recommendation message', {
      messageId: message.id,
      author: message.author.tag,
    });

    // Add a reaction to show we're processing
    await message.react('👀').catch(() => {
      logger.debug('Could not add processing reaction');
    });

    // Step 1: Process the recommendation (extract URL, analyze with Claude)
    const processed = await processRecommendation(message);

    if (!processed) {
      logger.debug('Message did not contain processable recommendation');
      await message.reactions.removeAll().catch(() => {});
      return;
    }

    // Step 2: Create forum post
    const { postId, threadId } = await createForumPost(
      message.client,
      processed,
      message.url,
      message.author.tag
    );

    // Step 3: Update database with forum post info
    await recommendationService.markAsProcessed(processed.recommendationId, postId, threadId);

    // Step 4: Add success reaction and remove processing reaction
    await message.reactions.removeAll().catch(() => {});
    await message.react('✅').catch(() => {
      logger.debug('Could not add success reaction');
    });

    logger.info('Successfully processed and posted recommendation', {
      recommendationId: processed.recommendationId,
      forumThreadId: threadId,
    });
  } catch (error) {
    logger.error('Error handling recommendation message', {
      messageId: message.id,
      error,
    });

    // Add error reaction
    await message.reactions.removeAll().catch(() => {});
    await message.react('❌').catch(() => {
      logger.debug('Could not add error reaction');
    });

    // Optionally, send a follow-up message explaining the error
    try {
      await message.reply({
        content:
          '⚠️ Sorry, I encountered an error processing this recommendation. Please check the URL and try again.',
        allowedMentions: { repliedUser: false },
      });
    } catch (replyError) {
      logger.debug('Could not send error reply', replyError);
    }
  }
}

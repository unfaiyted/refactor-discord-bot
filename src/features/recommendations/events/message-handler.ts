import type { Message } from 'discord.js';
import { logger } from '@utils/logger.js';
import { processRecommendation } from '../services/processor.js';
import { createForumPost } from '../services/forum-poster.js';
import { recommendationService } from '@services/database/recommendations.js';
import type { LibraryType } from '../config/library-tags.js';

/**
 * Get friendly library name from library type
 */
function getLibraryName(libraryType: LibraryType): string {
  switch (libraryType) {
    case 'fiction':
      return 'Fiction Vault';
    case 'athenaeum':
      return 'Athenaeum';
    case 'growth':
      return 'Growth Lab';
    default:
      return 'Library';
  }
}

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
    const { postId, threadId, forumChannelId } = await createForumPost(
      message.client,
      processed,
      message.url,
      message.author.id
    );

    // Step 3: Update database with forum post info
    await recommendationService.markAsProcessed(processed.recommendationId, postId, threadId);

    // Step 4: Reply with link to library forum thread
    const forumThreadUrl = `https://discord.com/channels/${message.guildId}/${forumChannelId}/${threadId}`;
    const libraryName = getLibraryName(processed.metadata.libraryType);

    try {
      await message.reply({
        content: `✅ Your recommendation has been added to **${libraryName}**!\n\n📚 Continue the discussion here: ${forumThreadUrl}`,
        allowedMentions: { repliedUser: false },
      });
    } catch (replyError) {
      logger.debug('Could not send success reply', replyError);
    }

    // Step 5: Add success reaction and remove processing reaction
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

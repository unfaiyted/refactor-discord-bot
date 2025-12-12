import type { Message, Client } from 'discord.js';
import { logger } from '@utils/logger.js';
import { env } from '@config/env.js';
import { conversationService } from '@services/database/conversations.js';
import { respondToThreadQuestion } from '@services/claude/conversation.js';

/**
 * Handle bot mentions in forum threads
 */
export async function handleThreadMention(message: Message, client: Client): Promise<void> {
  try {
    // Validation checks
    if (!message.channel.isThread()) {
      logger.debug('Message is not in a thread, ignoring');
      return;
    }

    if (message.author.bot) {
      logger.debug('Message is from a bot, ignoring');
      return;
    }

    if (!message.mentions.has(client.user!)) {
      logger.debug('Bot not mentioned, ignoring');
      return;
    }

    // Verify it's in one of the library forums
    const libraryForumIds = [
      env.discord.fictionVaultForumId,
      env.discord.athenaeumForumId,
      env.discord.growthLabForumId,
    ];
    if (!libraryForumIds.includes(message.channel.parentId!)) {
      logger.debug('Thread is not in a library forum', {
        parentId: message.channel.parentId,
        libraryForumIds,
      });
      return;
    }

    logger.info('Handling thread mention', {
      threadId: message.channel.id,
      messageId: message.id,
      userId: message.author.id,
      userName: message.author.username,
    });

    // Add typing indicator to show bot is working
    await message.channel.sendTyping();

    const startTime = Date.now();

    // Get conversation context (recommendation + history)
    const context = await conversationService.getConversationContext(message.channel.id);

    if (!context) {
      logger.warn('No recommendation found for thread', {
        threadId: message.channel.id,
      });
      await message.reply(
        "I couldn't find the recommendation associated with this thread. This might be an error."
      );
      return;
    }

    // Get next message number
    const messageNumber = await conversationService.getNextMessageNumber(message.channel.id);

    // Store user's message
    await conversationService.storeMessage({
      messageId: message.id,
      threadId: message.channel.id,
      channelId: message.channel.parentId!,
      userId: message.author.id,
      userName: message.author.username,
      content: message.content,
      isBot: false,
      recommendationId: context.recommendation.id,
      messageNumber,
    });

    // Get or create engagement record
    await conversationService.getOrCreateEngagement(message.channel.id, context.recommendation.id);

    // Generate AI response
    const aiResponse = await respondToThreadQuestion({
      recommendation: context.recommendation,
      conversationHistory: context.recentMessages,
      currentQuestion: message.content,
      userName: message.author.username,
    });

    // Send response to Discord
    const botMessage = await message.reply(aiResponse.response);

    // Store bot's response
    const botMessageNumber = await conversationService.getNextMessageNumber(message.channel.id);
    await conversationService.storeMessage({
      messageId: botMessage.id,
      threadId: message.channel.id,
      channelId: message.channel.parentId!,
      userId: client.user!.id,
      userName: client.user!.username,
      content: message.content, // Original question
      isBot: true,
      recommendationId: context.recommendation.id,
      messageNumber: botMessageNumber,
      topicsDiscussed: aiResponse.topicsDiscussed,
    });

    // Update with AI response details
    await conversationService.updateWithBotResponse(botMessage.id, {
      messageId: botMessage.id,
      aiResponse: aiResponse.response,
      responseTime: aiResponse.responseTime,
    });

    // Update engagement metrics
    await conversationService.updateEngagementMetrics(
      message.channel.id,
      false,
      message.author.id,
      message.author.username,
      aiResponse.topicsDiscussed
    );

    const totalTime = Date.now() - startTime;

    logger.info('Successfully handled thread mention', {
      threadId: message.channel.id,
      messageId: message.id,
      responseLength: aiResponse.response.length,
      totalTime,
      aiResponseTime: aiResponse.responseTime,
      topicsDiscussed: aiResponse.topicsDiscussed,
    });
  } catch (error) {
    logger.error('Failed to handle thread mention', {
      threadId: message.channel?.id,
      messageId: message.id,
      error,
    });

    // Send error message to user
    try {
      await message.reply(
        'Sorry, I encountered an error while processing your question. Please try again later.'
      );
    } catch (replyError) {
      logger.error('Failed to send error message to user', { replyError });
    }
  }
}

/**
 * Check if a message is a bot mention in a forum thread
 */
export function isThreadMention(message: Message, client: Client): boolean {
  const libraryForumIds = [
    env.discord.fictionVaultForumId,
    env.discord.athenaeumForumId,
    env.discord.growthLabForumId,
  ];
  return (
    message.channel.isThread() &&
    !message.author.bot &&
    message.mentions.has(client.user!) &&
    libraryForumIds.includes(message.channel.parentId!)
  );
}

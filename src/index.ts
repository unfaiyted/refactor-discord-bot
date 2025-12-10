import { Client, GatewayIntentBits, Events } from 'discord.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { handleRecommendationMessage } from '@features/recommendations/events/message-handler.js';
import { ensureForumTags } from '@features/recommendations/services/forum-poster.js';

/**
 * Initialize Discord client with required intents
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * Bot ready event
 */
client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`Bot is ready! Logged in as ${readyClient.user.tag}`);
  logger.info(`Monitoring channel: ${env.discord.recommendationsChannelId}`);
  logger.info(`Forum channel: ${env.discord.processedRecommendationsForumId}`);

  // Check and warn about missing forum tags
  await ensureForumTags(readyClient);
});

/**
 * Message create event - handles new recommendations
 */
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process messages from the recommendations channel
  if (message.channelId !== env.discord.recommendationsChannelId) return;

  logger.debug('New message in recommendations channel', {
    author: message.author.tag,
    content: message.content.substring(0, 100),
  });

  try {
    await handleRecommendationMessage(message);
  } catch (error) {
    logger.error('Error handling recommendation message', error);
  }
});

/**
 * Error handling
 */
client.on(Events.Error, (error) => {
  logger.error('Discord client error', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
});

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down bot...');
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Login to Discord
 */
logger.info('Starting Refactor Discord Bot...');
client.login(env.discord.token).catch((error) => {
  logger.error('Failed to login to Discord', error);
  process.exit(1);
});

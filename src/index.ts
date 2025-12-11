import { Client, GatewayIntentBits, Events, PermissionFlagsBits } from 'discord.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { handleRecommendationMessage } from '@features/recommendations/events/message-handler.js';
import {
  handleThreadMention,
  isThreadMention,
} from '@features/recommendations/events/thread-handler.js';
import { ensureForumTags } from '@features/recommendations/services/forum-poster.js';
import { backfillMissedRecommendations } from '@services/backfill/backfill-service.js';

/**
 * Generate bot invite URL with required permissions
 */
function generateInviteUrl(clientId: string): string {
  const permissions =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.CreatePublicThreads |
    PermissionFlagsBits.SendMessagesInThreads |
    PermissionFlagsBits.EmbedLinks |
    PermissionFlagsBits.ReadMessageHistory |
    PermissionFlagsBits.ManageThreads;

  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot`;
}

/**
 * Display setup instructions
 */
function displaySetupInstructions() {
  const inviteUrl = generateInviteUrl(env.discord.clientId);

  console.log('\n' + '='.repeat(80));
  console.log('🤖 BOT SETUP REQUIRED');
  console.log('='.repeat(80));
  console.log('\nThe bot needs proper permissions to function correctly.');
  console.log('\n📋 Required Permissions:');
  console.log('  • View Channels');
  console.log('  • Send Messages');
  console.log('  • Create Public Threads');
  console.log('  • Send Messages in Threads');
  console.log('  • Embed Links');
  console.log('  • Read Message History');
  console.log('  • Manage Threads');
  console.log('\n🔗 Invite Link (click to add bot with correct permissions):');
  console.log(`\n  ${inviteUrl}\n`);
  console.log('📝 Steps to fix:');
  console.log('  1. Click the invite link above');
  console.log('  2. Select your server from the dropdown');
  console.log('  3. Ensure all permissions are checked');
  console.log('  4. Click "Authorize"');
  console.log('  5. Restart the bot');
  console.log('\n' + '='.repeat(80) + '\n');
}

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
  try {
    await ensureForumTags(readyClient);
  } catch (error: any) {
    if (error?.message?.includes('Missing Access')) {
      logger.error('Bot is missing required permissions!');
      displaySetupInstructions();
    } else {
      logger.error('Failed to check forum tags', error);
    }
  }

  // Backfill missed recommendations (runs asynchronously in background)
  backfillMissedRecommendations(readyClient)
    .then((result) => {
      logger.info('Backfill completed', {
        checked: result.checked,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        limitReached: result.limitReached,
      });
    })
    .catch((error) => {
      logger.error('Backfill failed', error);
    });
});

/**
 * Message create event - handles new recommendations and thread mentions
 */
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Handle thread mentions (bot tagged in forum threads)
  if (isThreadMention(message, client)) {
    logger.debug('Bot mentioned in thread', {
      threadId: message.channel.id,
      author: message.author.tag,
      content: message.content.substring(0, 100),
    });

    try {
      await handleThreadMention(message, client);
    } catch (error) {
      logger.error('Error handling thread mention', error);
    }
    return;
  }

  // Handle new recommendations in recommendations channel
  if (message.channelId === env.discord.recommendationsChannelId) {
    logger.debug('New message in recommendations channel', {
      author: message.author.tag,
      content: message.content.substring(0, 100),
    });

    try {
      await handleRecommendationMessage(message);
    } catch (error) {
      logger.error('Error handling recommendation message', error);
    }
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

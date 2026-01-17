import {
  Client,
  EmbedBuilder,
  ForumChannel,
  ThreadAutoArchiveDuration,
  ChannelType,
} from 'discord.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import type { ProcessedRecommendation } from './processor.js';
import {
  LIBRARY_TAGS,
  type LibraryType,
  findMatchingTag,
  getTagEmoji,
} from '../config/library-tags.js';

/**
 * Get the correct forum ID based on library type
 */
function getLibraryForumId(libraryType: LibraryType): string {
  switch (libraryType) {
    case 'fiction':
      return env.discord.fictionVaultForumId;
    case 'athenaeum':
      return env.discord.athenaeumForumId;
    case 'growth':
      return env.discord.growthLabForumId;
    default:
      throw new Error(`Unknown library type: ${libraryType}`);
  }
}

/**
 * Content type emoji mapping
 */
const CONTENT_TYPE_EMOJI: Record<string, string> = {
  video: '🎥',
  podcast: '🎙️',
  article: '📰',
  book: '📚',
  audiobook: '🎧',
  tool: '🛠️',
  course: '🎓',
  other: '🔗',
};

/**
 * Get quality rating emoji based on score
 */
function getQualityEmoji(score: number): string {
  if (score >= 9) return '⭐⭐⭐';
  if (score >= 7) return '⭐⭐';
  if (score >= 5) return '⭐';
  return '';
}

/**
 * Create a forum post for a processed recommendation
 */
export async function createForumPost(
  client: Client,
  recommendation: ProcessedRecommendation,
  originalMessageUrl: string,
  recommenderId: string
): Promise<{ postId: string; threadId: string; forumChannelId: string }> {
  try {
    // Get the correct forum channel based on library type
    const libraryType = recommendation.metadata.libraryType;
    const forumId = getLibraryForumId(libraryType);
    const channel = await client.channels.fetch(forumId);

    if (!channel || channel.type !== ChannelType.GuildForum) {
      throw new Error(`Library forum channel (${libraryType}) is not a forum channel`);
    }

    const forumChannel = channel as ForumChannel;
    const availableTags = forumChannel.availableTags;

    // Build tags array using library-specific tags (limit 5 tags per Discord)
    const appliedTags: string[] = [];

    // Add primary tag first
    const primaryTagMatch = findMatchingTag(
      recommendation.metadata.primaryTag,
      libraryType,
      availableTags,
      appliedTags
    );
    if (primaryTagMatch) {
      appliedTags.push(primaryTagMatch.id);
    }

    // Add secondary tags
    for (const secondaryTag of recommendation.metadata.secondaryTags) {
      if (appliedTags.length >= 5) break; // Discord limit

      const tagMatch = findMatchingTag(secondaryTag, libraryType, availableTags, appliedTags);
      if (tagMatch && !appliedTags.includes(tagMatch.id)) {
        appliedTags.push(tagMatch.id);
      }
    }

    // Build embed description with TL;DR if available
    let description = recommendation.metadata.aiSummary;
    if (recommendation.metadata.tldr) {
      description = `**TL;DR:** ${recommendation.metadata.tldr}\n\n${recommendation.metadata.aiSummary}`;
    }

    // Create rich embed
    const embedBuilder = new EmbedBuilder()
      .setTitle(
        `${CONTENT_TYPE_EMOJI[recommendation.metadata.contentType] || '🔗'} ${recommendation.metadata.title}`
      )
      .setDescription(description)
      .setURL(recommendation.url)
      .setColor(getEmbedColor(recommendation.metadata.sentiment))
      .addFields(
        { name: 'Type', value: recommendation.metadata.contentType, inline: true },
        {
          name: 'Quality',
          value: `${getQualityEmoji(recommendation.metadata.qualityScore)} ${recommendation.metadata.qualityScore}/10`,
          inline: true,
        },
        ...(recommendation.metadata.duration
          ? [{ name: 'Duration', value: recommendation.metadata.duration, inline: true }]
          : []),
        { name: 'Topics', value: recommendation.metadata.topics.join(', ') }
      );

    // Add key takeaways if available
    if (recommendation.metadata.keyTakeaways && recommendation.metadata.keyTakeaways.length > 0) {
      embedBuilder.addFields({
        name: '📝 Key Takeaways',
        value: recommendation.metadata.keyTakeaways.map((t) => `• ${t}`).join('\n'),
      });
    }

    // Add main ideas if available
    if (recommendation.metadata.mainIdeas && recommendation.metadata.mainIdeas.length > 0) {
      embedBuilder.addFields({
        name: '💡 Main Ideas',
        value: recommendation.metadata.mainIdeas.map((i) => `• ${i}`).join('\n'),
      });
    }

    // Add thumbnail if available (shows in gallery view)
    if (recommendation.metadata.thumbnail) {
      logger.debug('Setting embed image', {
        thumbnail: recommendation.metadata.thumbnail,
        title: recommendation.metadata.title,
      });
      embedBuilder.setImage(recommendation.metadata.thumbnail);
    } else {
      logger.debug('No thumbnail available for embed', {
        title: recommendation.metadata.title,
      });
    }

    // Add recommender info at the end with proper Discord mention
    embedBuilder.addFields(
      { name: 'Recommended by', value: `<@${recommenderId}>`, inline: true },
      {
        name: 'Original Message',
        value: `[Jump to message](${originalMessageUrl})`,
        inline: true,
      }
    );

    const embed = embedBuilder.setTimestamp();

    // Create forum thread
    const thread = await forumChannel.threads.create({
      name: recommendation.metadata.title.substring(0, 100), // Discord limit
      message: {
        embeds: [embed],
      },
      appliedTags,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    });

    logger.info('Created forum post', {
      threadId: thread.id,
      title: recommendation.metadata.title,
    });

    return {
      postId: thread.id,
      threadId: thread.id,
      forumChannelId: forumId,
    };
  } catch (error) {
    logger.error('Failed to create forum post', error);
    throw error;
  }
}

/**
 * Get embed color based on sentiment
 */
function getEmbedColor(sentiment: string): number {
  switch (sentiment) {
    case 'positive':
      return 0x00ff00; // Green
    case 'critical':
      return 0xff9900; // Orange
    case 'informative':
      return 0x0099ff; // Blue
    default:
      return 0x808080; // Gray
  }
}

/**
 * Ensure required forum tags exist for a specific library
 */
async function ensureLibraryForumTags(client: Client, libraryType: LibraryType): Promise<void> {
  const forumId = getLibraryForumId(libraryType);
  const channel = await client.channels.fetch(forumId);

  if (!channel || channel.type !== ChannelType.GuildForum) {
    logger.warn(`Cannot ensure tags for ${libraryType}: channel is not a forum`);
    return;
  }

  const forumChannel = channel as ForumChannel;
  const existingTags = forumChannel.availableTags.map((tag) => tag.name.toLowerCase());

  // Get required tags from library configuration
  const libraryConfig = LIBRARY_TAGS[libraryType];
  const requiredTags = libraryConfig.tags.map((tag) => ({
    name: tag.name,
    emoji: tag.emoji,
  }));

  const missingTags = requiredTags.filter((tag) => !existingTags.includes(tag.name.toLowerCase()));

  if (missingTags.length > 0) {
    logger.warn(`Missing forum tags detected for ${libraryType.toUpperCase()} library:`, {
      library: libraryType,
      missing: missingTags.map((t) => t.name),
    });
    logger.warn(`Please manually create these ${missingTags.length} forum tags in Discord:`);
    missingTags.forEach((tag) => {
      logger.warn(`  - ${tag.emoji} ${tag.name}`);
    });
  } else {
    logger.info(`All required forum tags are present for ${libraryType.toUpperCase()} library`);
  }
}

/**
 * Ensure required forum tags exist for all libraries
 */
export async function ensureForumTags(client: Client): Promise<void> {
  logger.info('Checking forum tags for all libraries...');

  await ensureLibraryForumTags(client, 'fiction');
  await ensureLibraryForumTags(client, 'athenaeum');
  await ensureLibraryForumTags(client, 'growth');

  logger.info('Forum tag check complete');
}

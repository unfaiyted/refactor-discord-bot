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

/**
 * Content type emoji mapping
 */
const CONTENT_TYPE_EMOJI: Record<string, string> = {
  video: '🎥',
  podcast: '🎙️',
  article: '📰',
  book: '📚',
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
  recommenderTag: string
): Promise<{ postId: string; threadId: string }> {
  try {
    // Get the forum channel
    const channel = await client.channels.fetch(env.discord.processedRecommendationsForumId);

    if (!channel || channel.type !== ChannelType.GuildForum) {
      throw new Error('Processed recommendations channel is not a forum channel');
    }

    const forumChannel = channel as ForumChannel;

    // Get or create tags for content type
    const availableTags = forumChannel.availableTags;
    const contentTypeTag = availableTags.find(
      (tag) => tag.name.toLowerCase() === recommendation.metadata.contentType.toLowerCase()
    );

    // Build tags array (limit 5 tags per Discord)
    const appliedTags: string[] = [];
    if (contentTypeTag) {
      appliedTags.push(contentTypeTag.id);
    }

    // Try to add topic tags if they exist
    for (const topic of recommendation.metadata.topics.slice(0, 4)) {
      const topicTag = availableTags.find((tag) => tag.name.toLowerCase() === topic.toLowerCase());
      if (topicTag && appliedTags.length < 5) {
        appliedTags.push(topicTag.id);
      }
    }

    // Create rich embed
    const embed = new EmbedBuilder()
      .setTitle(
        `${CONTENT_TYPE_EMOJI[recommendation.metadata.contentType] || '🔗'} ${recommendation.metadata.title}`
      )
      .setDescription(recommendation.metadata.aiSummary)
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
        { name: 'Topics', value: recommendation.metadata.topics.join(', ') },
        { name: 'Recommended by', value: recommenderTag, inline: true },
        {
          name: 'Original Message',
          value: `[Jump to message](${originalMessageUrl})`,
          inline: true,
        }
      )
      .setTimestamp();

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
 * Ensure required forum tags exist
 */
export async function ensureForumTags(client: Client): Promise<void> {
  const channel = await client.channels.fetch(env.discord.processedRecommendationsForumId);

  if (!channel || channel.type !== ChannelType.GuildForum) {
    logger.warn('Cannot ensure tags: channel is not a forum');
    return;
  }

  const forumChannel = channel as ForumChannel;
  const existingTags = forumChannel.availableTags.map((tag) => tag.name.toLowerCase());

  const requiredTags = [
    // Content types
    { name: 'Video', emoji: '🎥' },
    { name: 'Podcast', emoji: '🎙️' },
    { name: 'Article', emoji: '📰' },
    { name: 'Book', emoji: '📚' },
    { name: 'Tool', emoji: '🛠️' },
    { name: 'Course', emoji: '🎓' },
    // Topic categories
    { name: 'Tech', emoji: '💻' },
    { name: 'AI', emoji: '🤖' },
    { name: 'Relationships', emoji: '💑' },
    { name: 'Fitness', emoji: '💪' },
    { name: 'Health', emoji: '🏥' },
    { name: 'Infrastructure', emoji: '🏗️' },
  ];

  const missingTags = requiredTags.filter((tag) => !existingTags.includes(tag.name.toLowerCase()));

  if (missingTags.length > 0) {
    logger.info('Missing forum tags detected', {
      missing: missingTags.map((t) => t.name),
    });
    logger.warn('Please manually create these forum tags in Discord:');
    missingTags.forEach((tag) => {
      logger.warn(`  - ${tag.emoji} ${tag.name}`);
    });
  } else {
    logger.info('All required forum tags are present');
  }
}

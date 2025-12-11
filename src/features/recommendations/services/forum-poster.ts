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
 * Tag synonyms and related terms for better matching
 */
const TAG_SYNONYMS: Record<string, string[]> = {
  health: ['wellness', 'medical', 'healthcare', 'wellbeing'],
  fitness: ['exercise', 'workout', 'training', 'physical'],
  tech: ['technology', 'software', 'programming', 'coding', 'development'],
  ai: ['artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt'],
  relationships: ['dating', 'marriage', 'family', 'social'],
  psychology: ['mental', 'mindset', 'cognitive', 'behavioral'],
  nutrition: ['diet', 'eating', 'food', 'meal'],
  productivity: ['efficiency', 'time management', 'organization', 'gtd'],
  business: ['entrepreneurship', 'startup', 'commerce', 'enterprise'],
  career: ['job', 'work', 'professional', 'employment'],
  science: ['research', 'scientific', 'biology', 'chemistry', 'physics'],
  'mental health': ['therapy', 'anxiety', 'depression', 'stress', 'mindfulness'],
  'self-improvement': ['personal development', 'growth', 'self-help', 'improvement'],
};

/**
 * Find best matching tag using fuzzy matching and synonyms
 */
function findBestMatchingTag(
  topic: string,
  availableTags: any[],
  alreadyApplied: string[]
): any | undefined {
  const topicLower = topic.toLowerCase();

  // Check if topic contains any tag name
  for (const tag of availableTags) {
    if (alreadyApplied.includes(tag.id)) continue;

    const tagNameLower = tag.name.toLowerCase();

    // Check if topic contains the tag name or vice versa
    if (topicLower.includes(tagNameLower) || tagNameLower.includes(topicLower)) {
      return tag;
    }

    // Check synonyms
    const synonyms = TAG_SYNONYMS[tagNameLower] || [];
    for (const synonym of synonyms) {
      if (topicLower.includes(synonym) || synonym.includes(topicLower)) {
        return tag;
      }
    }
  }

  return undefined;
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

    // Try to add topic tags if they exist - with improved matching
    for (const topic of recommendation.metadata.topics) {
      if (appliedTags.length >= 5) break; // Discord limit

      // Try exact match first
      let topicTag = availableTags.find((tag) => tag.name.toLowerCase() === topic.toLowerCase());

      // If no exact match, try partial/fuzzy matching
      if (!topicTag) {
        topicTag = findBestMatchingTag(topic, availableTags, appliedTags);
      }

      if (topicTag && !appliedTags.includes(topicTag.id)) {
        appliedTags.push(topicTag.id);
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
      embedBuilder.setImage(recommendation.metadata.thumbnail);
    }

    // Add recommender info at the end
    embedBuilder.addFields(
      { name: 'Recommended by', value: recommenderTag, inline: true },
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
    { name: 'Audiobook', emoji: '🎧' },
    { name: 'Tool', emoji: '🛠️' },
    { name: 'Course', emoji: '🎓' },
    // Topic categories
    { name: 'Tech', emoji: '💻' },
    { name: 'AI', emoji: '🤖' },
    { name: 'Relationships', emoji: '💑' },
    { name: 'Fitness', emoji: '💪' },
    { name: 'Health', emoji: '🏥' },
    { name: 'Infrastructure', emoji: '🏗️' },
    { name: 'Business', emoji: '💼' },
    { name: 'Science', emoji: '🔬' },
    { name: 'Psychology', emoji: '🧠' },
    { name: 'Productivity', emoji: '⚡' },
    { name: 'Nutrition', emoji: '🥗' },
    { name: 'Mental Health', emoji: '🧘' },
    { name: 'Self-Improvement', emoji: '🌱' },
    { name: 'Career', emoji: '📈' },
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

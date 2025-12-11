import { conversationService } from '@services/database/conversations.js';
import { analyzeConversationTopics } from '@services/claude/conversation.js';
import { logger } from '@utils/logger.js';
import type { ThreadEngagement, Recommendation } from '@prisma/client';

export interface ThreadAnalytics {
  threadId: string;
  recommendation: {
    title: string;
    contentType: string;
    topics: string[];
  };
  engagement: {
    totalMessages: number;
    userMessages: number;
    botMessages: number;
    uniqueUsers: number;
    avgResponseTime: number | null;
    engagementScore: number | null;
  };
  topicsDiscussed: string[];
  participants: {
    ids: string[];
    names: string[];
  };
  timeline: {
    firstMessageAt: Date | null;
    lastMessageAt: Date | null;
    durationDays: number | null;
  };
}

export interface TopRecommendation extends Recommendation {
  engagement?: ThreadEngagement | null;
}

/**
 * Get comprehensive analytics for a thread
 */
export async function getThreadAnalytics(threadId: string): Promise<ThreadAnalytics | null> {
  try {
    const engagement = await conversationService.getEngagementStats(threadId);

    if (!engagement) {
      logger.warn('No engagement data found for thread', { threadId });
      return null;
    }

    // Calculate duration
    let durationDays: number | null = null;
    if (engagement.firstMessageAt && engagement.lastMessageAt) {
      const durationMs = engagement.lastMessageAt.getTime() - engagement.firstMessageAt.getTime();
      durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    }

    return {
      threadId: engagement.threadId,
      recommendation: {
        title: engagement.recommendation.title || 'Untitled',
        contentType: engagement.recommendation.contentType || 'Unknown',
        topics: engagement.recommendation.topics || [],
      },
      engagement: {
        totalMessages: engagement.totalMessages,
        userMessages: engagement.userMessages,
        botMessages: engagement.botMessages,
        uniqueUsers: engagement.uniqueUsers,
        avgResponseTime: engagement.avgResponseTime,
        engagementScore: engagement.engagementScore,
      },
      topicsDiscussed: engagement.topicsDiscussed,
      participants: {
        ids: engagement.participantIds,
        names: engagement.participantNames,
      },
      timeline: {
        firstMessageAt: engagement.firstMessageAt,
        lastMessageAt: engagement.lastMessageAt,
        durationDays,
      },
    };
  } catch (error) {
    logger.error('Failed to get thread analytics', { threadId, error });
    return null;
  }
}

/**
 * Get top N most engaged recommendations
 */
export async function getTopEngagedRecommendations(
  limit: number = 10
): Promise<TopRecommendation[]> {
  try {
    return await conversationService.getTopEngagedRecommendations(limit);
  } catch (error) {
    logger.error('Failed to get top engaged recommendations', { error });
    return [];
  }
}

/**
 * Analyze conversation topics using AI
 * (Can be run periodically as a background job)
 */
export async function analyzeThreadTopics(threadId: string): Promise<string[]> {
  try {
    const context = await conversationService.getConversationContext(threadId);

    if (!context) {
      return [];
    }

    const topics = await analyzeConversationTopics(context.recentMessages, context.recommendation);

    logger.info('Analyzed thread topics', {
      threadId,
      topicsFound: topics.length,
      topics,
    });

    return topics;
  } catch (error) {
    logger.error('Failed to analyze thread topics', { threadId, error });
    return [];
  }
}

/**
 * Get engagement summary across all threads
 */
export interface GlobalEngagementSummary {
  totalThreads: number;
  totalMessages: number;
  totalUniqueUsers: number;
  avgMessagesPerThread: number;
  avgEngagementScore: number;
  topTopics: Array<{ topic: string; count: number }>;
}

export async function getGlobalEngagementSummary(): Promise<GlobalEngagementSummary> {
  try {
    const recommendations = await conversationService.getTopEngagedRecommendations(1000);

    const totalThreads = recommendations.length;
    const totalMessages = recommendations.reduce((sum, r) => sum + r.conversationCount, 0);

    // Get all engagement records
    const engagements = recommendations
      .map((r) => r.engagement)
      .filter((e): e is ThreadEngagement => e !== null);

    const totalUniqueUsersSet = new Set<string>();
    engagements.forEach((e) => {
      e.participantIds.forEach((id) => totalUniqueUsersSet.add(id));
    });

    const avgMessagesPerThread = totalThreads > 0 ? totalMessages / totalThreads : 0;

    const totalEngagement = recommendations.reduce((sum, r) => sum + (r.engagementScore || 0), 0);
    const avgEngagementScore = totalThreads > 0 ? totalEngagement / totalThreads : 0;

    // Count topic occurrences
    const topicCounts = new Map<string, number>();
    engagements.forEach((e) => {
      e.topicsDiscussed.forEach((topic) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    const topTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalThreads,
      totalMessages,
      totalUniqueUsers: totalUniqueUsersSet.size,
      avgMessagesPerThread: Math.round(avgMessagesPerThread * 10) / 10,
      avgEngagementScore: Math.round(avgEngagementScore * 10) / 10,
      topTopics,
    };
  } catch (error) {
    logger.error('Failed to get global engagement summary', { error });
    return {
      totalThreads: 0,
      totalMessages: 0,
      totalUniqueUsers: 0,
      avgMessagesPerThread: 0,
      avgEngagementScore: 0,
      topTopics: [],
    };
  }
}

/**
 * Get analytics for a specific user's participation
 */
export interface UserParticipation {
  userId: string;
  userName: string;
  threadsParticipated: number;
  totalMessages: number;
  topicsDiscussed: string[];
  mostEngagedRecommendations: Array<{
    title: string;
    messageCount: number;
  }>;
}

export async function getUserParticipation(userId: string): Promise<UserParticipation | null> {
  try {
    // This would require additional database queries
    // For now, return a placeholder implementation
    logger.warn('getUserParticipation not fully implemented yet', { userId });
    return null;
  } catch (error) {
    logger.error('Failed to get user participation', { userId, error });
    return null;
  }
}

import { prisma } from './client.js';
import type { ConversationMessage, ThreadEngagement, Recommendation } from '@prisma/client';

export type ThreadEngagementWithRecommendation = ThreadEngagement & {
  recommendation: {
    title: string | null;
    contentType: string | null;
    topics: string[];
  };
};

export type RecommendationWithEngagement = Recommendation & {
  engagement: ThreadEngagement | null;
};

export interface CreateConversationMessageData {
  messageId: string;
  threadId: string;
  channelId: string;
  userId: string;
  userName: string;
  content: string;
  isBot: boolean;
  recommendationId?: string;
  messageNumber: number;
  topicsDiscussed?: string[];
}

export interface StoreBotResponseData {
  messageId: string;
  aiResponse: string;
  responseTime: number;
}

export interface ConversationContext {
  recommendation: Recommendation;
  recentMessages: ConversationMessage[];
  messageCount: number;
  uniqueUsers: number;
}

export class ConversationService {
  /**
   * Store a conversation message (user or bot)
   */
  async storeMessage(data: CreateConversationMessageData): Promise<ConversationMessage> {
    return prisma.conversationMessage.create({
      data,
    });
  }

  /**
   * Update a message with bot's AI response
   */
  async updateWithBotResponse(
    messageId: string,
    data: StoreBotResponseData
  ): Promise<ConversationMessage> {
    return prisma.conversationMessage.update({
      where: { messageId: data.messageId },
      data: {
        aiResponse: data.aiResponse,
        responseTime: data.responseTime,
      },
    });
  }

  /**
   * Get thread history with smart filtering (last N messages)
   */
  async getThreadHistory(threadId: string, limit: number = 15): Promise<ConversationMessage[]> {
    return prisma.conversationMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get conversation context for AI (recommendation + recent messages)
   */
  async getConversationContext(threadId: string): Promise<ConversationContext | null> {
    // First, get the recommendation by thread ID
    const recommendation = await prisma.recommendation.findUnique({
      where: { forumThreadId: threadId },
    });

    if (!recommendation) {
      return null;
    }

    // Get recent messages (last 15)
    const recentMessages = await this.getThreadHistory(threadId, 15);

    // Get total message count
    const messageCount = await prisma.conversationMessage.count({
      where: { threadId },
    });

    // Get unique users count
    const messages = await prisma.conversationMessage.findMany({
      where: { threadId },
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      recommendation,
      recentMessages: recentMessages.reverse(), // Chronological order
      messageCount,
      uniqueUsers: messages.length,
    };
  }

  /**
   * Get recommendation by thread ID
   */
  async getRecommendationByThreadId(threadId: string): Promise<Recommendation | null> {
    return prisma.recommendation.findUnique({
      where: { forumThreadId: threadId },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Get or create thread engagement record
   */
  async getOrCreateEngagement(
    threadId: string,
    recommendationId: string
  ): Promise<ThreadEngagement> {
    let engagement = await prisma.threadEngagement.findUnique({
      where: { threadId },
    });

    if (!engagement) {
      engagement = await prisma.threadEngagement.create({
        data: {
          threadId,
          recommendationId,
        },
      });
    }

    return engagement;
  }

  /**
   * Update engagement metrics after new message
   */
  async updateEngagementMetrics(
    threadId: string,
    isBot: boolean,
    userId?: string,
    userName?: string,
    topicsDiscussed?: string[]
  ): Promise<void> {
    const engagement = await prisma.threadEngagement.findUnique({
      where: { threadId },
    });

    if (!engagement) return;

    // Get all unique participants
    const allMessages = await prisma.conversationMessage.findMany({
      where: { threadId },
      select: { userId: true, userName: true },
    });

    const uniqueUserIds = [...new Set(allMessages.map((m: { userId: string }) => m.userId))];
    const uniqueUserNames = [...new Set(allMessages.map((m: { userName: string }) => m.userName))];

    // Get total message counts
    const totalMessages = await prisma.conversationMessage.count({
      where: { threadId },
    });

    const userMessages = await prisma.conversationMessage.count({
      where: { threadId, isBot: false },
    });

    const botMessages = await prisma.conversationMessage.count({
      where: { threadId, isBot: true },
    });

    // Get all topics discussed
    const allMessagesWithTopics = await prisma.conversationMessage.findMany({
      where: { threadId },
      select: { topicsDiscussed: true },
    });

    const allTopics = [
      ...new Set(
        allMessagesWithTopics.flatMap(
          (m: { topicsDiscussed: string[] | null }) => m.topicsDiscussed || []
        )
      ),
    ];

    // Calculate average response time
    const botResponses = await prisma.conversationMessage.findMany({
      where: { threadId, isBot: true, responseTime: { not: null } },
      select: { responseTime: true },
    });

    const avgResponseTime =
      botResponses.length > 0
        ? botResponses.reduce(
            (sum: number, r: { responseTime: number | null }) => sum + (r.responseTime || 0),
            0
          ) / botResponses.length
        : null;

    // Get first and last message timestamps
    const firstMessage = await prisma.conversationMessage.findFirst({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });

    const lastMessage = await prisma.conversationMessage.findFirst({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate engagement score (0-100)
    // Formula: (messages * 10) + (unique users * 20) + (topics * 5)
    const engagementScore = Math.min(
      100,
      totalMessages * 10 + uniqueUserIds.length * 20 + allTopics.length * 5
    );

    // Update engagement record
    await prisma.threadEngagement.update({
      where: { threadId },
      data: {
        totalMessages,
        userMessages,
        botMessages,
        uniqueUsers: uniqueUserIds.length,
        topicsDiscussed: allTopics,
        avgResponseTime,
        participantIds: uniqueUserIds,
        participantNames: uniqueUserNames,
        firstMessageAt: firstMessage?.createdAt,
        lastMessageAt: lastMessage?.createdAt,
        engagementScore,
      },
    });

    // Update recommendation engagement stats
    await prisma.recommendation.update({
      where: { id: engagement.recommendationId },
      data: {
        conversationCount: totalMessages,
        lastConversationAt: new Date(),
        engagementScore,
      },
    });
  }

  /**
   * Get engagement stats for a thread
   */
  async getEngagementStats(threadId: string): Promise<ThreadEngagementWithRecommendation | null> {
    return prisma.threadEngagement.findUnique({
      where: { threadId },
      include: {
        recommendation: {
          select: {
            title: true,
            contentType: true,
            topics: true,
          },
        },
      },
    });
  }

  /**
   * Get top engaged recommendations
   */
  async getTopEngagedRecommendations(limit: number = 10): Promise<RecommendationWithEngagement[]> {
    return prisma.recommendation.findMany({
      where: {
        conversationCount: { gt: 0 },
      },
      orderBy: {
        engagementScore: 'desc',
      },
      take: limit,
      include: {
        engagement: true,
      },
    });
  }

  /**
   * Get next message number for a thread
   */
  async getNextMessageNumber(threadId: string): Promise<number> {
    const count = await prisma.conversationMessage.count({
      where: { threadId },
    });
    return count + 1;
  }
}

export const conversationService = new ConversationService();

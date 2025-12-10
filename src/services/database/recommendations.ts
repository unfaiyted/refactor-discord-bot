import { prisma } from './client.js';
import type { Recommendation } from '@prisma/client';

export interface CreateRecommendationData {
  originalMessageId: string;
  originalChannelId: string;
  originalContent: string;
  recommenderId: string;
  recommenderName: string;
  url: string;
}

export interface UpdateRecommendationMetadata {
  title?: string;
  description?: string;
  contentType?: string;
  topics?: string[];
  duration?: string;
  qualityScore?: number;
  sentiment?: string;
  aiSummary?: string;
}

export class RecommendationService {
  /**
   * Create a new recommendation record
   */
  async create(data: CreateRecommendationData): Promise<Recommendation> {
    return prisma.recommendation.create({
      data
    });
  }

  /**
   * Find recommendation by original message ID
   */
  async findByMessageId(messageId: string): Promise<Recommendation | null> {
    return prisma.recommendation.findUnique({
      where: { originalMessageId: messageId }
    });
  }

  /**
   * Update recommendation with AI-extracted metadata
   */
  async updateMetadata(
    recommendationId: string,
    metadata: UpdateRecommendationMetadata
  ): Promise<Recommendation> {
    return prisma.recommendation.update({
      where: { id: recommendationId },
      data: metadata
    });
  }

  /**
   * Mark recommendation as processed with forum post info
   */
  async markAsProcessed(
    recommendationId: string,
    forumPostId: string,
    forumThreadId: string
  ): Promise<Recommendation> {
    return prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        processed: true,
        processedAt: new Date(),
        forumPostId,
        forumThreadId
      }
    });
  }

  /**
   * Record processing error
   */
  async recordError(
    recommendationId: string,
    error: string
  ): Promise<Recommendation> {
    const current = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });

    return prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        processingError: error,
        processingAttempts: (current?.processingAttempts || 0) + 1
      }
    });
  }

  /**
   * Get unprocessed recommendations
   */
  async getUnprocessed(limit: number = 10): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      where: {
        processed: false,
        processingAttempts: { lt: 3 } // Max 3 retry attempts
      },
      take: limit,
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Search recommendations by content type and topics
   */
  async search(filters: {
    contentType?: string;
    topics?: string[];
    limit?: number;
  }): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      where: {
        processed: true,
        ...(filters.contentType && { contentType: filters.contentType }),
        ...(filters.topics && {
          topics: {
            hasSome: filters.topics
          }
        })
      },
      take: filters.limit || 20,
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const recommendationService = new RecommendationService();

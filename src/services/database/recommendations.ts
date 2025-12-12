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
  duration?: string | null;
  qualityScore?: number;
  sentiment?: string;
  aiSummary?: string;
  thumbnail?: string | null;
  // Multi-library classification
  libraryType?: string;
  primaryTag?: string;
  secondaryTags?: string[];
}

export class RecommendationService {
  /**
   * Create a new recommendation record
   */
  async create(data: CreateRecommendationData): Promise<Recommendation> {
    return prisma.recommendation.create({
      data,
    });
  }

  /**
   * Find recommendation by original message ID
   */
  async findByMessageId(messageId: string): Promise<Recommendation | null> {
    return prisma.recommendation.findUnique({
      where: { originalMessageId: messageId },
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
      data: metadata,
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
        forumThreadId,
      },
    });
  }

  /**
   * Record processing error
   */
  async recordError(recommendationId: string, error: string): Promise<Recommendation> {
    const current = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    return prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        processingError: error,
        processingAttempts: (current?.processingAttempts || 0) + 1,
      },
    });
  }

  /**
   * Get unprocessed recommendations
   */
  async getUnprocessed(limit: number = 10): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      where: {
        processed: false,
        processingAttempts: { lt: 3 }, // Max 3 retry attempts
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Search recommendations by content type, topics, and library
   */
  async search(filters: {
    contentType?: string;
    topics?: string[];
    libraryType?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      where: {
        processed: true,
        ...(filters.contentType && { contentType: filters.contentType }),
        ...(filters.libraryType && { libraryType: filters.libraryType }),
        ...(filters.topics && {
          topics: {
            hasSome: filters.topics,
          },
        }),
        ...(filters.tags && {
          OR: [
            { primaryTag: { in: filters.tags } },
            {
              secondaryTags: {
                hasSome: filters.tags,
              },
            },
          ],
        }),
      },
      take: filters.limit || 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the timestamp of the most recently processed recommendation
   * Used for backfilling missed messages on startup
   */
  async getLastProcessedTimestamp(): Promise<Date | null> {
    const latest = await prisma.recommendation.findFirst({
      where: { processed: true },
      orderBy: { processedAt: 'desc' },
      select: { processedAt: true },
    });

    return latest?.processedAt || null;
  }

  /**
   * Bulk check which message IDs already exist in the database
   * Returns a Set of existing message IDs for efficient lookup
   */
  async findExistingMessageIds(messageIds: string[]): Promise<Set<string>> {
    if (messageIds.length === 0) {
      return new Set();
    }

    const existing = await prisma.recommendation.findMany({
      where: { originalMessageId: { in: messageIds } },
      select: { originalMessageId: true },
    });

    return new Set(existing.map((r) => r.originalMessageId));
  }

  /**
   * Check if a URL already exists in the database
   * Used for duplicate detection during bulk imports
   */
  async urlExists(url: string): Promise<boolean> {
    const count = await prisma.recommendation.count({
      where: { url },
    });

    return count > 0;
  }

  /**
   * Bulk check which URLs already exist in the database
   * Returns a Set of existing URLs for efficient lookup
   */
  async findExistingUrls(urls: string[]): Promise<Set<string>> {
    if (urls.length === 0) {
      return new Set();
    }

    const existing = await prisma.recommendation.findMany({
      where: { url: { in: urls } },
      select: { url: true },
    });

    return new Set(existing.map((r) => r.url));
  }
}

export const recommendationService = new RecommendationService();

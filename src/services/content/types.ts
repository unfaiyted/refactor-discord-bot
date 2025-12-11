/**
 * Content extraction types and interfaces
 */

export type ContentType = 'youtube' | 'book' | 'article' | 'podcast' | 'audiobook' | 'other';

export interface ExtractedContent {
  type: ContentType;
  title: string;
  content: string;
  url: string;
  metadata?: ContentMetadata;
  cached?: boolean;
}

export interface ContentMetadata {
  author?: string;
  duration?: number | string;
  publishedTime?: string;
  description?: string;
  thumbnail?: string;
  viewCount?: number;
  channelName?: string;
  transcribed?: boolean;
  [key: string]: any;
}

export interface ContentAnalysis {
  summary: string;
  keyTakeaways: string[];
  mainIdeas: string[];
  topics: string[];
  actionableInsights?: string[];
  tldr: string;
  contentType: string;
  sentiment: 'positive' | 'neutral' | 'critical' | 'informative';
  qualityScore: number;
  duration?: string;
}

export class ContentExtractionError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ContentExtractionError';
  }
}

/**
 * Type definitions for the recommendations feature
 */

export type ContentType = 'video' | 'podcast' | 'article' | 'book' | 'tool' | 'course' | 'other';

export type Sentiment = 'positive' | 'neutral' | 'critical' | 'informative';

export interface RecommendationData {
  url: string;
  messageId: string;
  channelId: string;
  content: string;
  authorId: string;
  authorTag: string;
}

export interface MetadataExtraction {
  title: string;
  description: string;
  contentType: ContentType;
  topics: string[];
  duration: string | null;
  qualityScore: number;
  sentiment: Sentiment;
  summary: string;
}

export interface ForumPostData {
  threadId: string;
  postId: string;
  url: string;
}

import { YouTubeExtractor, youtubeExtractor } from './youtube-extractor.js';
import { ArticleExtractor, articleExtractor } from './article-extractor.js';
import { PodcastExtractor, podcastExtractor } from './podcast-extractor.js';
import { AudiobookExtractor, audiobookExtractor } from './audiobook-extractor.js';
import { logger } from '@utils/logger.js';
import type { ExtractedContent } from './types.js';
import { ContentExtractionError } from './types.js';

/**
 * Unified content extractor that routes to appropriate extractor
 */
export class ContentExtractor {
  /**
   * Extract content from any supported URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    logger.info('Extracting content', { url });

    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      // Route to appropriate extractor
      if (YouTubeExtractor.isYouTubeUrl(normalizedUrl)) {
        logger.debug('Routing to YouTube extractor');
        return await youtubeExtractor.extract(normalizedUrl);
      }

      if (AudiobookExtractor.isAudiobookUrl(normalizedUrl)) {
        logger.debug('Routing to audiobook extractor');
        return await audiobookExtractor.extract(normalizedUrl);
      }

      if (PodcastExtractor.isPodcastUrl(normalizedUrl)) {
        logger.debug('Routing to podcast extractor');
        return await podcastExtractor.extract(normalizedUrl);
      }

      if (ArticleExtractor.isArticleUrl(normalizedUrl)) {
        logger.debug('Routing to article extractor');
        return await articleExtractor.extract(normalizedUrl);
      }

      // Fallback: try article extractor for unknown types
      logger.warn('Unknown URL type, attempting article extraction', { url });
      return await articleExtractor.extract(normalizedUrl);
    } catch (error) {
      logger.error('Content extraction failed', {
        url,
        error,
      });

      if (error instanceof ContentExtractionError) {
        throw error;
      }

      throw new ContentExtractionError(
        `Failed to extract content: ${(error as Error).message}`,
        url,
        error as Error
      );
    }
  }

  /**
   * Normalize URL for processing
   */
  private normalizeUrl(url: string): string {
    try {
      // Remove tracking parameters from YouTube URLs
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }

      // For other URLs, just ensure they have a protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }

      return url;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Detect content type from URL without extracting
   */
  detectType(url: string): 'youtube' | 'audiobook' | 'podcast' | 'article' | 'other' {
    if (YouTubeExtractor.isYouTubeUrl(url)) {
      return 'youtube';
    }
    if (AudiobookExtractor.isAudiobookUrl(url)) {
      return 'audiobook';
    }
    if (PodcastExtractor.isPodcastUrl(url)) {
      return 'podcast';
    }
    if (ArticleExtractor.isArticleUrl(url)) {
      return 'article';
    }
    return 'other';
  }
}

// Export singleton instance
export const contentExtractor = new ContentExtractor();

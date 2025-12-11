import { Innertube } from 'youtubei.js';
import { logger } from '@utils/logger.js';
import type { ExtractedContent, ContentMetadata } from './types.js';
import { ContentExtractionError } from './types.js';

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * YouTube content extractor using youtubei.js
 */
export class YouTubeExtractor {
  private youtube: Innertube | null = null;

  /**
   * Initialize YouTube client (lazy loaded)
   */
  private async getClient(): Promise<Innertube> {
    if (!this.youtube) {
      logger.debug('Initializing YouTube client');
      this.youtube = await Innertube.create();
    }
    return this.youtube;
  }

  /**
   * Extract content from YouTube URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    const videoId = extractVideoId(url);

    if (!videoId) {
      throw new ContentExtractionError('Invalid YouTube URL', url);
    }

    logger.debug('Extracting YouTube content', { videoId });

    try {
      const client = await this.getClient();
      const info = await client.getInfo(videoId);

      // Extract basic metadata
      const metadata: ContentMetadata = {
        author: info.basic_info.author || undefined,
        channelName: info.basic_info.channel?.name || undefined,
        duration: info.basic_info.duration || undefined,
        viewCount: info.basic_info.view_count || undefined,
        description: info.basic_info.short_description || undefined,
        thumbnail: info.basic_info.thumbnail?.[0]?.url || undefined,
        publishedTime: info.basic_info.publish_date || undefined,
      };

      // Try to get transcript
      let content: string;
      let transcribed = false;

      try {
        logger.debug('Attempting to fetch transcript', { videoId });
        const transcriptData = await info.getTranscript();

        if (transcriptData?.transcript?.content?.body?.initial_segments) {
          content = transcriptData.transcript.content.body.initial_segments
            .map((segment: any) => segment.snippet.text)
            .join(' ');

          logger.info('Successfully extracted YouTube transcript', {
            videoId,
            contentLength: content.length,
          });
        } else {
          throw new Error('Transcript structure unexpected');
        }
      } catch (transcriptError) {
        // Fallback to description if transcript unavailable
        logger.warn('Transcript unavailable, using description', {
          videoId,
          error: (transcriptError as Error).message,
        });

        content =
          info.basic_info.short_description ||
          `Video: ${info.basic_info.title}\nChannel: ${metadata.channelName}\nDescription not available.`;
        transcribed = false;
        metadata.transcribed = false;
      }

      return {
        type: 'youtube',
        title: info.basic_info.title || `YouTube Video ${videoId}`,
        content,
        url,
        metadata: {
          ...metadata,
          transcribed,
        },
      };
    } catch (error) {
      logger.error('Failed to extract YouTube content', {
        videoId,
        error,
      });

      throw new ContentExtractionError(
        `Failed to extract YouTube content: ${(error as Error).message}`,
        url,
        error as Error
      );
    }
  }

  /**
   * Check if URL is a YouTube URL
   */
  static isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be') || extractVideoId(url) !== null;
  }
}

// Export singleton instance
export const youtubeExtractor = new YouTubeExtractor();

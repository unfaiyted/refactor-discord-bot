import { JSDOM } from 'jsdom';
import { logger } from '@utils/logger.js';
import type { ExtractedContent, ContentMetadata } from './types.js';
import { ContentExtractionError } from './types.js';

/**
 * Podcast content extractor
 * Extracts metadata from podcast pages (PocketCasts, Apple Podcasts, Spotify, etc.)
 */
export class PodcastExtractor {
  /**
   * Extract content from podcast URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    logger.debug('Extracting podcast content', { url });

    try {
      // Special handling for Spotify - use oEmbed API
      if (url.includes('spotify.com')) {
        return await this.extractSpotifyOembed(url);
      }

      // For non-Spotify podcasts, use HTML parsing
      return await this.extractFromHtml(url);
    } catch (error) {
      logger.error('Failed to extract podcast', {
        url,
        error,
      });

      throw new ContentExtractionError(
        `Failed to extract podcast: ${(error as Error).message}`,
        url,
        error as Error
      );
    }
  }

  /**
   * Get meta tag content by property or name
   */
  private getMetaContent(document: Document, property: string): string | undefined {
    const byProperty = document.querySelector(`meta[property="${property}"]`);
    const byName = document.querySelector(`meta[name="${property}"]`);

    return byProperty?.getAttribute('content') || byName?.getAttribute('content') || undefined;
  }

  /**
   * Try to extract podcast name from various sources
   */
  private extractPodcastName(document: Document): string | undefined {
    // Try various selectors that might contain podcast name
    const selectors = ['.podcast-title', '.show-title', '[itemprop="name"]', 'h1', 'h2'];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  /**
   * Extract Spotify podcast using oEmbed API
   * https://developer.spotify.com/documentation/embeds/references/oembed
   */
  private async extractSpotifyOembed(url: string): Promise<ExtractedContent> {
    logger.debug('Using Spotify oEmbed API', { url });

    try {
      // Spotify oEmbed endpoint
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;

      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error(`Spotify oEmbed API returned ${response.status}`);
      }

      const data = await response.json();

      logger.debug('Spotify oEmbed response', {
        title: data.title,
        thumbnailUrl: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height,
      });

      // Extract podcast name from title (usually in format "Episode Name - Show Name")
      const titleParts = data.title?.split(' - ') || [];
      const episodeTitle = titleParts[0] || data.title || 'Spotify Podcast Episode';
      const podcastName = titleParts.length > 1 ? titleParts.slice(1).join(' - ') : 'Spotify';

      const metadata: ContentMetadata = {
        description: '', // Spotify oEmbed doesn't provide description
        thumbnail: data.thumbnail_url,
        author: podcastName,
      };

      logger.info('Successfully extracted Spotify podcast via oEmbed', {
        url,
        title: episodeTitle,
        hasThumbnail: !!data.thumbnail_url,
        thumbnailUrl: data.thumbnail_url,
        podcastName,
      });

      return {
        type: 'podcast',
        title: episodeTitle,
        content: `Podcast: ${podcastName}`,
        url,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to extract via Spotify oEmbed, falling back to HTML parsing', {
        url,
        error,
      });

      // Fallback to HTML parsing
      return await this.extractFromHtml(url);
    }
  }

  /**
   * Extract podcast from HTML (fallback method)
   */
  private async extractFromHtml(url: string): Promise<ExtractedContent> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; RefactorBot/1.0; +https://github.com/unfaiyted/refactor-discord-bot)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Extract metadata from meta tags (existing logic)
    const title =
      this.getMetaContent(document, 'og:title') ||
      this.getMetaContent(document, 'twitter:title') ||
      document.querySelector('title')?.textContent ||
      'Podcast Episode';

    const description =
      this.getMetaContent(document, 'og:description') ||
      this.getMetaContent(document, 'twitter:description') ||
      this.getMetaContent(document, 'description') ||
      '';

    // Try multiple image meta tags
    const ogImage = this.getMetaContent(document, 'og:image');
    const twitterImage = this.getMetaContent(document, 'twitter:image');
    const secureImage = this.getMetaContent(document, 'og:image:secure_url');

    let thumbnail = ogImage || twitterImage || secureImage;

    // Make thumbnail URL absolute
    if (thumbnail && !thumbnail.startsWith('http')) {
      try {
        thumbnail = new URL(thumbnail, url).href;
      } catch {
        thumbnail = undefined;
      }
    }

    // Filter out invalid URLs
    if (thumbnail && (thumbnail.endsWith('_') || thumbnail.length < 30)) {
      logger.warn('Discarding invalid thumbnail URL', { thumbnail });
      thumbnail = undefined;
    }

    const podcastName =
      this.getMetaContent(document, 'og:site_name') || this.extractPodcastName(document);

    const duration = this.extractDuration(document);

    let content = description;
    if (podcastName) {
      content = `Podcast: ${podcastName}\n\n${description}`;
    }

    const metadata: ContentMetadata = {
      description,
      thumbnail,
      duration,
      author: podcastName,
    };

    logger.info('Successfully extracted podcast metadata from HTML', {
      url,
      title,
      hasThumbnail: !!thumbnail,
      podcastName,
    });

    return {
      type: 'podcast',
      title,
      content,
      url,
      metadata,
    };
  }

  /**
   * Try to extract episode duration
   */
  private extractDuration(document: Document): string | undefined {
    const durationMeta = this.getMetaContent(document, 'duration');
    if (durationMeta) {
      // Convert seconds to readable format
      const seconds = parseInt(durationMeta, 10);
      if (!isNaN(seconds)) {
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
          return `${minutes} min`;
        } else {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          return `${hours}h ${remainingMinutes}m`;
        }
      }
    }

    // Try to find duration in text content
    const durationText = document.querySelector('[class*="duration"]')?.textContent;
    if (durationText) {
      return durationText.trim();
    }

    return undefined;
  }

  /**
   * Check if URL is a podcast URL
   */
  static isPodcastUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Podcast platforms
      const podcastDomains = [
        'pca.st', // PocketCasts
        'podcasts.apple.com',
        'podcasts.google.com',
        'overcast.fm',
        'pocketcasts.com',
        'castbox.fm',
        'podcastaddict.com',
        'player.fm',
        'tunein.com',
        'stitcher.com',
        'podbean.com',
        'anchor.fm',
        'buzzsprout.com',
        'simplecast.com',
        'transistor.fm',
        'spotify.com', // Spotify podcasts
        'open.spotify.com', // Spotify podcasts (direct links)
      ];

      return podcastDomains.some((domain) => hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const podcastExtractor = new PodcastExtractor();

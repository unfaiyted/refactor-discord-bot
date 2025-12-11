import { JSDOM } from 'jsdom';
import { logger } from '@utils/logger.js';
import type { ExtractedContent, ContentMetadata } from './types.js';
import { ContentExtractionError } from './types.js';

/**
 * Audiobook content extractor
 * Extracts metadata from audiobook pages (Audible, Libro.fm, etc.)
 */
export class AudiobookExtractor {
  /**
   * Extract content from audiobook URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    logger.debug('Extracting audiobook content', { url });

    try {
      // Fetch HTML
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

      // Extract metadata from meta tags and page content
      const title =
        this.getMetaContent(document, 'og:title') ||
        this.getMetaContent(document, 'twitter:title') ||
        document.querySelector('h1')?.textContent ||
        'Audiobook';

      const description =
        this.getMetaContent(document, 'og:description') ||
        this.getMetaContent(document, 'twitter:description') ||
        this.getMetaContent(document, 'description') ||
        '';

      let thumbnail =
        this.getMetaContent(document, 'og:image') || this.getMetaContent(document, 'twitter:image');

      // Make thumbnail URL absolute
      if (thumbnail && !thumbnail.startsWith('http')) {
        try {
          thumbnail = new URL(thumbnail, url).href;
        } catch {
          thumbnail = undefined;
        }
      }

      // Try to extract audiobook-specific metadata
      const author = this.extractAuthor(document);
      const narrator = this.extractNarrator(document);
      const duration = this.extractDuration(document);
      const publisher = this.extractPublisher(document);

      // Combine description with author/narrator
      let content = description;
      if (author) {
        content = `Author: ${author}\n\n${description}`;
      }
      if (narrator) {
        content = `${content}\n\nNarrator: ${narrator}`;
      }

      const metadata: ContentMetadata = {
        description,
        thumbnail,
        duration,
        author,
        narrator,
        publisher,
      };

      logger.info('Successfully extracted audiobook metadata', {
        url,
        title,
        hasThumbnail: !!thumbnail,
        author,
        narrator,
      });

      return {
        type: 'audiobook',
        title,
        content,
        url,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to extract audiobook', {
        url,
        error,
      });

      throw new ContentExtractionError(
        `Failed to extract audiobook: ${(error as Error).message}`,
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
   * Try to extract author name
   */
  private extractAuthor(document: Document): string | undefined {
    // Try various selectors that might contain author name
    const selectors = [
      '.authorLabel a',
      '.bc-author a',
      '[class*="author"]',
      'span[itemprop="author"]',
      'a[itemprop="author"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Try to extract from structured data
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson?.textContent) {
      try {
        const data = JSON.parse(ldJson.textContent);
        if (data.author?.name) {
          return data.author.name;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return undefined;
  }

  /**
   * Try to extract narrator name
   */
  private extractNarrator(document: Document): string | undefined {
    // Try various selectors that might contain narrator name
    const selectors = [
      '.narratorLabel a',
      '.bc-narrator a',
      '[class*="narrator"]',
      'span[itemprop="readBy"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  /**
   * Try to extract audiobook duration/length
   */
  private extractDuration(document: Document): string | undefined {
    const durationMeta = this.getMetaContent(document, 'duration');
    if (durationMeta) {
      // Convert seconds to readable format
      const seconds = parseInt(durationMeta, 10);
      if (!isNaN(seconds)) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes} min`;
        }
      }
    }

    // Try to find duration/length in text content
    const selectors = [
      '.runtimeLabel',
      '[class*="runtime"]',
      '[class*="duration"]',
      '[class*="length"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text && /\d+\s*(hr|hour|min|hrs)/i.test(text)) {
        return text;
      }
    }

    return undefined;
  }

  /**
   * Try to extract publisher
   */
  private extractPublisher(document: Document): string | undefined {
    const selectors = ['.publisherLabel', '[class*="publisher"]', 'span[itemprop="publisher"]'];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  /**
   * Check if URL is an audiobook URL
   */
  static isAudiobookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Audiobook platforms
      const audiobookDomains = [
        'audible.com',
        'audible.ca',
        'audible.co.uk',
        'audible.de',
        'audible.fr',
        'audible.com.au',
        'libro.fm',
        'audiobooks.com',
        'scribd.com',
        'kobo.com',
        'downpour.com',
        'audiobooksnow.com',
        'chirpbooks.com',
        'hoopla.com',
        'everand.com',
      ];

      return audiobookDomains.some((domain) => hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const audiobookExtractor = new AudiobookExtractor();

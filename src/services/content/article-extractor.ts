import { Readability, isProbablyReaderable } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { logger } from '@utils/logger.js';
import type { ExtractedContent, ContentMetadata } from './types.js';
import { ContentExtractionError } from './types.js';

/**
 * Article content extractor using Mozilla Readability
 */
export class ArticleExtractor {
  /**
   * Extract content from article URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    logger.debug('Extracting article content', { url });

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

      // Parse with JSDOM
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Check if it's an article
      if (!isProbablyReaderable(document)) {
        logger.warn('Content may not be an article', { url });
        // Continue anyway - we'll extract what we can
      }

      // Extract article
      const reader = new Readability(document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to parse article content');
      }

      // Try to extract thumbnail from Open Graph or meta tags
      let thumbnail: string | undefined;
      const ogImage = document.querySelector('meta[property="og:image"]');
      const twitterImage = document.querySelector('meta[name="twitter:image"]');

      if (ogImage?.getAttribute('content')) {
        thumbnail = ogImage.getAttribute('content') || undefined;
      } else if (twitterImage?.getAttribute('content')) {
        thumbnail = twitterImage.getAttribute('content') || undefined;
      }

      // Make thumbnail URL absolute if it's relative
      if (thumbnail && !thumbnail.startsWith('http')) {
        try {
          thumbnail = new URL(thumbnail, url).href;
        } catch {
          thumbnail = undefined;
        }
      }

      const metadata: ContentMetadata = {
        author: article.byline || undefined,
        publishedTime: article.publishedTime || undefined,
        description: article.excerpt || undefined,
        thumbnail,
      };

      // Validate required fields
      if (!article.title || !article.textContent) {
        throw new Error('Article is missing required fields (title or textContent)');
      }

      logger.info('Successfully extracted article', {
        url,
        title: article.title,
        contentLength: article.textContent.length,
      });

      return {
        type: 'article',
        title: article.title,
        content: article.textContent,
        url,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to extract article', {
        url,
        error,
      });

      throw new ContentExtractionError(
        `Failed to extract article: ${(error as Error).message}`,
        url,
        error as Error
      );
    }
  }

  /**
   * Check if URL is likely an article
   * (Simple heuristic - can be improved)
   */
  static isArticleUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Exclude known non-article domains
      const excludedDomains = [
        'youtube.com',
        'youtu.be',
        'spotify.com',
        'twitter.com',
        'x.com',
        'facebook.com',
        'instagram.com',
        'tiktok.com',
      ];

      return !excludedDomains.some((domain) => hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const articleExtractor = new ArticleExtractor();

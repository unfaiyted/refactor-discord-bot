import { JSDOM } from 'jsdom';
import { logger } from '@utils/logger.js';
import type { ExtractedContent, ContentMetadata } from './types.js';
import { ContentExtractionError } from './types.js';

/**
 * Book content extractor
 * Extracts metadata from book pages (Amazon Kindle, Goodreads, etc.)
 */
export class BookExtractor {
  /**
   * Extract content from book URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    logger.debug('Extracting book content', { url });

    try {
      // Follow redirects for short URLs like a.co
      const finalUrl = await this.followRedirects(url);
      logger.debug('Final URL after redirects', { original: url, final: finalUrl });

      // Fetch HTML with proper headers to avoid bot detection
      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url: finalUrl });
      const document = dom.window.document;

      // Extract metadata from meta tags and page content
      const title =
        this.getMetaContent(document, 'og:title') ||
        this.getMetaContent(document, 'twitter:title') ||
        document.querySelector('h1')?.textContent?.trim() ||
        document.querySelector('title')?.textContent?.trim() ||
        'Book';

      const description =
        this.getMetaContent(document, 'og:description') ||
        this.getMetaContent(document, 'twitter:description') ||
        this.getMetaContent(document, 'description') ||
        '';

      let thumbnail =
        this.getMetaContent(document, 'og:image') ||
        this.getMetaContent(document, 'twitter:image') ||
        this.getMetaContent(document, 'image');

      // Make thumbnail URL absolute
      if (thumbnail && !thumbnail.startsWith('http')) {
        try {
          thumbnail = new URL(thumbnail, finalUrl).href;
        } catch {
          thumbnail = undefined;
        }
      }

      // Try to extract book-specific metadata
      const author = this.extractAuthor(document);
      const publisher = this.extractPublisher(document);
      const publicationDate = this.extractPublicationDate(document);
      const isbn = this.extractISBN(document);
      const rating = this.extractRating(document);
      const pageCount = this.extractPageCount(document);

      // Build content with author info
      let content = description;
      if (author) {
        content = `Author: ${author}\n\n${description}`;
      }
      if (publicationDate) {
        content = `${content}\n\nPublished: ${publicationDate}`;
      }

      const metadata: ContentMetadata = {
        description,
        thumbnail,
        author,
        publisher,
        isbn,
        rating,
        pageCount,
        publicationDate,
      };

      logger.info('Successfully extracted book metadata', {
        url: finalUrl,
        title,
        hasThumbnail: !!thumbnail,
        author,
        isbn,
      });

      return {
        type: 'book',
        title,
        content,
        url: finalUrl,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to extract book', {
        url,
        error,
      });

      throw new ContentExtractionError(
        `Failed to extract book: ${(error as Error).message}`,
        url,
        error as Error
      );
    }
  }

  /**
   * Follow redirects to get final URL (for a.co short URLs)
   */
  private async followRedirects(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      return response.url;
    } catch {
      // If HEAD fails, return original URL
      return url;
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
      '.author a',
      '.contributorNameID',
      'span[itemprop="author"]',
      'a[itemprop="author"]',
      '[data-asin] .author',
      '.by-line a.contributorNameID',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Try to extract from structured data (ld+json)
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson?.textContent) {
      try {
        const data = JSON.parse(ldJson.textContent);
        if (data.author?.name) {
          return data.author.name;
        } else if (Array.isArray(data.author) && data.author[0]?.name) {
          return data.author[0].name;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return undefined;
  }

  /**
   * Try to extract publisher
   */
  private extractPublisher(document: Document): string | undefined {
    const selectors = [
      '[data-feature-name="bylineInfo"] .author + span',
      'span[itemprop="publisher"]',
      '.publication-info .publisher',
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
   * Try to extract publication date
   */
  private extractPublicationDate(document: Document): string | undefined {
    const selectors = [
      '[data-feature-name="bylineInfo"]',
      '.publication-info .date',
      'span[itemprop="datePublished"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent;
      if (text) {
        // Try to find a date pattern
        const dateMatch = text.match(/\b\w+\s+\d{1,2},\s+\d{4}\b/);
        if (dateMatch) {
          return dateMatch[0];
        }
      }
    }

    return undefined;
  }

  /**
   * Try to extract ISBN
   */
  private extractISBN(document: Document): string | undefined {
    // Check if URL contains ASIN/ISBN
    const urlMatch = document.location?.href.match(/\/dp\/([A-Z0-9]{10})/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try to find in page content
    const selectors = ['[itemprop="isbn"]', '.isbn'];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  /**
   * Try to extract rating
   */
  private extractRating(document: Document): string | undefined {
    const selectors = [
      '[data-hook="rating-out-of-text"]',
      '.a-icon-star .a-icon-alt',
      'span[itemprop="ratingValue"]',
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
   * Try to extract page count
   */
  private extractPageCount(document: Document): string | undefined {
    const selectors = ['.pageCount', '[itemprop="numberOfPages"]'];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Try to find "X pages" in text
    const pageText = document.body.textContent;
    if (pageText) {
      const pageMatch = pageText.match(/(\d+)\s+pages/i);
      if (pageMatch) {
        return `${pageMatch[1]} pages`;
      }
    }

    return undefined;
  }

  /**
   * Check if URL is a book URL
   */
  static isBookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      // Amazon Kindle sharing URLs (read.amazon.com)
      if (hostname.includes('read.amazon.com')) {
        return pathname.includes('/kp/') || pathname.includes('/kshare');
      }

      // Amazon book URLs (including all regional sites)
      if (
        hostname.includes('amazon.com') ||
        hostname.includes('amazon.ca') ||
        hostname.includes('amazon.co.uk') ||
        hostname.includes('amazon.de') ||
        hostname.includes('amazon.fr') ||
        hostname.includes('amazon.co.jp') ||
        hostname.includes('amazon.in') ||
        hostname.includes('amazon.com.au') ||
        hostname.includes('amazon.it') ||
        hostname.includes('amazon.es') ||
        hostname.includes('a.co') || // Amazon short URLs
        hostname.includes('amzn.to') || // Another Amazon short URL format
        hostname.includes('amzn.com') // Amazon short URLs
      ) {
        // Check if it's a book (has /dp/ or /gp/product/)
        // or just assume all Amazon URLs from short links are books
        return (
          pathname.includes('/dp/') ||
          pathname.includes('/gp/product/') ||
          hostname.includes('a.co') ||
          hostname.includes('amzn.')
        );
      }

      // Goodreads (all URL formats)
      if (hostname.includes('goodreads.com')) {
        return (
          pathname.includes('/book/') ||
          pathname.includes('/show/') ||
          pathname.match(/\/\d+/) !== null // Book ID in path
        );
      }

      // Other book platforms
      const bookDomains = [
        'barnesandnoble.com',
        'bookshop.org',
        'chapters.indigo.ca',
        'waterstones.com',
        'kobo.com',
        'books.apple.com',
        'play.google.com/store/books',
      ];

      return bookDomains.some((domain) => hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const bookExtractor = new BookExtractor();

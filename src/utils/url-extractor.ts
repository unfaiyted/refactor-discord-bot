/**
 * URL extraction and validation utilities
 */

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export interface ExtractedURL {
  url: string;
  type: 'youtube' | 'spotify' | 'article' | 'podcast' | 'github' | 'other';
}

/**
 * Extract all URLs from a text message
 */
export function extractURLs(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Determine content type from URL
 */
export function detectContentType(url: string): ExtractedURL['type'] {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }

    // Spotify
    if (hostname.includes('spotify.com')) {
      return 'spotify';
    }

    // GitHub
    if (hostname.includes('github.com')) {
      return 'github';
    }

    // Podcast platforms
    if (
      hostname.includes('podcasts.apple.com') ||
      hostname.includes('podcasts.google.com') ||
      hostname.includes('overcast.fm') ||
      hostname.includes('pocketcasts.com') ||
      hostname.includes('castbox.fm')
    ) {
      return 'podcast';
    }

    // Default to article
    return 'article';
  } catch {
    return 'other';
  }
}

/**
 * Extract URLs with detected types
 */
export function extractURLsWithTypes(text: string): ExtractedURL[] {
  const urls = extractURLs(text);
  return urls.map(url => ({
    url,
    type: detectContentType(url)
  }));
}

/**
 * Validate if a URL is accessible
 */
export async function validateURL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

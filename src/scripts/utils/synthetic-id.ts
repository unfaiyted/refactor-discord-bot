import { createHash } from 'crypto';

/**
 * Generate a synthetic message ID from a URL for bulk imports
 * Uses SHA-256 hash to ensure consistency across runs
 *
 * @param url - The URL to generate an ID for
 * @returns A synthetic message ID in format: bulk-{hash16}
 *
 * @example
 * generateSyntheticMessageId('https://example.com/article')
 * // Returns: 'bulk-a1b2c3d4e5f6g7h8'
 */
export function generateSyntheticMessageId(url: string): string {
  // Normalize URL to ensure consistent hashing
  const normalizedUrl = url.trim().toLowerCase();

  // Generate SHA-256 hash and take first 16 characters
  const hash = createHash('sha256').update(normalizedUrl).digest('hex').substring(0, 16);

  return `bulk-${hash}`;
}

/**
 * Check if a message ID is a synthetic bulk import ID
 */
export function isSyntheticMessageId(messageId: string): boolean {
  return messageId.startsWith('bulk-');
}

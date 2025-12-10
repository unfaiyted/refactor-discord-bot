import { Database } from 'bun:sqlite';
import { logger } from '@utils/logger.js';

/**
 * Fast SQLite cache using Bun's built-in sqlite
 * Used for caching channel configs, rate limits, and temporary data
 */
class SQLiteCache {
  private db: Database;

  constructor(filename: string = 'cache.db') {
    this.db = new Database(filename, { create: true });
    this.initialize();
  }

  /**
   * Initialize cache tables
   */
  private initialize(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_expires_at ON cache(expires_at)
    `);

    logger.info('SQLite cache initialized');
  }

  /**
   * Set a cache value with optional TTL (in seconds)
   */
  set(key: string, value: any, ttl?: number): void {
    const valueStr = JSON.stringify(value);
    const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;

    this.db.run(
      'INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)',
      [key, valueStr, expiresAt]
    );
  }

  /**
   * Get a cache value
   */
  get<T = any>(key: string): T | null {
    const row = this.db.query(
      'SELECT value, expires_at FROM cache WHERE key = ?'
    ).get(key) as { value: string; expires_at: number | null } | null;

    if (!row) {
      return null;
    }

    // Check if expired
    if (row.expires_at && Date.now() > row.expires_at) {
      this.delete(key);
      return null;
    }

    return JSON.parse(row.value);
  }

  /**
   * Delete a cache value
   */
  delete(key: string): void {
    this.db.run('DELETE FROM cache WHERE key = ?', [key]);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.db.run('DELETE FROM cache');
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    this.db.run('DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at < ?', [Date.now()]);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

export const cache = new SQLiteCache();

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  cache.clearExpired();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  cache.close();
});

process.on('SIGTERM', () => {
  cache.close();
});

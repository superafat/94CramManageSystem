/**
 * Storage Manager for offline data caching and synchronization
 */

import { db } from './db';

export interface CacheMeta {
  key: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version?: number;
}

export interface PendingSync {
  id?: number;
  action: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  endpoint: string;
  createdAt: number;
  retryCount?: number;
}

class StorageManager {
  private readonly DEFAULT_TTL = 1000 * 60 * 60; // 1 hour
  private readonly MAX_RETRY = 3;

  /**
   * Cache data with TTL
   */
  async cacheData<T>(key: string, data: T, ttl = this.DEFAULT_TTL): Promise<void> {
    const meta: CacheMeta = {
      key,
      timestamp: Date.now(),
      ttl,
      version: 1
    };

    await db.put('cache-meta', meta);
    
    // Determine which store to use based on key
    const storeName = this.getStoreFromKey(key);
    if (storeName) {
      if (Array.isArray(data)) {
        await Promise.all(data.map(item => db.put(storeName, item)));
      } else {
        await db.put(storeName, data);
      }
    }
  }

  /**
   * Get cached data if not expired
   */
  async getCachedData<T>(key: string): Promise<T[] | null> {
    const meta = await db.get<CacheMeta>('cache-meta', key);
    
    if (!meta) return null;
    
    const isExpired = Date.now() - meta.timestamp > meta.ttl;
    if (isExpired) {
      await this.invalidateCache(key);
      return null;
    }

    const storeName = this.getStoreFromKey(key);
    if (!storeName) return null;

    return await db.getAll<T>(storeName);
  }

  /**
   * Check if cache is valid
   */
  async isCacheValid(key: string): Promise<boolean> {
    const meta = await db.get<CacheMeta>('cache-meta', key);
    if (!meta) return false;
    
    return Date.now() - meta.timestamp <= meta.ttl;
  }

  /**
   * Invalidate cache by key
   */
  async invalidateCache(key: string): Promise<void> {
    await db.delete('cache-meta', key);
  }

  /**
   * Clear all expired cache
   */
  async clearExpiredCache(): Promise<void> {
    const allMeta = await db.getAll<CacheMeta>('cache-meta');
    const now = Date.now();

    for (const meta of allMeta) {
      if (now - meta.timestamp > meta.ttl) {
        await this.invalidateCache(meta.key);
      }
    }
  }

  /**
   * Add pending sync operation
   */
  async addPendingSync(sync: Omit<PendingSync, 'id' | 'createdAt'>): Promise<void> {
    const pendingSync: PendingSync = {
      ...sync,
      createdAt: Date.now(),
      retryCount: 0
    };

    await db.add('pending-sync', pendingSync);
  }

  /**
   * Get all pending sync operations
   */
  async getPendingSyncs(): Promise<PendingSync[]> {
    return await db.getAll<PendingSync>('pending-sync');
  }

  /**
   * Remove pending sync operation
   */
  async removePendingSync(id: number): Promise<void> {
    await db.delete('pending-sync', id);
  }

  /**
   * Process all pending syncs
   */
  async processPendingSyncs(
    onSync: (sync: PendingSync) => Promise<boolean>
  ): Promise<{ success: number; failed: number }> {
    const syncs = await this.getPendingSyncs();
    let success = 0;
    let failed = 0;

    for (const sync of syncs) {
      try {
        const result = await onSync(sync);
        if (result && sync.id) {
          await this.removePendingSync(sync.id);
          success++;
        } else {
          // Increment retry count
          if (sync.retryCount !== undefined && sync.retryCount < this.MAX_RETRY) {
            await db.put('pending-sync', { ...sync, retryCount: sync.retryCount + 1 });
          } else if (sync.id) {
            // Max retries reached, remove
            await this.removePendingSync(sync.id);
          }
          failed++;
        }
      } catch (error) {
        console.error('Error processing sync:', error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Clear all data (e.g., on logout)
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      db.clear('students'),
      db.clear('schedules'),
      db.clear('alerts'),
      db.clear('cache-meta'),
      db.clear('pending-sync')
    ]);
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const [students, schedules, alerts, cacheMeta, pendingSync] = await Promise.all([
      db.count('students'),
      db.count('schedules'),
      db.count('alerts'),
      db.count('cache-meta'),
      db.count('pending-sync')
    ]);

    return {
      students,
      schedules,
      alerts,
      cacheMeta,
      pendingSync,
      total: students + schedules + alerts + cacheMeta + pendingSync
    };
  }

  /**
   * Determine store name from cache key
   */
  private getStoreFromKey(key: string): string | null {
    if (key.includes('students')) return 'students';
    if (key.includes('schedule')) return 'schedules';
    if (key.includes('alerts')) return 'alerts';
    return null;
  }
}

export const storage = new StorageManager();

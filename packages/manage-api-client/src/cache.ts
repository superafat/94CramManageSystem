import type { CacheItem, CacheConfig } from './types.js';

/**
 * 快取管理器
 */
export class CacheManager {
  private cache = new Map<string, CacheItem>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(config: CacheConfig = {}) {
    this.defaultTTL = config.defaultTTL ?? 60000; // 預設 1 分鐘
    this.maxSize = config.maxSize ?? 100;
  }

  /**
   * 生成快取鍵
   */
  private generateKey(url: string, method: string, params?: Record<string, unknown>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}${paramsStr ? `?${paramsStr}` : ''}`;
  }

  /**
   * 檢查快取是否有效
   */
  private isValid(item: CacheItem): boolean {
    const now = Date.now();
    return now - item.timestamp < item.ttl;
  }

  /**
   * 清理過期快取
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp >= item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 限制快取大小
   */
  private enforceMaxSize(): void {
    if (this.cache.size > this.maxSize) {
      // 刪除最舊的項目
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * 獲取快取
   */
  get<T>(url: string, method: string, params?: Record<string, unknown>): T | null {
    this.cleanup();
    const key = this.generateKey(url, method, params);
    const item = this.cache.get(key);

    if (!item || !this.isValid(item)) {
      if (item) {
        this.cache.delete(key);
      }
      return null;
    }

    return item.data as T;
  }

  /**
   * 設置快取
   */
  set<T>(url: string, method: string, data: T, params?: Record<string, unknown>, ttl?: number): void {
    this.cleanup();
    this.enforceMaxSize();

    const key = this.generateKey(url, method, params);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    this.cache.set(key, item);
  }

  /**
   * 刪除快取
   */
  delete(url: string, method: string, params?: Record<string, unknown>): boolean {
    const key = this.generateKey(url, method, params);
    return this.cache.delete(key);
  }

  /**
   * 清空所有快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清空匹配 URL 模式的快取
   */
  clearByPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 獲取快取大小
   */
  size(): number {
    this.cleanup();
    return this.cache.size;
  }
}

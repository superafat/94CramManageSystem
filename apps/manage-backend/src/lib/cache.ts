interface CacheEntry<T> {
  value: T
  expiresAt: number | null
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>>
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(cleanupIntervalMs: number = 60000) {
    this.cache = new Map()
    this.startCleanup(cleanupIntervalMs)
  }

  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, intervalMs)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key)
      }
    }
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null
    this.cache.set(key, { value, expiresAt })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  has(key: string): boolean {
    const value = this.get(key)
    return value !== null
  }

  del(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): string[] {
    const now = Date.now()
    const validKeys: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.expiresAt || entry.expiresAt >= now) {
        validKeys.push(key)
      }
    }
    
    return validKeys
  }

  size(): number {
    return this.keys().length
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

export const defaultCache = new MemoryCache()

interface CacheableOptions {
  ttl?: number
  keyGenerator?: (...args: any[]) => string
  cache?: MemoryCache
}

export function cacheable(options: CacheableOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const cache = options.cache || defaultCache
    const ttl = options.ttl

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${propertyKey}:${JSON.stringify(args)}`

      const cached = cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      const result = await originalMethod.apply(this, args)
      cache.set(cacheKey, result, ttl)
      return result
    }

    return descriptor
  }
}

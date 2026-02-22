/**
 * Cache Strategy Interface and Implementations
 */

export interface CacheStrategy {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * In-Memory Cache Strategy
 * Simple LRU-like cache with TTL support
 */
export class MemoryCacheStrategy implements CacheStrategy {
  private cache: Map<string, { value: string; expiry: number | null }>
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    const expiry = ttl ? Date.now() + ttl * 1000 : null
    this.cache.set(key, { value, expiry })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  getSize(): number {
    return this.cache.size
  }
}

/**
 * No-Op Cache Strategy
 * Useful for disabling cache in development or testing
 */
export class NoOpCacheStrategy implements CacheStrategy {
  async get(_key: string): Promise<string | null> {
    return null
  }

  async set(_key: string, _value: string, _ttl?: number): Promise<void> {
    // Do nothing
  }

  async delete(_key: string): Promise<void> {
    // Do nothing
  }

  async clear(): Promise<void> {
    // Do nothing
  }
}

/**
 * Layered Cache Strategy
 * Combines multiple cache layers (e.g., memory + Redis)
 */
export class LayeredCacheStrategy implements CacheStrategy {
  private layers: CacheStrategy[]

  constructor(layers: CacheStrategy[]) {
    this.layers = layers
  }

  async get(key: string): Promise<string | null> {
    for (let i = 0; i < this.layers.length; i++) {
      const value = await this.layers[i].get(key)
      
      if (value !== null) {
        // Backfill previous layers
        for (let j = 0; j < i; j++) {
          await this.layers[j].set(key, value)
        }
        return value
      }
    }

    return null
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await Promise.all(
      this.layers.map(layer => layer.set(key, value, ttl))
    )
  }

  async delete(key: string): Promise<void> {
    await Promise.all(
      this.layers.map(layer => layer.delete(key))
    )
  }

  async clear(): Promise<void> {
    await Promise.all(
      this.layers.map(layer => layer.clear())
    )
  }
}

/**
 * Factory function to create cache strategy based on configuration
 */
export function createCacheStrategy(
  type: 'memory' | 'noop' | 'layered',
  options?: {
    maxSize?: number
    layers?: CacheStrategy[]
  }
): CacheStrategy {
  switch (type) {
    case 'memory':
      return new MemoryCacheStrategy(options?.maxSize)
    case 'noop':
      return new NoOpCacheStrategy()
    case 'layered':
      if (!options?.layers || options.layers.length === 0) {
        throw new Error('Layered cache requires at least one layer')
      }
      return new LayeredCacheStrategy(options.layers)
    default:
      throw new Error(`Unknown cache strategy type: ${type}`)
  }
}

import { logger } from './logger'

export interface BatchOptions<T = unknown> {
  batchSize?: number
  maxConcurrent?: number
  onProgress?: (completed: number, total: number) => void
  onError?: (error: Error, item: T, index: number) => void
}

export interface BatchResult<T, R> {
  success: R[]
  failed: Array<{ item: T; index: number; error: Error }>
  total: number
  successCount: number
  failedCount: number
}

/**
 * Process items in batches with concurrency control
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions<T> = {}
): Promise<BatchResult<T, R>> {
  const {
    batchSize = 10,
    maxConcurrent = 5,
    onProgress,
    onError,
  } = options

  const total = items.length
  const success: R[] = []
  const failed: Array<{ item: T; index: number; error: Error }> = []
  
  let completed = 0

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length))
    const batchStartIndex = i

    await processWithConcurrency(
      batch,
      async (item, batchIndex) => {
        const globalIndex = batchStartIndex + batchIndex
        try {
          const result = await processor(item, globalIndex)
          success.push(result)
          completed++
          onProgress?.(completed, total)
          return result
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          failed.push({ item, index: globalIndex, error: err })
          completed++
          onProgress?.(completed, total)
          onError?.(err, item, globalIndex)
          logger.error({ err }, `Batch processing failed for item ${globalIndex}`)
          throw err
        }
      },
      maxConcurrent
    )
  }

  return {
    success,
    failed,
    total,
    successCount: success.length,
    failedCount: failed.length,
  }
}

/**
 * Process items with controlled concurrency
 */
export async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  maxConcurrent: number = 5
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const promise = processor(item, i)
      .then(result => {
        results[i] = result
      })
      .catch(error => {
        // Error handling is done in the processor
        results[i] = undefined as unknown as R
      })
      .then(() => {
        executing.splice(executing.indexOf(wrappedPromise), 1)
      })

    const wrappedPromise = promise
    executing.push(wrappedPromise)

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results.filter(r => r !== undefined)
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry,
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay)
        onRetry?.(lastError, attempt + 1)
        logger.warn({ err: lastError }, `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

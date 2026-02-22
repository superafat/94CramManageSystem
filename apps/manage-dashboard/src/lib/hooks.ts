'use client'

import { useState, useEffect, useCallback } from 'react'
import { APIError } from './api'

interface UseAPIOptions<T> {
  initialData?: T
  skip?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseAPIResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  reset: () => void
}

export function useAPI<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseAPIOptions<T> = {}
): UseAPIResult<T> {
  const { initialData, skip = false, onSuccess, onError } = options
  
  const [data, setData] = useState<T | null>(initialData ?? null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (skip) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      console.error('useAPI error:', error)
    } finally {
      setLoading(false)
    }
  }, [skip, ...deps])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const reset = useCallback(() => {
    setData(initialData ?? null)
    setError(null)
    setLoading(false)
  }, [initialData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    reset,
  }
}

// Specialized hook with better error handling
export function useAPIWithRetry<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  maxRetries = 3
): UseAPIResult<T> & { retryCount: number } {
  const [retryCount, setRetryCount] = useState(0)

  const result = useAPI<T>(
    fetcher,
    deps,
    {
      onError: (error) => {
        if (retryCount < maxRetries) {
          console.log(`Retrying... (${retryCount + 1}/${maxRetries})`)
          setTimeout(() => {
            setRetryCount(c => c + 1)
            result.refetch()
          }, 1000 * (retryCount + 1))
        }
      },
    }
  )

  return { ...result, retryCount }
}

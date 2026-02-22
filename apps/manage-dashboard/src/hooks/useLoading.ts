'use client'

import { useState, useCallback } from 'react'

interface UseLoadingOptions {
  initialState?: boolean
  onStart?: () => void
  onEnd?: () => void
}

export function useLoading(options: UseLoadingOptions = {}) {
  const { initialState = false, onStart, onEnd } = options
  const [loading, setLoading] = useState(initialState)

  const startLoading = useCallback(() => {
    setLoading(true)
    onStart?.()
  }, [onStart])

  const stopLoading = useCallback(() => {
    setLoading(false)
    onEnd?.()
  }, [onEnd])

  const toggleLoading = useCallback(() => {
    setLoading((prev) => !prev)
  }, [])

  // Wrap an async function with loading state
  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        startLoading()
        const result = await fn()
        return result
      } finally {
        stopLoading()
      }
    },
    [startLoading, stopLoading]
  )

  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
    withLoading,
    setLoading
  }
}

// 用於多個 loading 狀態的 hook
export function useMultipleLoading(keys: string[]) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  )

  const startLoading = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }))
  }, [])

  const stopLoading = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: false }))
  }, [])

  const isLoading = useCallback(
    (key: string) => loadingStates[key] || false,
    [loadingStates]
  )

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  return {
    loadingStates,
    startLoading,
    stopLoading,
    isLoading,
    isAnyLoading
  }
}

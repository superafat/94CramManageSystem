import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, apiHeaders } from '../App';
import { toast } from '../components/Toast';

interface UseApiOptions extends RequestInit {
  skip?: boolean;
  retry?: boolean;
  cacheTime?: number; // milliseconds
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function useApi<T = unknown>(
  url: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    skip = false,
    retry = true,
    cacheTime = DEFAULT_CACHE_TIME,
    ...fetchOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Store fetchOptions in a ref to avoid triggering re-fetches
  const fetchOptionsRef = useRef(fetchOptions);
  useEffect(() => {
    fetchOptionsRef.current = fetchOptions;
  }, [JSON.stringify(fetchOptions)]);

  const fetchData = useCallback(
    async (isRetry = false): Promise<void> => {
      // Check cache first
      const cacheKey = `${API_BASE}${url}`;
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data as T);
        setLoading(false);
        return;
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const headers = typeof apiHeaders === 'function' ? apiHeaders() : apiHeaders;

        const response = await fetch(`${API_BASE}${url}`, {
          ...fetchOptionsRef.current,
          headers: {
            ...headers,
            ...fetchOptionsRef.current.headers,
          },
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Update cache
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        setData(result);
        setError(null);
        setLoading(false);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          setLoading(false);
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Show toast error
        toast.error(`載入失敗: ${error.message}`);

        // Retry once if enabled and not already retrying
        if (retry && !isRetry) {
          console.log('Retrying request...');
          setTimeout(() => {
            fetchData(true);
          }, 1000);
          return; // Return early - loading stays true for retry
        }
        
        // No retry - set loading false
        setLoading(false);
      }
    },
    [url, cacheTime, retry]
  );

  useEffect(() => {
    if (!skip) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [skip, fetchData]);

  const refetch = useCallback(async () => {
    // Clear cache for this URL
    cache.delete(`${API_BASE}${url}`);
    await fetchData();
  }, [url, fetchData]);

  return { data, loading, error, refetch };
}

// Clear all cache
export function clearApiCache() {
  cache.clear();
}

// Clear specific URL cache
export function clearApiCacheForUrl(url: string) {
  cache.delete(`${API_BASE}${url}`);
}

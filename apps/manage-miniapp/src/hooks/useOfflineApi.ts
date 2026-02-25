/**
 * Enhanced offline-aware API hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, apiHeaders } from '../App';
import { toast } from '../components/Toast';
import { storage } from '../utils/storage';

interface UseApiOptions extends RequestInit {
  skip?: boolean;
  retry?: boolean;
  cacheTime?: number;
  offlineFirst?: boolean; // Try offline cache first
  persistOffline?: boolean; // Persist data to IndexedDB
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isFromCache: boolean;
  mutate: (updater: (prev: T | null) => T | null) => void;
}

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function useOfflineApi<T = any>(
  url: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    skip = false,
    retry = true,
    cacheTime = DEFAULT_CACHE_TIME,
    offlineFirst = false,
    persistOffline = false,
    ...fetchOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchOptionsRef = useRef(fetchOptions);
  useEffect(() => {
    fetchOptionsRef.current = fetchOptions;
  }, [JSON.stringify(fetchOptions)]);

  const fetchData = useCallback(
    async (isRetry = false): Promise<void> => {
      const cacheKey = `${API_BASE}${url}`;
      const isOnline = navigator.onLine;

      // Try memory cache first
      const memoryCached = memoryCache.get(cacheKey);
      if (memoryCached && Date.now() - memoryCached.timestamp < cacheTime) {
        setData(memoryCached.data);
        setIsFromCache(true);
        setLoading(false);
        return;
      }

      // Try IndexedDB cache if offline-first or offline
      if ((offlineFirst || !isOnline) && persistOffline) {
        try {
          const cached = await storage.getCachedData<T>(url);
          if (cached) {
            setData(cached as any);
            setIsFromCache(true);
            setLoading(false);
            
            // If online, still fetch fresh data in background
            if (isOnline && offlineFirst) {
              fetchFromNetwork(cacheKey, true);
            }
            return;
          }
        } catch (err) {
          console.warn('Failed to read from IndexedDB cache:', err);
        }
      }

      // If offline and no cache, show error
      if (!isOnline) {
        const offlineError = new Error('離線模式：無可用快取資料');
        setError(offlineError);
        setLoading(false);
        toast.error(offlineError.message);
        return;
      }

      // Fetch from network
      await fetchFromNetwork(cacheKey, isRetry);
    },
    [url, cacheTime, retry, offlineFirst, persistOffline]
  );

  const fetchFromNetwork = async (cacheKey: string, isRetry: boolean) => {
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
      
      // Update memory cache
      memoryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      // Persist to IndexedDB if enabled
      if (persistOffline) {
        try {
          await storage.cacheData(url, result, cacheTime);
        } catch (err) {
          console.warn('Failed to persist to IndexedDB:', err);
        }
      }

      setData(result);
      setIsFromCache(false);
      setError(null);
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setLoading(false);
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      toast.error(`載入失敗: ${error.message}`);

      if (retry && !isRetry) {
        console.log('Retrying request...');
        setTimeout(() => {
          fetchData(true);
        }, 1000);
        return;
      }
      
      setLoading(false);
    }
  };

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
    memoryCache.delete(`${API_BASE}${url}`);
    await storage.invalidateCache(url);
    await fetchData();
  }, [url, fetchData]);

  const mutate = useCallback((updater: (prev: T | null) => T | null) => {
    setData(prev => updater(prev));
  }, []);

  return { data, loading, error, refetch, isFromCache, mutate };
}

export function clearOfflineApiCache() {
  memoryCache.clear();
}

export function clearOfflineApiCacheForUrl(url: string) {
  memoryCache.delete(`${API_BASE}${url}`);
  storage.invalidateCache(url);
}

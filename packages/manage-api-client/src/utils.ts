import type { RequestConfig } from './types.js';
import { TimeoutError } from './errors.js';

/**
 * 構建完整 URL（包含查詢參數）
 */
export function buildURL(baseURL: string, path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(path, baseURL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

/**
 * 合併 Headers
 */
export function mergeHeaders(...headersList: (HeadersInit | undefined)[]): Headers {
  const merged = new Headers();

  for (const headers of headersList) {
    if (!headers) continue;

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        merged.set(key, value);
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        merged.set(key, value);
      });
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        merged.set(key, value);
      });
    }
  }

  return merged;
}

/**
 * 延遲函數
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 帶超時的 fetch
 */
export async function fetchWithTimeout(
  url: string,
  config: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`請求超時（${timeout}ms）`);
    }
    throw error;
  }
}

/**
 * 重試邏輯
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries: number;
    delay: number;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  const { retries, delay: delayMs, shouldRetry } = options;
  let lastError: Error;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果提供了 shouldRetry 函數，檢查是否應該重試
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // 最後一次嘗試失敗，拋出錯誤
      if (i === retries) {
        throw lastError;
      }

      // 等待後重試
      await delay(delayMs * (i + 1)); // 指數退避
    }
  }

  throw lastError!;
}

/**
 * 判斷是否為 JSON 響應
 */
export function isJSONResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type');
  return contentType?.includes('application/json') ?? false;
}

/**
 * 安全解析 JSON
 */
export async function safeParseJSON<T>(response: Response): Promise<T | null> {
  if (!isJSONResponse(response)) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

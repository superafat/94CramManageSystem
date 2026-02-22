/**
 * HTTP 請求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API 客戶端配置
 */
export interface APIClientConfig {
  /** API 基礎 URL */
  baseURL: string;
  /** 租戶 ID */
  tenantId?: string;
  /** 獲取認證 token 的函數 */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** 請求超時（毫秒） */
  timeout?: number;
  /** 是否啟用快取 */
  enableCache?: boolean;
  /** 快取 TTL（毫秒） */
  cacheTTL?: number;
  /** 是否啟用重試 */
  enableRetry?: boolean;
  /** 重試次數 */
  retryCount?: number;
  /** 重試延遲（毫秒） */
  retryDelay?: number;
}

/**
 * 請求配置
 */
export interface RequestConfig extends Omit<RequestInit, 'body' | 'method'> {
  /** 請求參數（query string） */
  params?: Record<string, string | number | boolean>;
  /** 是否跳過攔截器 */
  skipInterceptors?: boolean;
  /** 是否使用快取 */
  useCache?: boolean;
  /** 是否重試 */
  retry?: boolean;
  /** 超時時間（毫秒） */
  timeout?: number;
}

/**
 * 請求攔截器函數
 */
export type RequestInterceptor = (
  url: string,
  config: RequestInit
) => Promise<{ url: string; config: RequestInit }> | { url: string; config: RequestInit };

/**
 * 響應攔截器函數
 */
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

/**
 * 錯誤攔截器函數
 */
export type ErrorInterceptor = (error: Error) => Promise<never> | never;

/**
 * 快取項目
 */
export interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 快取配置
 */
export interface CacheConfig {
  /** 預設 TTL（毫秒） */
  defaultTTL?: number;
  /** 最大快取數量 */
  maxSize?: number;
}

/**
 * 認證配置
 */
export interface AuthConfig {
  /** Token 類型 */
  tokenType?: 'Bearer' | 'Basic';
  /** Token 儲存鍵名 */
  storageKey?: string;
  /** 是否自動刷新 token */
  autoRefresh?: boolean;
}

/**
 * API 錯誤響應
 */
export interface APIErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
  details?: unknown;
}

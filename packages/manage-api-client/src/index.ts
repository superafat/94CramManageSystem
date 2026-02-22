// 主要類
export { APIClient } from './client.js';
export { CacheManager } from './cache.js';
export { AuthManager } from './auth.js';
export { InterceptorManager } from './interceptors.js';

// 錯誤類
export {
  APIError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  createErrorFromResponse,
} from './errors.js';

// 類型定義
export type {
  HttpMethod,
  APIClientConfig,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  CacheItem,
  CacheConfig,
  AuthConfig,
  APIErrorResponse,
} from './types.js';

// 工具函數
export {
  buildURL,
  mergeHeaders,
  delay,
  fetchWithTimeout,
  retry,
  isJSONResponse,
  safeParseJSON,
} from './utils.js';

import type { APIClientConfig, RequestConfig, HttpMethod } from './types.js';
import { CacheManager } from './cache.js';
import { AuthManager } from './auth.js';
import { InterceptorManager } from './interceptors.js';
import {
  APIError,
  NetworkError,
  createErrorFromResponse,
} from './errors.js';
import {
  buildURL,
  mergeHeaders,
  fetchWithTimeout,
  retry,
  isJSONResponse,
  safeParseJSON,
} from './utils.js';

/**
 * API 客戶端核心類
 */
export class APIClient {
  private baseURL: string;
  private tenantId?: string;
  private timeout: number;
  private enableCache: boolean;
  private enableRetry: boolean;
  private retryCount: number;
  private retryDelay: number;

  private cacheManager: CacheManager;
  private authManager: AuthManager;
  private interceptors: InterceptorManager;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.tenantId = config.tenantId;
    this.timeout = config.timeout ?? 30000; // 預設 30 秒
    this.enableCache = config.enableCache ?? true;
    this.enableRetry = config.enableRetry ?? true;
    this.retryCount = config.retryCount ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    this.cacheManager = new CacheManager({
      defaultTTL: config.cacheTTL ?? 60000, // 預設 1 分鐘
    });

    this.authManager = new AuthManager(config.getAuthToken);
    this.interceptors = new InterceptorManager();

    // 添加預設請求攔截器（添加認證和租戶 headers）
    this.interceptors.addRequestInterceptor(async (url, config) => {
      const headers = mergeHeaders(
        config.headers,
        await this.authManager.getAuthHeader(),
        this.tenantId ? { 'X-Tenant-Id': this.tenantId } : undefined
      );

      return {
        url,
        config: {
          ...config,
          headers,
        },
      };
    });
  }

  /**
   * 設置租戶 ID
   */
  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  /**
   * 獲取租戶 ID
   */
  getTenantId(): string | undefined {
    return this.tenantId;
  }

  /**
   * 添加請求攔截器
   */
  addRequestInterceptor(interceptor: Parameters<InterceptorManager['addRequestInterceptor']>[0]) {
    return this.interceptors.addRequestInterceptor(interceptor);
  }

  /**
   * 添加響應攔截器
   */
  addResponseInterceptor(interceptor: Parameters<InterceptorManager['addResponseInterceptor']>[0]) {
    return this.interceptors.addResponseInterceptor(interceptor);
  }

  /**
   * 添加錯誤攔截器
   */
  addErrorInterceptor(interceptor: Parameters<InterceptorManager['addErrorInterceptor']>[0]) {
    return this.interceptors.addErrorInterceptor(interceptor);
  }

  /**
   * 清空快取
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * 清空匹配模式的快取
   */
  clearCacheByPattern(pattern: string | RegExp): void {
    this.cacheManager.clearByPattern(pattern);
  }

  /**
   * 核心請求方法
   */
  private async _request<T>(
    method: HttpMethod,
    path: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      params,
      skipInterceptors = false,
      useCache = this.enableCache && method === 'GET',
      retry: shouldRetry = this.enableRetry,
      timeout = this.timeout,
      ...fetchConfig
    } = config;

    // 檢查快取
    if (useCache) {
      const cached = this.cacheManager.get<T>(path, method, params);
      if (cached !== null) {
        return cached;
      }
    }

    // 構建請求
    const makeRequest = async (): Promise<T> => {
      let url = buildURL(this.baseURL, path, params);
      let requestConfig: RequestInit = {
        method,
        ...fetchConfig,
        headers: mergeHeaders(
          { 'Content-Type': 'application/json' },
          fetchConfig.headers
        ),
      };

      // 添加請求體
      if (data !== undefined) {
        requestConfig.body = JSON.stringify(data);
      }

      // 執行請求攔截器
      if (!skipInterceptors) {
        const intercepted = await this.interceptors.runRequestInterceptors(url, requestConfig);
        url = intercepted.url;
        requestConfig = intercepted.config;
      }

      // 發送請求
      let response: Response;
      try {
        response = await fetchWithTimeout(url, requestConfig, timeout);
      } catch (error) {
        if (error instanceof Error) {
          throw new NetworkError(error.message);
        }
        throw error;
      }

      // 執行響應攔截器
      if (!skipInterceptors) {
        response = await this.interceptors.runResponseInterceptors(response);
      }

      // 處理錯誤響應
      if (!response.ok) {
        const error = await createErrorFromResponse(response);
        if (!skipInterceptors) {
          await this.interceptors.runErrorInterceptors(error);
        }
        throw error;
      }

      // 解析響應
      let result: T;
      if (isJSONResponse(response)) {
        result = await response.json();
      } else {
        result = (await response.text()) as T;
      }

      // 儲存快取
      if (useCache) {
        this.cacheManager.set(path, method, result, params);
      }

      return result;
    };

    // 執行請求（帶重試）
    try {
      if (shouldRetry) {
        return await retry(makeRequest, {
          retries: this.retryCount,
          delay: this.retryDelay,
          shouldRetry: (error) => {
            if (error instanceof APIError) {
              return error.isRetryable();
            }
            return true;
          },
        });
      } else {
        return await makeRequest();
      }
    } catch (error) {
      if (!skipInterceptors && error instanceof Error) {
        await this.interceptors.runErrorInterceptors(error);
      }
      throw error;
    }
  }

  /**
   * GET 請求
   */
  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this._request<T>('GET', path, undefined, config);
  }

  /**
   * POST 請求
   */
  async post<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this._request<T>('POST', path, data, config);
  }

  /**
   * PUT 請求
   */
  async put<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this._request<T>('PUT', path, data, config);
  }

  /**
   * PATCH 請求
   */
  async patch<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this._request<T>('PATCH', path, data, config);
  }

  /**
   * DELETE 請求
   */
  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this._request<T>('DELETE', path, undefined, config);
  }

  /**
   * 獲取認證狀態
   */
  async isAuthenticated(): Promise<boolean> {
    return this.authManager.isAuthenticated();
  }

  /**
   * 設置認證 token
   */
  setAuthToken(token: string): void {
    this.authManager.setToken(token);
  }

  /**
   * 清除認證 token
   */
  clearAuthToken(): void {
    this.authManager.clearToken();
  }
}

import type { RequestInterceptor, ResponseInterceptor, ErrorInterceptor } from './types.js';

/**
 * 攔截器管理器
 */
export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * 添加請求攔截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 添加響應攔截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 添加錯誤攔截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 執行請求攔截器鏈
   */
  async runRequestInterceptors(
    url: string,
    config: RequestInit
  ): Promise<{ url: string; config: RequestInit }> {
    let result = { url, config };

    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result.url, result.config);
    }

    return result;
  }

  /**
   * 執行響應攔截器鏈
   */
  async runResponseInterceptors(response: Response): Promise<Response> {
    let result = response;

    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result);
    }

    return result;
  }

  /**
   * 執行錯誤攔截器鏈
   */
  async runErrorInterceptors(error: Error): Promise<never> {
    let currentError = error;

    for (const interceptor of this.errorInterceptors) {
      try {
        await interceptor(currentError);
      } catch (err) {
        currentError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw currentError;
  }

  /**
   * 清空所有攔截器
   */
  clear(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
}

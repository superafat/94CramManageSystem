import type { APIErrorResponse } from './types.js';

/**
 * API 請求錯誤基類
 */
export class APIError extends Error {
  public readonly statusCode?: number;
  public readonly response?: Response;
  public readonly data?: unknown;

  constructor(message: string, statusCode?: number, response?: Response, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
    this.data = data;
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * 是否為客戶端錯誤（4xx）
   */
  isClientError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * 是否為伺服器錯誤（5xx）
   */
  isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500;
  }

  /**
   * 是否可重試
   */
  isRetryable(): boolean {
    // 4xx 錯誤不重試（除了 408, 429）
    if (this.statusCode === 408 || this.statusCode === 429) {
      return true;
    }
    if (this.isClientError()) {
      return false;
    }
    // 5xx 錯誤可重試
    return this.isServerError();
  }
}

/**
 * 網路錯誤
 */
export class NetworkError extends APIError {
  constructor(message = '網路連線失敗') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  isRetryable(): boolean {
    return true;
  }
}

/**
 * 超時錯誤
 */
export class TimeoutError extends APIError {
  constructor(message = '請求超時') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  isRetryable(): boolean {
    return true;
  }
}

/**
 * 認證錯誤
 */
export class AuthenticationError extends APIError {
  constructor(message = '認證失敗', statusCode?: number, response?: Response, data?: unknown) {
    super(message, statusCode, response, data);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  isRetryable(): boolean {
    return false;
  }
}

/**
 * 授權錯誤
 */
export class AuthorizationError extends APIError {
  constructor(message = '無權限訪問', statusCode?: number, response?: Response, data?: unknown) {
    super(message, statusCode, response, data);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }

  isRetryable(): boolean {
    return false;
  }
}

/**
 * 驗證錯誤
 */
export class ValidationError extends APIError {
  constructor(message = '資料驗證失敗', statusCode?: number, response?: Response, data?: unknown) {
    super(message, statusCode, response, data);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  isRetryable(): boolean {
    return false;
  }
}

/**
 * 將 HTTP 錯誤響應轉換為對應的錯誤類型
 */
export async function createErrorFromResponse(response: Response): Promise<APIError> {
  let data: APIErrorResponse | undefined;
  let message = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
      if (data && typeof data === 'object' && 'message' in data) {
        message = (data as APIErrorResponse).message || message;
      }
    }
  } catch {
    // 忽略 JSON 解析錯誤
  }

  const statusCode = response.status;

  switch (statusCode) {
    case 401:
      return new AuthenticationError(message, statusCode, response, data);
    case 403:
      return new AuthorizationError(message, statusCode, response, data);
    case 422:
      return new ValidationError(message, statusCode, response, data);
    default:
      return new APIError(message, statusCode, response, data);
  }
}

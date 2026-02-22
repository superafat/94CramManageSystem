import type { AuthConfig } from './types.js';

/**
 * 認證管理器
 */
export class AuthManager {
  private tokenType: string;
  private storageKey: string;
  private getTokenFn?: () => string | null | Promise<string | null>;

  constructor(
    getTokenFn?: () => string | null | Promise<string | null>,
    config: AuthConfig = {}
  ) {
    this.getTokenFn = getTokenFn;
    this.tokenType = config.tokenType ?? 'Bearer';
    this.storageKey = config.storageKey ?? 'auth_token';
  }

  /**
   * 獲取認證 token
   */
  async getToken(): Promise<string | null> {
    if (this.getTokenFn) {
      return await this.getTokenFn();
    }

    // 預設從 localStorage 讀取
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(this.storageKey);
    }

    return null;
  }

  /**
   * 設置認證 token
   */
  setToken(token: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.storageKey, token);
    }
  }

  /**
   * 清除認證 token
   */
  clearToken(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * 獲取認證 header
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getToken();
    if (!token) {
      return {};
    }

    return {
      Authorization: `${this.tokenType} ${token}`,
    };
  }

  /**
   * 檢查是否已認證
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}

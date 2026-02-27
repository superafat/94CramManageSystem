import type { Context } from 'hono';

/**
 * 統一 API 成功回應格式
 */
export function apiSuccess<T>(c: Context, data: T, status = 200) {
  return c.json({ success: true, data }, status as Parameters<typeof c.json>[1]);
}

/**
 * 統一 API 錯誤回應格式
 */
export function apiError(c: Context, message: string, status = 400) {
  return c.json({ success: false, error: message }, status as Parameters<typeof c.json>[1]);
}

import type { Context, Next } from 'hono'

// API 版本常數
export const API_VERSION = {
  V1: 'v1' as const,
  CURRENT: 'v1' as const,
  SUPPORTED: ['v1'] as string[],
  DEPRECATED: [] as string[],
} as const

export type ApiVersion = typeof API_VERSION.V1

// 版本檢查 middleware (Hono)
export async function versionCheck(c: Context, next: Next) {
  const requestedVersion = c.req.header('api-version') || API_VERSION.CURRENT

  // 檢查版本是否支援
  if (!API_VERSION.SUPPORTED.includes(requestedVersion)) {
    return c.json({
      error: 'Unsupported API version',
      requestedVersion,
      supportedVersions: API_VERSION.SUPPORTED,
    }, 400)
  }

  // 檢查版本是否已棄用
  if (API_VERSION.DEPRECATED.includes(requestedVersion)) {
    c.header('X-API-Deprecated', 'true')
    c.header('X-API-Sunset-Date', 'TBD')
  }

  // 設置當前版本到 response header
  c.header('X-API-Version', requestedVersion)

  await next()
}

// 版本資訊端點處理器 (Hono)
export function getVersionInfo(c: Context) {
  return c.json({
    current: API_VERSION.CURRENT,
    supported: API_VERSION.SUPPORTED,
    deprecated: API_VERSION.DEPRECATED,
  })
}

import { getToken, removeToken } from './auth'

// snake_case → camelCase 遞迴轉換
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => (c as string).toUpperCase())
}

function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys)
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [snakeToCamel(k), camelizeKeys(v)])
    )
  }
  return obj
}

export async function platformFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api/platform${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    removeToken()
    window.location.href = '/admin/login'
    throw new Error('未授權')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '請求失敗' }))
    const errObj = error as Record<string, unknown>
    const errMsg = (errObj.error as Record<string, unknown>)?.message || errObj.message || '請求失敗'
    throw new Error(errMsg as string)
  }

  const json = await res.json()
  return camelizeKeys(json) as T
}

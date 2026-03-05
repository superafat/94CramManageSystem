import { getToken, removeToken } from './auth'

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
    throw new Error(error.message || '請求失敗')
  }

  return res.json()
}

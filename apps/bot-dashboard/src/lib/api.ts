const BASE = '/api'

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || res.statusText)
  }
  return res.json()
}

export function apiGet<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path)
}

export function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiDelete<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}

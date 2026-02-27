/**
 * Internal API Helper — 跨系統 API 呼叫
 * 認證方式：X-Internal-Key header
 */

const SERVICE_URLS: Record<string, string> = {
  manage: process.env.MANAGE_API_URL || 'http://localhost:3100',
  inclass: process.env.INCLASS_API_URL || 'http://localhost:3102',
  stock: process.env.STOCK_API_URL || 'http://localhost:3101',
};

export async function internalFetch<T = unknown>(
  service: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = SERVICE_URLS[service];
  if (!baseUrl) throw new Error(`Unknown service: ${service}`);

  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) throw new Error('INTERNAL_API_KEY is not configured');

  const url = `${baseUrl}/api/internal${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-Internal-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Internal API ${service}${path} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

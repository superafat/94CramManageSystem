import { app } from '../app'

// Helper to make test requests against the Hono app
export async function testRequest(method: string, path: string, options?: {
  body?: unknown
  headers?: Record<string, string>
  token?: string
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const init: RequestInit = { method, headers }
  if (options?.body) {
    init.body = JSON.stringify(options.body)
  }

  const res = await app.request(path, init)
  const text = await res.text()
  let json: unknown = undefined
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text, headers: res.headers }
}

// Generate a valid test JWT for stock-backend (uses @94cram/shared sign format)
export async function generateTestToken(payload?: Record<string, unknown>) {
  const { SignJWT } = await import('jose')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  return new SignJWT({
    sub: 'test-user-id',
    userId: 'test-user-id',
    name: 'Test User',
    email: 'test@94cram.com',
    role: 'admin',
    tenantId: '11111111-1111-1111-1111-111111111111',
    systems: ['stock'],
    ...payload,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

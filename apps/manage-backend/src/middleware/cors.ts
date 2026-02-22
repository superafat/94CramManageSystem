import { Context, Next } from 'hono'

// CORS middleware - handles Cross-Origin Resource Sharing
export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header('Origin')
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173']

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    c.res.headers.set('Access-Control-Allow-Origin', origin)
  } else if (allowedOrigins.includes('*')) {
    c.res.headers.set('Access-Control-Allow-Origin', '*')
  }

  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID')
  c.res.headers.set('Access-Control-Allow-Credentials', 'true')
  c.res.headers.set('Access-Control-Max-Age', '86400')

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  await next()
}

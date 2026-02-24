/**
 * API Proxy Route for /api/proxy/[...path]
 * Proxies all requests to the backend BACKEND_URL at runtime
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3100'

type RouteContext = {
  params: Promise<{ path: string[] }>
}

async function handler(req: NextRequest, context: RouteContext) {
  const { path } = await context.params
  const pathStr = path.join('/')
  const targetUrl = `${BACKEND_URL}/${pathStr}`

  const headers: Record<string, string> = {}
  const contentType = req.headers.get('Content-Type')
  if (contentType) headers['Content-Type'] = contentType
  const authHeader = req.headers.get('Authorization')
  if (authHeader) headers['Authorization'] = authHeader
  const tenantHeader = req.headers.get('X-Tenant-Id')
  if (tenantHeader) headers['X-Tenant-Id'] = tenantHeader

  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

  const res = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  })
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
}

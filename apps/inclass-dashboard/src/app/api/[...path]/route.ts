import { NextRequest, NextResponse } from 'next/server'

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
const BACKEND_URL =
  process.env.BACKEND_URL ||
  `https://cram94-inclass-backend-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetPath = '/api/' + path.join('/')
  const url = new URL(targetPath, BACKEND_URL)
  url.search = request.nextUrl.search

  const headers = new Headers()
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

  // Forward Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }

  // Extract token from cookie as fallback
  if (!authHeader) {
    const token = request.cookies.get('token')?.value
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // Forward tenant header
  const tenantId = request.headers.get('X-Tenant-Id')
  if (tenantId) headers.set('X-Tenant-Id', tenantId)

  const init: RequestInit = {
    method: request.method,
    headers,
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    const body = await request.arrayBuffer()
    if (body.byteLength > 0) init.body = body
  }

  try {
    const res = await fetch(url.toString(), init)
    const responseBody = await res.arrayBuffer()
    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
export const PATCH = proxy

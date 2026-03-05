import { NextRequest, NextResponse } from 'next/server'
import { getDemoResponse, DEMO_SUPERADMIN_ID } from '@/lib/demo-data'

const BACKEND_URL = process.env.PORTAL_BACKEND_URL || 'http://localhost:3103'

function isDemoToken(request: NextRequest): boolean {
  try {
    // Try Authorization header first
    let token = ''
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      // Fall back to cookie
      token = request.cookies.get('platform_token')?.value || ''
    }
    if (!token) return false

    // Simple JWT payload decode (base64url decode the middle segment)
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    ) as Record<string, unknown>

    return payload.userId === DEMO_SUPERADMIN_ID
  } catch {
    return false
  }
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const targetPath = '/api/platform/' + path.join('/')

  // Demo mode interception
  if (isDemoToken(request)) {
    let requestBody: Record<string, unknown> | undefined
    if (!['GET', 'HEAD'].includes(request.method)) {
      try {
        requestBody = (await request.clone().json()) as Record<string, unknown>
      } catch {
        // ignore parse errors — body may be empty
      }
    }
    const demoResult = getDemoResponse(
      request.method,
      targetPath,
      request.nextUrl.searchParams,
      requestBody
    )
    if (demoResult) {
      return NextResponse.json(demoResult.body, { status: demoResult.status })
    }
  }

  // Proxy to real backend
  const url = new URL(targetPath, BACKEND_URL)
  url.search = request.nextUrl.search

  const headers = new Headers()
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    headers.set('Authorization', authHeader)
  } else {
    const token = request.cookies.get('platform_token')?.value
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const init: RequestInit = { method: request.method, headers }
  if (!['GET', 'HEAD'].includes(request.method)) {
    const bodyBuf = await request.arrayBuffer()
    if (bodyBuf.byteLength > 0) init.body = bodyBuf
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
  } catch {
    return NextResponse.json(
      { success: false, message: '後端服務連線失敗' },
      { status: 502 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler

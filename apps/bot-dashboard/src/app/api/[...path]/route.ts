import { NextRequest, NextResponse } from 'next/server'
import { DEMO_TENANTS, getDemoResponse } from '@/lib/demo-data'
import { verify } from '@94cram/shared/auth'

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
const BACKEND_URL =
  process.env.BACKEND_URL ||
  `https://cram94-bot-gw-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

async function extractTenantFromJwt(request: NextRequest): Promise<string | undefined> {
  let token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) token = request.cookies.get('token')?.value
  if (!token) return undefined
  try {
    const payload = await verify(token)
    return payload.tenantId
  } catch {
    return undefined
  }
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetPath = '/api/' + path.join('/')

  const tenantId = await extractTenantFromJwt(request)
  if (tenantId && DEMO_TENANTS.includes(tenantId)) {
    let requestBody: Record<string, unknown> | undefined
    if (!['GET', 'HEAD'].includes(request.method)) {
      try {
        requestBody = await request.clone().json()
      } catch {
        // body is not JSON or empty
      }
    }
    const demoResult = getDemoResponse(request.method, targetPath, request.nextUrl.searchParams, requestBody)
    if (demoResult) {
      return NextResponse.json(demoResult.body, { status: demoResult.status })
    }
  }

  const url = new URL(targetPath, BACKEND_URL)
  url.search = request.nextUrl.search

  const headers = new Headers()
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }

  if (!authHeader) {
    const token = request.cookies.get('token')?.value
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const hasAuthContext = headers.has('Authorization')

  const xTenantId = request.headers.get('X-Tenant-Id')
  if (!hasAuthContext && xTenantId) headers.set('X-Tenant-Id', xTenantId)

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
    const response = new NextResponse(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    })

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append('Set-Cookie', value)
      }
    })

    return response
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

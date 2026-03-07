import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verify } from '@94cram/shared/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 只處理 /admin 路徑（排除 /admin/login）
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('token')?.value || request.cookies.get('platform_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const payload = await verify(token)
      if (payload.role !== 'superadmin') {
        throw new Error('Forbidden')
      }
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('token')
      response.cookies.delete('platform_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}

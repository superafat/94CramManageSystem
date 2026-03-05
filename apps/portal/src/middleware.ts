import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 只處理 /admin 路徑（排除 /admin/login）
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('platform_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // 簡單檢查 token 是否過期（解析 JWT payload）
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const response = NextResponse.redirect(new URL('/admin/login', request.url))
        response.cookies.delete('platform_token')
        return response
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}

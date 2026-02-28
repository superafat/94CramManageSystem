import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (token && request.nextUrl.pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('Authorization', `Bearer ${token}`)
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

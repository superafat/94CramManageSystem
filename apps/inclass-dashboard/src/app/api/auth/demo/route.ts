import { NextResponse } from 'next/server'
import * as jose from 'jose'

export async function POST() {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing server configuration' }, { status: 500 })
  }

  const demoUser = {
    id: 'demo-inclass-user',
    email: 'demo@94cram.com',
    name: 'Demo 管理員',
    role: 'admin',
  }
  const demoSchool = {
    id: '11111111-1111-1111-1111-111111111111',
    name: '蜂神榜示範補習班',
    code: 'demo',
  }

  const secret = new TextEncoder().encode(jwtSecret)
  const token = await new jose.SignJWT({
    sub: demoUser.id,
    userId: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
    role: demoUser.role,
    tenantId: demoSchool.id,
    systems: ['inclass'],
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)

  const refreshToken = await new jose.SignJWT({
    sub: demoUser.id,
    userId: demoUser.id,
    tenantId: demoSchool.id,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const response = NextResponse.json({
    token,
    user: demoUser,
    school: demoSchool,
  })

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}

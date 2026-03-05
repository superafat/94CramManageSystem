import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import pg from 'pg'
import bcrypt from 'bcryptjs'

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 10
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= MAX_LOGIN_ATTEMPTS
}

let pool: pg.Pool | null = null
function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  }
  return pool
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json({ error: '登入嘗試次數過多，請 15 分鐘後再試' }, { status: 429 })
  }

  const jwtSecret = process.env.JWT_SECRET
  const dbUrl = process.env.DATABASE_URL
  if (!jwtSecret || !dbUrl) {
    return NextResponse.json({ error: 'Missing server configuration' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const username = (body as { username?: string }).username?.trim()
    const password = (body as { password?: string }).password

    if (!username || !password) {
      return NextResponse.json({ error: '請輸入帳號和密碼' }, { status: 400 })
    }

    const db = getPool()
    const result = await db.query(
      `SELECT id, username, email, name, password_hash, role, tenant_id, is_active, deleted_at
       FROM users
       WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [username]
    )

    const user = result.rows[0]
    if (!user || user.is_active === false) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
    }

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {})

    const secret = new TextEncoder().encode(jwtSecret)
    const token = await new jose.SignJWT({
      sub: user.id,
      userId: user.id,
      name: user.name,
      email: user.email || user.username,
      role: user.role,
      tenantId: user.tenant_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)

    const response = NextResponse.json({ success: true })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

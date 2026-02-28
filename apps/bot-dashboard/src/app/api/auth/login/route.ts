import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import pg from 'pg'
import bcrypt from 'bcryptjs'

let pool: pg.Pool | null = null
function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  }
  return pool
}

export async function POST(request: NextRequest) {
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
      .setExpirationTime('7d')
      .sign(secret)

    const response = NextResponse.json({ token })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

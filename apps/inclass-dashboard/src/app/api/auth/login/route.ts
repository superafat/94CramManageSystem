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
    const email = (body as { email?: string }).email?.trim()
    const password = (body as { password?: string }).password

    if (!email || !password) {
      return NextResponse.json({ error: '請輸入 Email 和密碼' }, { status: 400 })
    }

    const db = getPool()
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.password_hash, u.role, u.tenant_id, u.is_active,
              t.id as school_id, t.name as school_name, t.slug as school_code
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email]
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
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id || '',
      systems: ['inclass'],
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)

    const refreshToken = await new jose.SignJWT({
      sub: user.id,
      userId: user.id,
      tenantId: user.tenant_id || '',
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    const school = user.school_id
      ? { id: user.school_id, name: user.school_name, code: user.school_code }
      : null

    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school,
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
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

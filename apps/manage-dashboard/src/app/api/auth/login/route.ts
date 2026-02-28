import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: ['manage_users', 'manage_settings', 'view_reports', 'manage_billing', 'manage_schedules', 'manage_students', 'view_attendance', 'manage_grades'],
  admin: ['manage_users', 'manage_settings', 'view_reports', 'manage_billing', 'manage_schedules', 'manage_students', 'view_attendance', 'manage_grades'],
  staff: ['manage_students', 'manage_billing', 'manage_schedules', 'view_attendance', 'manage_grades'],
  teacher: ['view_attendance', 'manage_grades', 'view_schedules'],
  parent: ['view_attendance', 'view_grades', 'view_schedules'],
  student: ['view_attendance', 'view_grades', 'view_schedules'],
}

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
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Missing server configuration' } },
      { status: 500 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const username = (body as { username?: string }).username?.trim()
    const password = (body as { password?: string }).password

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: '請輸入帳號和密碼' } },
        { status: 400 }
      )
    }

    const db = getPool()
    // Look up by username or email
    const result = await db.query(
      `SELECT id, username, email, name, password_hash, role, tenant_id, branch_id, is_active, deleted_at
       FROM users
       WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [username]
    )

    const user = result.rows[0]
    if (!user || user.is_active === false) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '帳號或密碼錯誤' } },
        { status: 401 }
      )
    }

    // Verify password (supports bcrypt $2a$/$2b$)
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '帳號或密碼錯誤' } },
        { status: 401 }
      )
    }

    // Update last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {})

    const permissions = ROLE_PERMISSIONS[user.role] || []
    const secret = new TextEncoder().encode(jwtSecret)
    const jwt = await new jose.SignJWT({
      sub: user.id,
      userId: user.id,
      name: user.name,
      email: user.email || user.username,
      role: user.role,
      tenantId: user.tenant_id,
      branchId: user.branch_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    const response = NextResponse.json({
      success: true,
      data: {
        token: jwt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email || user.username,
          role: user.role,
          tenant_id: user.tenant_id,
          branch_id: user.branch_id,
          permissions,
        },
      },
      timestamp: Date.now(),
    })

    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

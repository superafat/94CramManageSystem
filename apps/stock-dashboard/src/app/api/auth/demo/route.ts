import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'

const DEMO_TENANT_1 = '11111111-1111-1111-1111-111111111111'
const DEMO_TENANT_2 = '22222222-2222-2222-2222-222222222222'
const BRANCH_1 = 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d'
const BRANCH_2 = 'b2c3d4e5-f6a7-2b3c-9d4e-5f6a7b8c9d0e'

type Role = 'admin' | 'staff' | 'warehouse'

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['manage_items', 'manage_inventory', 'manage_warehouses', 'manage_suppliers', 'manage_purchase_orders', 'approve_orders', 'manage_transfers', 'view_reports', 'manage_notifications', 'manage_settings'],
  staff: ['manage_items', 'manage_inventory', 'manage_transfers', 'view_reports', 'stock_in', 'stock_out'],
  warehouse: ['manage_inventory', 'stock_in', 'stock_out', 'view_reports', 'manage_barcodes', 'manage_inventory_counts'],
}

const DEMO_ACCOUNTS: Record<string, { id: string; name: string; role: Role; tenantId: string; branchId: string }> = {
  boss:      { id: 'demo-stock-boss',      name: 'Demo 館長',   role: 'admin',     tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
  staff:     { id: 'demo-stock-staff',     name: 'Demo 行政',   role: 'staff',     tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
  warehouse: { id: 'demo-stock-warehouse', name: 'Demo 倉管',   role: 'warehouse', tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
  boss2:     { id: 'demo-stock-boss2',     name: 'Demo 館長2',  role: 'admin',     tenantId: DEMO_TENANT_2, branchId: BRANCH_2 },
}

// Demo 模式使用 fallback secret — demo token 僅用於攔截 mock 資料，不涉及真實後端驗證
const DEMO_FALLBACK_SECRET = 'demo-94stock-secret-not-for-production'

export async function POST(request: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET || DEMO_FALLBACK_SECRET

  try {
    const body = await request.json().catch(() => ({}))
    const username = (body as { username?: string }).username || 'boss'
    const account = DEMO_ACCOUNTS[username]

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: `Unknown demo account: ${username}` } },
        { status: 400 }
      )
    }

    const secret = new TextEncoder().encode(jwtSecret)
    const permissions = ROLE_PERMISSIONS[account.role] || []

    const jwt = await new jose.SignJWT({
      sub: account.id,
      userId: account.id,
      name: account.name,
      email: `${username}@demo.94cram.com`,
      role: account.role,
      tenantId: account.tenantId,
      branchId: account.branchId,
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
          id: account.id,
          name: account.name,
          email: `${username}@demo.94cram.com`,
          role: account.role,
          tenant_id: account.tenantId,
          branch_id: account.branchId,
          permissions,
        },
      },
      timestamp: Date.now(),
    })
    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })
    return response
  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

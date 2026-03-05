// ============================================================
// Portal Demo 數據 — 開發模式下不連 DB 的假資料
// ============================================================

export const DEMO_SUPERADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

// --------------- 補習班 ---------------
export const DEMO_TENANTS = [
  {
    id: 'tenant-0001-0000-0000-000000000001',
    name: '陽光補習班',
    slug: 'sunshine',
    plan: 'pro',
    status: 'active',
    studentCount: 320,
    userCount: 12,
    adminName: '王大明',
    createdAt: '2025-09-15T08:00:00Z',
  },
  {
    id: 'tenant-0002-0000-0000-000000000002',
    name: '星星文教',
    slug: 'star-edu',
    plan: 'basic',
    status: 'active',
    studentCount: 145,
    userCount: 6,
    adminName: '林小芳',
    createdAt: '2025-10-02T09:30:00Z',
  },
  {
    id: 'tenant-0003-0000-0000-000000000003',
    name: '彩虹學園',
    slug: 'rainbow',
    plan: 'enterprise',
    status: 'active',
    studentCount: 780,
    userCount: 35,
    adminName: '陳志遠',
    createdAt: '2025-07-20T10:00:00Z',
  },
  {
    id: 'tenant-0004-0000-0000-000000000004',
    name: '翰林書院',
    slug: 'hanlin',
    plan: 'free',
    status: 'trial',
    studentCount: 28,
    userCount: 3,
    adminName: '張美玲',
    createdAt: '2026-01-10T14:00:00Z',
  },
  {
    id: 'tenant-0005-0000-0000-000000000005',
    name: '晨曦教育',
    slug: 'sunrise-edu',
    plan: 'basic',
    status: 'suspended',
    studentCount: 92,
    userCount: 5,
    adminName: '黃建國',
    createdAt: '2025-11-05T11:00:00Z',
  },
]

// --------------- 帳號審核 ---------------
export const DEMO_ACCOUNTS = [
  {
    id: 'acc-0001',
    name: '王大明',
    email: 'wang@sunshine.com',
    role: 'admin',
    tenantId: 'tenant-0001-0000-0000-000000000001',
    tenantName: '陽光補習班',
    status: 'approved',
    createdAt: '2025-09-15T08:05:00Z',
  },
  {
    id: 'acc-0002',
    name: '林小芳',
    email: 'lin@star-edu.com',
    role: 'admin',
    tenantId: 'tenant-0002-0000-0000-000000000002',
    tenantName: '星星文教',
    status: 'approved',
    createdAt: '2025-10-02T09:35:00Z',
  },
  {
    id: 'acc-0003',
    name: '劉雅婷',
    email: 'liu@newschool.com',
    role: 'admin',
    tenantId: null,
    tenantName: null,
    status: 'pending',
    createdAt: '2026-02-28T15:00:00Z',
  },
  {
    id: 'acc-0004',
    name: '吳志豪',
    email: 'wu@learnfast.com',
    role: 'admin',
    tenantId: null,
    tenantName: null,
    status: 'pending',
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'acc-0005',
    name: '鄭家豪',
    email: 'cheng@oldschool.com',
    role: 'admin',
    tenantId: null,
    tenantName: null,
    status: 'rejected',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'acc-0006',
    name: '陳志遠',
    email: 'chen@rainbow.com',
    role: 'admin',
    tenantId: 'tenant-0003-0000-0000-000000000003',
    tenantName: '彩虹學園',
    status: 'approved',
    createdAt: '2025-07-20T10:10:00Z',
  },
  {
    id: 'acc-0007',
    name: '張美玲',
    email: 'zhang@hanlin.com',
    role: 'admin',
    tenantId: 'tenant-0004-0000-0000-000000000004',
    tenantName: '翰林書院',
    status: 'approved',
    createdAt: '2026-01-10T14:05:00Z',
  },
  {
    id: 'acc-0008',
    name: '蔡淑惠',
    email: 'tsai@sunrise-edu.com',
    role: 'teacher',
    tenantId: 'tenant-0005-0000-0000-000000000005',
    tenantName: '晨曦教育',
    status: 'approved',
    createdAt: '2025-11-05T11:10:00Z',
  },
]

// --------------- 試用申請 ---------------
export const DEMO_TRIALS = [
  {
    tenantId: 'tenant-0004-0000-0000-000000000004',
    tenantName: '翰林書院',
    trialStatus: 'active',
    trialStartAt: '2026-01-10T00:00:00Z',
    trialEndAt: '2026-02-10T00:00:00Z',
  },
  {
    tenantId: 'trial-pending-001',
    tenantName: '智慧文教',
    trialStatus: 'pending',
    trialStartAt: null,
    trialEndAt: null,
  },
  {
    tenantId: 'trial-expired-001',
    tenantName: '光明學苑',
    trialStatus: 'expired',
    trialStartAt: '2025-12-01T00:00:00Z',
    trialEndAt: '2026-01-01T00:00:00Z',
  },
]

// --------------- 方案定價 ---------------
export const DEMO_PLAN_PRICING = [
  {
    id: 'plan-001',
    plan_key: 'free',
    name: '免費版',
    monthly_price: 0,
    features: { maxStudents: 30, maxTeachers: 3, aiEnabled: false },
    is_active: true,
  },
  {
    id: 'plan-002',
    plan_key: 'basic',
    name: '基本版',
    monthly_price: 2000,
    features: { maxStudents: 200, maxTeachers: 10, aiEnabled: false },
    is_active: true,
  },
  {
    id: 'plan-003',
    plan_key: 'pro',
    name: '專業版',
    monthly_price: 5000,
    features: { maxStudents: 500, maxTeachers: 30, aiEnabled: true },
    is_active: true,
  },
  {
    id: 'plan-004',
    plan_key: 'enterprise',
    name: '企業版',
    monthly_price: 10000,
    features: { maxStudents: -1, maxTeachers: -1, aiEnabled: true },
    is_active: true,
  },
]

// --------------- 收款紀錄 ---------------
export const DEMO_PAYMENTS = [
  {
    id: 'pay-001',
    tenant_id: 'tenant-0001-0000-0000-000000000001',
    tenant_name: '陽光補習班',
    amount: 5000,
    paid_at: '2026-03-01T10:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2026-0301',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    notes: '三月份訂閱費',
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'pay-002',
    tenant_id: 'tenant-0002-0000-0000-000000000002',
    tenant_name: '星星文教',
    amount: 2000,
    paid_at: '2026-03-02T14:00:00Z',
    method: 'credit_card',
    invoice_no: 'INV-2026-0302',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    notes: '三月份訂閱費',
    created_at: '2026-03-02T14:00:00Z',
  },
  {
    id: 'pay-003',
    tenant_id: 'tenant-0003-0000-0000-000000000003',
    tenant_name: '彩虹學園',
    amount: 10000,
    paid_at: '2026-03-01T09:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2026-0303',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    notes: '三月份企業版訂閱',
    created_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'pay-004',
    tenant_id: 'tenant-0001-0000-0000-000000000001',
    tenant_name: '陽光補習班',
    amount: 5000,
    paid_at: '2026-02-01T10:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2026-0201',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    notes: '二月份訂閱費',
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'pay-005',
    tenant_id: 'tenant-0002-0000-0000-000000000002',
    tenant_name: '星星文教',
    amount: 2000,
    paid_at: '2026-02-03T11:00:00Z',
    method: 'credit_card',
    invoice_no: 'INV-2026-0202',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    notes: '二月份訂閱費',
    created_at: '2026-02-03T11:00:00Z',
  },
  {
    id: 'pay-006',
    tenant_id: 'tenant-0003-0000-0000-000000000003',
    tenant_name: '彩虹學園',
    amount: 10000,
    paid_at: '2026-02-01T09:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2026-0203',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    notes: '二月份企業版訂閱',
    created_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'pay-007',
    tenant_id: 'tenant-0001-0000-0000-000000000001',
    tenant_name: '陽光補習班',
    amount: 5000,
    paid_at: '2026-01-02T10:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2026-0101',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    notes: '一月份訂閱費',
    created_at: '2026-01-02T10:00:00Z',
  },
  {
    id: 'pay-008',
    tenant_id: 'tenant-0003-0000-0000-000000000003',
    tenant_name: '彩虹學園',
    amount: 10000,
    paid_at: '2026-01-01T09:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2026-0102',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    notes: '一月份企業版訂閱',
    created_at: '2026-01-01T09:00:00Z',
  },
  {
    id: 'pay-009',
    tenant_id: 'tenant-0005-0000-0000-000000000005',
    tenant_name: '晨曦教育',
    amount: 2000,
    paid_at: '2025-12-05T12:00:00Z',
    method: 'credit_card',
    invoice_no: 'INV-2025-1201',
    period_start: '2025-12-01',
    period_end: '2025-12-31',
    notes: '十二月份訂閱費（已暫停）',
    created_at: '2025-12-05T12:00:00Z',
  },
  {
    id: 'pay-010',
    tenant_id: 'tenant-0002-0000-0000-000000000002',
    tenant_name: '星星文教',
    amount: 2000,
    paid_at: '2025-12-02T10:00:00Z',
    method: 'transfer',
    invoice_no: 'INV-2025-1202',
    period_start: '2025-12-01',
    period_end: '2025-12-31',
    notes: '十二月份訂閱費',
    created_at: '2025-12-02T10:00:00Z',
  },
]

// --------------- 支出紀錄 ---------------
export const DEMO_COSTS = [
  {
    id: 'cost-001',
    category: 'infra',
    subcategory: 'Cloud Run',
    amount: 1800,
    date: '2026-03-01',
    description: 'GCP Cloud Run 運算費用',
    is_recurring: true,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'cost-002',
    category: 'infra',
    subcategory: 'Cloud SQL',
    amount: 1200,
    date: '2026-03-01',
    description: 'PostgreSQL Cloud SQL 費用',
    is_recurring: true,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'cost-003',
    category: 'ai',
    subcategory: 'Gemini API',
    amount: 450,
    date: '2026-03-03',
    description: 'Google Gemini API 用量費',
    is_recurring: false,
    created_at: '2026-03-03T00:00:00Z',
  },
  {
    id: 'cost-004',
    category: 'domain',
    subcategory: '94cram.com',
    amount: 350,
    date: '2026-01-15',
    description: '域名年費',
    is_recurring: true,
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'cost-005',
    category: 'labor',
    subcategory: '兼職開發',
    amount: 8000,
    date: '2026-02-28',
    description: '二月份兼職工程師費用',
    is_recurring: false,
    created_at: '2026-02-28T00:00:00Z',
  },
  {
    id: 'cost-006',
    category: 'infra',
    subcategory: 'Artifact Registry',
    amount: 200,
    date: '2026-02-01',
    description: 'Docker image 儲存費用',
    is_recurring: true,
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'cost-007',
    category: 'ai',
    subcategory: 'Claude API',
    amount: 380,
    date: '2026-02-15',
    description: 'Anthropic Claude API 用量費',
    is_recurring: false,
    created_at: '2026-02-15T00:00:00Z',
  },
  {
    id: 'cost-008',
    category: 'other',
    subcategory: '行銷',
    amount: 2000,
    date: '2026-02-10',
    description: 'Google Ads 廣告投放',
    is_recurring: false,
    created_at: '2026-02-10T00:00:00Z',
  },
]

// --------------- 知識庫 ---------------
export const DEMO_KNOWLEDGE = [
  {
    id: 'kb-001',
    title: '如何重置學生密碼',
    content: '進入「學員管理」→ 選擇學員 → 點擊「重置密碼」，系統將寄送重置連結至學員信箱。若學員未收到，請確認信箱是否正確並檢查垃圾郵件資料夾。',
    category: 'admin',
    tenantId: null,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'kb-002',
    title: '點名系統操作說明',
    content: '老師可於課前 15 分鐘進入點名頁面，選擇班級後即可開始點名。遲到學生請選擇「遲到」狀態，請假學生需事先由家長申請。點名記錄可於課後 24 小時內修改。',
    category: 'teaching',
    tenantId: null,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-01T11:00:00Z',
  },
  {
    id: 'kb-003',
    title: '帳單與付款方式',
    content: '目前支援銀行轉帳與信用卡刷卡。每月 1 日系統自動開立發票，並發送至您的登記信箱。如需更改付款方式，請於帳單日 3 天前聯絡客服。',
    category: 'general',
    tenantId: null,
    createdAt: '2026-01-20T14:00:00Z',
    updatedAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'kb-004',
    title: '陽光補習班專屬操作手冊',
    content: '陽光補習班客製化功能說明：1. 分班功能依年級自動分配。2. 家長 LINE 通知已啟用，每次點名後自動推播。3. 月報表每月最後一天自動寄送至管理員信箱。',
    category: 'admin',
    tenantId: 'tenant-0001-0000-0000-000000000001',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'kb-005',
    title: 'AI 功能使用指南',
    content: 'AI 功能僅限專業版與企業版用戶使用。功能包含：作業批改輔助、學習弱點分析、個人化複習建議。如需開啟 AI 功能，請至「設定 → AI 服務」啟用，首次使用需同意服務條款。',
    category: 'teaching',
    tenantId: null,
    createdAt: '2026-02-10T16:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
  },
]

// --------------- AI 供應商 ---------------
export const DEMO_AI_PROVIDERS = [
  { name: 'gemini', displayName: 'Google Gemini', available: true, model: 'gemini-1.5-flash' },
  { name: 'claude', displayName: 'Anthropic Claude', available: true, model: 'claude-3-haiku' },
  { name: 'minimax', displayName: 'MiniMax', available: false, model: 'abab6.5-chat' },
]

// ============================================================
// 輔助函式
// ============================================================

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number; page: number; pageSize: number } {
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total, page, pageSize }
}

function generateMonthlyTrend(baseRevenue: number, baseCost: number): Array<{ month: string; revenue: number; cost: number; profit: number }> {
  const result = []
  const now = new Date('2026-03-05')
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const variance = 0.8 + Math.random() * 0.4
    const revenue = Math.round(baseRevenue * variance)
    const cost = Math.round(baseCost * (0.85 + Math.random() * 0.3))
    result.push({ month, revenue, cost, profit: revenue - cost })
  }
  return result
}

function generate7DayTrend(): Array<{ date: string; newTenants: number; newStudents: number }> {
  const result = []
  const now = new Date('2026-03-05')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    result.push({
      date: d.toISOString().slice(0, 10),
      newTenants: Math.floor(Math.random() * 3),
      newStudents: Math.floor(Math.random() * 20) + 5,
    })
  }
  return result
}

function generate30DayPageviews(): Array<{ date: string; pv: number; uv: number }> {
  const result = []
  const now = new Date('2026-03-05')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    result.push({
      date: d.toISOString().slice(0, 10),
      pv: Math.floor(Math.random() * 200) + 100,
      uv: Math.floor(Math.random() * 80) + 40,
    })
  }
  return result
}

// ============================================================
// getDemoResponse — 路由分發
// ============================================================

export interface DemoResult {
  body: Record<string, unknown>
  status: number
}

function ok(data: unknown): DemoResult {
  return { body: { success: true, data }, status: 200 }
}

function okList(data: unknown): DemoResult {
  return { body: { success: true, data, ...(Array.isArray(data) ? { total: (data as unknown[]).length } : {}) }, status: 200 }
}

function matchPath(pattern: string, actual: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const actualParts = actual.split('/')
  if (patternParts.length !== actualParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = actualParts[i]
    } else if (patternParts[i] !== actualParts[i]) {
      return null
    }
  }
  return params
}

export function getDemoResponse(
  method: string,
  path: string,
  searchParams: URLSearchParams,
  body?: Record<string, unknown>
): DemoResult | null {
  const m = method.toUpperCase()

  // Strip query string from path if any
  const cleanPath = path.split('?')[0]

  // ---- Auth ----
  if (m === 'POST' && cleanPath === '/api/platform/auth/login') {
    return ok({
      token: 'demo.eyJ1c2VySWQiOiJhYWFhYWFhYS1hYWFhLWFhYWEtYWFhYS1hYWFhYWFhYWFhYWEiLCJuYW1lIjoi5bmz5Y-w566h55CG5ZGYIiwiZW1haWwiOiJhZG1pbkA5NGNyYW0uY29tIiwicm9sZSI6InN1cGVyYWRtaW4ifQ.demo',
      user: { id: DEMO_SUPERADMIN_ID, name: '平台管理員', email: 'admin@94cram.com', role: 'superadmin' },
    })
  }
  if (m === 'POST' && cleanPath === '/api/platform/auth/seed') {
    return ok({
      message: 'Superadmin 帳號建立成功',
      credentials: {
        email: 'admin@94cram.com',
        password: 'Admin@94cram',
        note: '請登入後立即修改密碼',
      },
    })
  }
  if (m === 'POST' && cleanPath === '/api/platform/auth/logout') {
    return { body: { success: true }, status: 200 }
  }
  if (m === 'GET' && cleanPath === '/api/platform/auth/me') {
    return ok({ id: DEMO_SUPERADMIN_ID, name: '平台管理員', email: 'admin@94cram.com', role: 'superadmin' })
  }

  // ---- Dashboard ----
  if (m === 'GET' && cleanPath === '/api/platform/dashboard') {
    const activeTenants = DEMO_TENANTS.filter(t => t.status === 'active').length
    const totalStudents = DEMO_TENANTS.reduce((s, t) => s + t.studentCount, 0)
    const monthRevenue = DEMO_PAYMENTS.filter(p => p.paid_at.startsWith('2026-03')).reduce((s, p) => s + p.amount, 0)
    const monthCost = DEMO_COSTS.filter(c => c.date.startsWith('2026-03')).reduce((s, c) => s + c.amount, 0)
    const pendingAccounts = DEMO_ACCOUNTS.filter(a => a.status === 'pending').length
    return ok({
      tenants: { total: DEMO_TENANTS.length, active: activeTenants, trial: 1, suspended: 1 },
      finance: { monthRevenue, monthCost, monthProfit: monthRevenue - monthCost },
      students: { total: totalStudents },
      pending: { accounts: pendingAccounts, trials: DEMO_TRIALS.filter(t => t.trialStatus === 'pending').length },
      recentTrend: generate7DayTrend(),
    })
  }

  // ---- Tenants ----
  if (m === 'GET' && cleanPath === '/api/platform/tenants') {
    const search = searchParams.get('search') || ''
    const plan = searchParams.get('plan') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    let filtered = [...DEMO_TENANTS]
    if (search) filtered = filtered.filter(t => t.name.includes(search) || t.slug.includes(search))
    if (plan) filtered = filtered.filter(t => t.plan === plan)
    if (status) filtered = filtered.filter(t => t.status === status)

    const paged = paginate(filtered, page, pageSize)
    return { body: { success: true, data: paged.items, total: paged.total, page: paged.page, pageSize: paged.pageSize }, status: 200 }
  }
  if (m === 'POST' && cleanPath === '/api/platform/tenants') {
    return ok({ id: 'new-' + Date.now(), created: true })
  }
  {
    const params = matchPath('/api/platform/tenants/:id', cleanPath)
    if (params) {
      if (m === 'GET') {
        const tenant = DEMO_TENANTS.find(t => t.id === params.id) || DEMO_TENANTS[0]
        return ok(tenant)
      }
      if (m === 'PUT') return ok({ updated: true })
      if (m === 'DELETE') return ok({ deleted: true })
    }
    const suspendParams = matchPath('/api/platform/tenants/:id/suspend', cleanPath)
    if (suspendParams && m === 'POST') return { body: { success: true }, status: 200 }
    const activateParams = matchPath('/api/platform/tenants/:id/activate', cleanPath)
    if (activateParams && m === 'POST') return { body: { success: true }, status: 200 }
    const remindParams = matchPath('/api/platform/tenants/:id/remind', cleanPath)
    if (remindParams && m === 'POST') return { body: { success: true }, status: 200 }
  }

  // ---- Accounts ----
  if (m === 'GET' && cleanPath === '/api/platform/accounts') {
    const status = searchParams.get('status') || ''
    let filtered = [...DEMO_ACCOUNTS]
    if (status) filtered = filtered.filter(a => a.status === status)
    return okList(filtered)
  }
  {
    const approveParams = matchPath('/api/platform/accounts/:id/approve', cleanPath)
    if (approveParams && m === 'POST') return { body: { success: true }, status: 200 }
    const rejectParams = matchPath('/api/platform/accounts/:id/reject', cleanPath)
    if (rejectParams && m === 'POST') return { body: { success: true }, status: 200 }
  }

  // ---- Trials ----
  if (m === 'GET' && cleanPath === '/api/platform/trials') {
    return okList(DEMO_TRIALS)
  }
  if (m === 'POST' && cleanPath === '/api/platform/trials/approve') return { body: { success: true }, status: 200 }
  if (m === 'POST' && cleanPath === '/api/platform/trials/reject') return { body: { success: true }, status: 200 }
  if (m === 'POST' && cleanPath === '/api/platform/trials/revoke') return { body: { success: true }, status: 200 }

  // ---- Finance: Overview ----
  if (m === 'GET' && cleanPath === '/api/platform/finance/overview') {
    const curRevenue = DEMO_PAYMENTS.filter(p => p.paid_at.startsWith('2026-03')).reduce((s, p) => s + p.amount, 0)
    const curCost = DEMO_COSTS.filter(c => c.date.startsWith('2026-03')).reduce((s, c) => s + c.amount, 0)
    const trend = generateMonthlyTrend(17000, 5630)
    return ok({
      currentMonth: { revenue: curRevenue, cost: curCost, profit: curRevenue - curCost },
      trend,
    })
  }

  // ---- Finance: Pricing ----
  if (m === 'GET' && cleanPath === '/api/platform/finance/pricing') {
    return okList(DEMO_PLAN_PRICING)
  }
  {
    const pricingParams = matchPath('/api/platform/finance/pricing/:id', cleanPath)
    if (pricingParams && m === 'PUT') return ok({ updated: true })
  }

  // ---- Finance: Payments ----
  if (m === 'GET' && cleanPath === '/api/platform/finance/payments') {
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const tenantId = searchParams.get('tenantId') || ''
    let filtered = [...DEMO_PAYMENTS]
    if (tenantId) filtered = filtered.filter(p => p.tenant_id === tenantId)
    const paged = paginate(filtered, page, pageSize)
    return { body: { success: true, data: paged.items, total: paged.total, page: paged.page, pageSize: paged.pageSize }, status: 200 }
  }
  if (m === 'POST' && cleanPath === '/api/platform/finance/payments') {
    return ok({ id: 'pay-new-' + Date.now(), created: true })
  }
  {
    const payParams = matchPath('/api/platform/finance/payments/:id', cleanPath)
    if (payParams) {
      if (m === 'PUT') return ok({ updated: true })
      if (m === 'DELETE') return ok({ deleted: true })
    }
  }

  // ---- Finance: Costs ----
  if (m === 'GET' && cleanPath === '/api/platform/finance/costs') {
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const category = searchParams.get('category') || ''
    let filtered = [...DEMO_COSTS]
    if (category) filtered = filtered.filter(c => c.category === category)
    const paged = paginate(filtered, page, pageSize)
    return { body: { success: true, data: paged.items, total: paged.total, page: paged.page, pageSize: paged.pageSize }, status: 200 }
  }
  if (m === 'POST' && cleanPath === '/api/platform/finance/costs') {
    return ok({ id: 'cost-new-' + Date.now(), created: true })
  }
  {
    const costParams = matchPath('/api/platform/finance/costs/:id', cleanPath)
    if (costParams) {
      if (m === 'PUT') return ok({ updated: true })
      if (m === 'DELETE') return ok({ deleted: true })
    }
  }

  // ---- Finance: Reports ----
  if (m === 'GET' && cleanPath === '/api/platform/finance/reports/pnl') {
    return ok({ months: generateMonthlyTrend(17000, 5630) })
  }
  if (m === 'GET' && cleanPath === '/api/platform/finance/reports/mrr') {
    const now = new Date('2026-03-05')
    const mrr = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mrr.push({ month, mrr: Math.round(17000 * (0.8 + Math.random() * 0.4)), subscribers: Math.floor(3 + Math.random() * 3) })
    }
    return ok({ months: mrr })
  }
  if (m === 'GET' && cleanPath === '/api/platform/finance/reports/receivables') {
    const details = DEMO_TENANTS.filter(t => t.status === 'active').map(t => {
      const plan = DEMO_PLAN_PRICING.find(p => p.plan_key === t.plan)
      return { tenantId: t.id, tenantName: t.name, amount: plan?.monthly_price || 0, dueDate: '2026-04-01', status: 'pending' }
    })
    return ok({ summary: { total: details.reduce((s, d) => s + d.amount, 0), count: details.length }, details })
  }

  // ---- Knowledge ----
  if (m === 'GET' && cleanPath === '/api/platform/knowledge') {
    const tenantId = searchParams.get('tenantId') || ''
    const filtered = tenantId ? DEMO_KNOWLEDGE.filter(k => k.tenantId === tenantId || k.tenantId === null) : DEMO_KNOWLEDGE
    return okList(filtered)
  }
  if (m === 'POST' && cleanPath === '/api/platform/knowledge') {
    return ok({ id: 'kb-new-' + Date.now(), ...(body || {}) })
  }
  {
    const kbParams = matchPath('/api/platform/knowledge/:id', cleanPath)
    if (kbParams) {
      if (m === 'PUT') return ok({ updated: true })
      if (m === 'DELETE') return ok({ deleted: true })
    }
  }

  // ---- AI ----
  if (m === 'GET' && cleanPath === '/api/platform/ai/providers') {
    return okList(DEMO_AI_PROVIDERS)
  }
  if (m === 'GET' && cleanPath === '/api/platform/ai/usage') {
    return ok({
      totalTokens: 1_234_567,
      totalCost: 830,
      byProvider: [
        { name: 'gemini', tokens: 800_000, cost: 450 },
        { name: 'claude', tokens: 434_567, cost: 380 },
      ],
    })
  }
  if (m === 'GET' && cleanPath === '/api/platform/ai/subscriptions') {
    return okList(
      DEMO_TENANTS.filter(t => ['pro', 'enterprise'].includes(t.plan)).map(t => ({
        tenantId: t.id,
        tenantName: t.name,
        aiEnabled: true,
        providers: ['gemini'],
      }))
    )
  }
  {
    const aiSubParams = matchPath('/api/platform/ai/subscriptions/:tenantId', cleanPath)
    if (aiSubParams && m === 'PUT') return ok({ updated: true })
  }

  // ---- Analytics ----
  if (m === 'GET' && cleanPath === '/api/platform/analytics/overview') {
    return ok({
      today: { pv: 342, uv: 128 },
      week: { pv: 2184, uv: 867 },
      month: { pv: 8920, uv: 3410 },
      dailyTrend: generate30DayPageviews(),
    })
  }
  if (m === 'GET' && cleanPath === '/api/platform/analytics/pages') {
    const pages = [
      '/admin', '/admin/tenants', '/admin/finance', '/admin/accounts',
      '/admin/analytics', '/admin/settings', '/admin/knowledge', '/admin/ai',
      '/admin/security', '/admin/trials', '/admin/finance/payments',
      '/admin/finance/costs', '/admin/finance/reports', '/admin/tenants/new',
      '/admin/accounts/pending', '/admin/ai/usage', '/admin/knowledge/new',
      '/admin/settings/health', '/admin/finance/pricing', '/admin/analytics/bots',
    ]
    return okList(pages.map((p, i) => ({ path: p, pv: Math.round(8920 / (i + 1)), uv: Math.round(3410 / (i + 1)) })))
  }
  if (m === 'GET' && cleanPath === '/api/platform/analytics/referrers') {
    return okList([
      { source: 'direct', visits: 1820 },
      { source: 'google.com', visits: 940 },
      { source: 'line.me', visits: 480 },
      { source: 'facebook.com', visits: 310 },
      { source: 'github.com', visits: 120 },
      { source: 'instagram.com', visits: 90 },
      { source: 'twitter.com', visits: 45 },
      { source: 'yahoo.com', visits: 38 },
      { source: 'bing.com', visits: 30 },
      { source: 'others', visits: 77 },
    ])
  }
  if (m === 'GET' && cleanPath === '/api/platform/analytics/bots') {
    return ok({
      totalBotRequests: 2300,
      bots: [
        { name: 'Googlebot', requests: 1100 },
        { name: 'bingbot', requests: 580 },
        { name: 'AhrefsBot', requests: 340 },
        { name: 'SemrushBot', requests: 180 },
        { name: 'Others', requests: 100 },
      ],
    })
  }

  // ---- Security ----
  if (m === 'GET' && cleanPath === '/api/platform/security/failed-logins') {
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const logs = Array.from({ length: 25 }, (_, i) => ({
      id: `fl-${i + 1}`,
      ip: `192.168.${Math.floor(i / 5)}.${(i % 5) + 10}`,
      email: `user${i}@example.com`,
      reason: i % 3 === 0 ? '帳號不存在' : i % 3 === 1 ? '密碼錯誤' : '帳號已停用',
      attemptedAt: new Date(Date.now() - i * 3600_000).toISOString(),
    }))
    const paged = paginate(logs, page, pageSize)
    return { body: { success: true, data: paged.items, total: paged.total, page: paged.page, pageSize: paged.pageSize }, status: 200 }
  }
  if (m === 'GET' && cleanPath === '/api/platform/security/blocked-ips') {
    return ok({ blockedIps: [] })
  }

  // ---- Settings ----
  if (m === 'GET' && cleanPath === '/api/platform/settings') {
    return okList([
      { key: 'platform_name', value: '94cram 平台', description: '平台顯示名稱', updatedAt: '2026-01-01T00:00:00Z' },
      { key: 'support_email', value: 'superafatus@gmail.com', description: '客服信箱', updatedAt: '2026-01-01T00:00:00Z' },
      { key: 'max_trial_days', value: '30', description: '試用期天數', updatedAt: '2026-01-01T00:00:00Z' },
    ])
  }
  if (m === 'PUT' && cleanPath === '/api/platform/settings') {
    return { body: { success: true }, status: 200 }
  }
  if (m === 'GET' && cleanPath === '/api/platform/settings/health') {
    return ok({
      services: [
        { name: 'database', status: 'healthy', latencyMs: 12 },
        { name: 'manage-backend', status: 'healthy', latencyMs: 45 },
        { name: 'inclass-backend', status: 'healthy', latencyMs: 38 },
        { name: 'stock-backend', status: 'healthy', latencyMs: 41 },
        { name: 'bot-gateway', status: 'healthy', latencyMs: 67 },
      ],
      checkedAt: new Date().toISOString(),
    })
  }

  return null
}

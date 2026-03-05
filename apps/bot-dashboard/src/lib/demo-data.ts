const DEMO_TENANT_1 = '11111111-1111-1111-1111-111111111111'
const DEMO_TENANT_2 = '22222222-2222-2222-2222-222222222222'

export const DEMO_TENANTS = [DEMO_TENANT_1, DEMO_TENANT_2]

const CLAIRVOYANT_CONVERSATIONS = [
  { id: 'cv1', user_name: 'Demo 館長', message: '今天出勤統計', reply: '今日出勤：已到 45 人、未到 3 人、請假 2 人。出勤率 90%。缺席名單：張志豪、吳承恩、李宜庭（請假）。', intent: '出勤查詢', created_at: '2026-03-06T08:00:00Z' },
  { id: 'cv2', user_name: 'Demo 行政', message: '本月營收報表', reply: '3 月營收統計：應收 NT$186,000、已收 NT$152,000、未收 NT$34,000。繳費率 81.7%。未繳名單已發送至您的信箱。', intent: '營收查詢', created_at: '2026-03-05T17:30:00Z' },
  { id: 'cv3', user_name: 'Demo 館長', message: '張志豪出勤異常', reply: '張志豪近 30 日出勤率 65%（低於平均 88%），遲到 5 次、缺席 4 次。系統已標記為高風險學生，建議聯繫家長。', intent: '學生查詢', created_at: '2026-03-05T10:00:00Z' },
  { id: 'cv4', user_name: 'Demo 行政', message: '下週排課狀態', reply: '下週一至五共排 12 堂課，2 間教室。週三王老師請假，需代課安排。建議調整：林助教代上國小先修班。', intent: '排課查詢', created_at: '2026-03-04T14:00:00Z' },
  { id: 'cv5', user_name: 'Demo 館長', message: '教師薪資試算', reply: '本月薪資試算：王老師 12 堂 × NT$800 = NT$9,600、李老師 10 堂 × NT$900 = NT$9,000、陳主任月薪 NT$45,000、林助教 40hr × NT$200 = NT$8,000。合計 NT$71,600。', intent: '薪資查詢', created_at: '2026-03-03T16:00:00Z' },
]

const WINDEAR_CONVERSATIONS = [
  { id: 'we1', user_name: '陳媽媽', message: '小利今天有到嗎', reply: '陳小利今天 17:55 已到班，準時出席數學課！', intent: '出勤查詢', created_at: '2026-03-06T18:10:00Z' },
  { id: 'we2', user_name: '王爸爸', message: '大明最近考試分數', reply: '王大明最近一次數學小考 85 分（班級平均 78 分），進步 5 分！', intent: '成績查詢', created_at: '2026-03-05T20:00:00Z' },
  { id: 'we3', user_name: '林媽媽', message: '美琪下週課表', reply: '林美琪下週課表：週二/五 數學 18:00-20:00、週三 英文 18:00-20:00、週六 英文 10:00-12:00。', intent: '課表查詢', created_at: '2026-03-05T19:00:00Z' },
  { id: 'we4', user_name: '張媽媽', message: '志豪請假', reply: '已登記張志豪下週二數學課請假。如需補課請回覆「補課」。', intent: '請假申請', created_at: '2026-03-04T21:00:00Z' },
  { id: 'we5', user_name: '黃媽媽', message: '學費繳了嗎', reply: '黃柏翰 3 月學費 NT$3,500 已於 3/2 繳清。收據編號 R2026030201。', intent: '繳費查詢', created_at: '2026-03-03T10:00:00Z' },
]

const LINE_CONVERSATIONS = [
  { id: 'conv1', parent_name: '陳媽媽', parent_line_id: 'U001', student_name: '陳小利', message: '請問明天有上課嗎？', reply: '您好！明天（週三）陳小利有英文課，時間是 18:00-20:00，教室 202。', intent: 'schedule_query', created_at: '2026-03-06T09:15:00Z' },
  { id: 'conv2', parent_name: '王爸爸', parent_line_id: 'U002', student_name: '王大明', message: '大明這週考試成績怎麼樣？', reply: '王大明本週數學小考 85 分，班級平均 78 分，表現不錯！英文成績尚未出來，出來後會再通知您。', intent: 'grade_query', created_at: '2026-03-06T08:30:00Z' },
  { id: 'conv3', parent_name: '林媽媽', parent_line_id: 'U003', student_name: '林美琪', message: '美琪昨天有準時到嗎？', reply: '林美琪昨天（週二）數學課 17:55 到班，準時出席！', intent: 'attendance_query', created_at: '2026-03-05T20:10:00Z' },
  { id: 'conv4', parent_name: '張媽媽', parent_line_id: 'U004', student_name: '張志豪', message: '志豪最近上課狀況如何？', reply: '張志豪近期出勤率為 80%，有幾次遲到情況。建議可以跟老師約時間了解學習狀況。需要幫您預約嗎？', intent: 'general_query', created_at: '2026-03-05T15:45:00Z' },
  { id: 'conv5', parent_name: '李媽媽', parent_line_id: 'U005', student_name: '李宜庭', message: '這個月學費繳了嗎？', reply: '李宜庭 3 月份學費 NT$3,500 已於 3/1 繳清，收據編號 R2026030101。如需電子收據請回覆「收據」。', intent: 'payment_query', created_at: '2026-03-04T11:20:00Z' },
  { id: 'conv6', parent_name: '陳媽媽', parent_line_id: 'U001', student_name: '陳小利', message: '下週二要請假', reply: '已收到！陳小利下週二（3/11）數學課請假已登記。如需補課請回覆「補課」，我來幫您安排。', intent: 'leave_request', created_at: '2026-03-04T09:00:00Z' },
  { id: 'conv7', parent_name: '黃媽媽', parent_line_id: 'U006', student_name: '黃柏翰', message: '柏翰的聯絡簿有什麼通知？', reply: '黃柏翰最新聯絡簿：1. 下週五段考，範圍到第五課 2. 作業：數學習作 P.45-48 3. 老師評語：上課認真，繼續保持！', intent: 'contact_book', created_at: '2026-03-03T19:30:00Z' },
  { id: 'conv8', parent_name: '王爸爸', parent_line_id: 'U002', student_name: '王大明', message: '暑假有開什麼課？', reply: '今年暑假課程預計 7 月開課，目前規劃有：國中數學衝刺班、英文閱讀班、國文作文班。詳細簡章預計 5 月公告，届時會通知您！', intent: 'general_query', created_at: '2026-03-03T14:15:00Z' },
  { id: 'conv9', parent_name: '劉媽媽', parent_line_id: 'U007', student_name: '劉思涵', message: '思涵想加報英文課', reply: '目前「國中英文菁英班」還有 3 個名額，上課時間：週三 18:00-20:00、週六 10:00-12:00，月費 NT$4,000。要幫您報名嗎？', intent: 'enrollment_query', created_at: '2026-03-02T16:00:00Z' },
  { id: 'conv10', parent_name: '吳媽媽', parent_line_id: 'U008', student_name: '吳承恩', message: '承恩在哪裡？已經過了上課時間', reply: '吳承恩今日（週一）數學個指課 17:00 開始，目前尚未簽到。已通知老師確認中，稍後回覆您。', intent: 'attendance_query', created_at: '2026-03-01T17:15:00Z' },
]

const PARENT_BINDINGS = [
  { id: 'pb1', line_user_id: 'U001', parent_name: '陳媽媽', student_id: 's1', student_name: '陳小利', bound_at: '2026-02-15T10:00:00Z' },
  { id: 'pb2', line_user_id: 'U002', parent_name: '王爸爸', student_id: 's2', student_name: '王大明', bound_at: '2026-02-16T14:00:00Z' },
  { id: 'pb3', line_user_id: 'U003', parent_name: '林媽媽', student_id: 's3', student_name: '林美琪', bound_at: '2026-02-20T09:30:00Z' },
  { id: 'pb4', line_user_id: 'U006', parent_name: '黃媽媽', student_id: 's6', student_name: '黃柏翰', bound_at: '2026-02-25T11:00:00Z' },
  { id: 'pb5', line_user_id: 'U007', parent_name: '劉媽媽', student_id: 's7', student_name: '劉思涵', bound_at: '2026-03-01T16:00:00Z' },
]

const PARENT_INVITES = [
  { id: 'pi1', code: 'INV-CHEN-001', student_id: 's1', student_name: '陳小利', created_at: '2026-02-14T10:00:00Z', expires_at: '2026-02-21T10:00:00Z', used_at: '2026-02-15T10:00:00Z', status: 'used' },
  { id: 'pi2', code: 'INV-WANG-001', student_id: 's2', student_name: '王大明', created_at: '2026-02-15T14:00:00Z', expires_at: '2026-02-22T14:00:00Z', used_at: '2026-02-16T14:00:00Z', status: 'used' },
  { id: 'pi3', code: 'INV-ZHANG-001', student_id: 's4', student_name: '張志豪', created_at: '2026-03-01T10:00:00Z', expires_at: '2026-03-08T10:00:00Z', used_at: null, status: 'pending' },
  { id: 'pi4', code: 'INV-WU-001', student_id: 's8', student_name: '吳承恩', created_at: '2026-03-03T10:00:00Z', expires_at: '2026-03-10T10:00:00Z', used_at: null, status: 'pending' },
]

const SUBSCRIPTION = {
  tenant_id: DEMO_TENANT_1,
  plan: 'standard',
  admin_bot_active: true,
  parent_bot_active: true,
  ai_reply_limit: 500,
  push_limit: 200,
  billing_cycle: 'monthly',
  current_period_start: '2026-03-01T00:00:00Z',
  current_period_end: '2026-03-31T23:59:59Z',
  status: 'active',
  auto_renew: true,
}

const USAGE = {
  tenant_id: DEMO_TENANT_1,
  month: '2026-03',
  api_calls: 83,
  ai_calls: 127,
  push_calls: 45,
  ai_tokens_used: 38500,
}

const SETTINGS = {
  tenant_id: DEMO_TENANT_1,
  parent_bot_active: true,
  welcome_message: '您好！我是蜂神榜補習班的 AI 助手「聞太師」，有任何關於孩子上課、成績、出勤的問題都可以問我！',
  ai_reply_tone: 'friendly',
  line_channel_name: '蜂神榜示範補習班',
  line_channel_id: 'demo-channel-id',
}

interface DemoResponse {
  body: Record<string, unknown>
  status: number
}

export function getDemoResponse(
  method: string,
  path: string,
  _searchParams: URLSearchParams,
  _requestBody?: Record<string, unknown>
): DemoResponse | null {
  // GET /api/subscriptions
  if (method === 'GET' && path === '/api/subscriptions') {
    return { body: SUBSCRIPTION, status: 200 }
  }

  // PUT /api/subscriptions
  if (method === 'PUT' && path === '/api/subscriptions') {
    return { body: SUBSCRIPTION, status: 200 }
  }

  // GET /api/usage
  if (method === 'GET' && path === '/api/usage') {
    return { body: USAGE, status: 200 }
  }

  // GET /api/settings
  if (method === 'GET' && path === '/api/settings') {
    return { body: SETTINGS, status: 200 }
  }

  // PUT /api/settings
  if (method === 'PUT' && path === '/api/settings') {
    return { body: SETTINGS, status: 200 }
  }

  // GET /api/bindings (admin bot bindings)
  if (method === 'GET' && path === '/api/bindings') {
    const adminBindings = [
      { id: 'ab1', user_id: 'T001', user_name: 'Demo 館長', platform_id: 'T001', extra: 'admin', bound_at: '2026-02-10T10:00:00Z' },
      { id: 'ab2', user_id: 'T002', user_name: 'Demo 行政', platform_id: 'T002', extra: 'staff', bound_at: '2026-02-12T14:00:00Z' },
      { id: 'ab3', user_id: 'T003', user_name: 'Demo 老師', platform_id: 'T003', extra: 'teacher', bound_at: '2026-02-20T09:00:00Z' },
    ]
    return { body: { data: adminBindings, total: adminBindings.length } as unknown as Record<string, unknown>, status: 200 }
  }

  // GET /api/parent-bindings
  if (method === 'GET' && path === '/api/parent-bindings') {
    // Normalize to { id, user_id, user_name, bound_at, platform_id, extra }
    const normalized = PARENT_BINDINGS.map(b => ({
      id: b.id,
      user_id: b.line_user_id,
      user_name: b.parent_name,
      bound_at: b.bound_at,
      platform_id: b.line_user_id,
      extra: b.student_name,
    }))
    return { body: { data: normalized, total: normalized.length } as unknown as Record<string, unknown>, status: 200 }
  }

  // DELETE /api/parent-bindings/:id
  if (method === 'DELETE' && path.startsWith('/api/parent-bindings/')) {
    return { body: { success: true }, status: 200 }
  }

  // GET /api/parent-invites
  if (method === 'GET' && path === '/api/parent-invites') {
    return { body: { data: PARENT_INVITES, total: PARENT_INVITES.length } as unknown as Record<string, unknown>, status: 200 }
  }

  // POST /api/parent-invites
  if (method === 'POST' && path === '/api/parent-invites') {
    return { body: { code: 'INV-DEMO-NEW', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }, status: 201 }
  }

  // GET /api/conversations
  if (method === 'GET' && path === '/api/conversations') {
    const bot = _searchParams.get('bot')
    const rawConvs = bot === 'clairvoyant' ? CLAIRVOYANT_CONVERSATIONS
      : bot === 'windear' ? WINDEAR_CONVERSATIONS
      : LINE_CONVERSATIONS
    // Normalize to { id, user_name, message, reply, intent, created_at }
    const convs = rawConvs.map(c => ({
      id: c.id,
      user_name: 'user_name' in c ? c.user_name : 'parent_name' in c ? c.parent_name : '未知',
      message: c.message,
      reply: c.reply,
      intent: c.intent,
      created_at: c.created_at,
    }))
    return { body: { data: convs, total: convs.length } as unknown as Record<string, unknown>, status: 200 }
  }

  // GET /api/conversations/:id
  if (method === 'GET' && path.match(/^\/api\/conversations\/[\w-]+$/)) {
    const id = path.split('/').pop()
    const allConvs = [...LINE_CONVERSATIONS, ...CLAIRVOYANT_CONVERSATIONS, ...WINDEAR_CONVERSATIONS] as Record<string, unknown>[]
    const conv = allConvs.find(c => c.id === id) || LINE_CONVERSATIONS[0]
    return { body: conv as unknown as Record<string, unknown>, status: 200 }
  }

  // GET /api/plans
  if (method === 'GET' && path === '/api/plans') {
    return {
      body: {
        data: [
          { id: 'trial', name: '體驗版', ai_reply_limit: 100, push_limit: 50, price_monthly: 299, price_yearly: 249 },
          { id: 'standard', name: '標準版', ai_reply_limit: 500, push_limit: 200, price_monthly: 599, price_yearly: 499 },
          { id: 'pro', name: '專業版', ai_reply_limit: 2000, push_limit: 1000, price_monthly: 999, price_yearly: 849 },
          { id: 'flagship', name: '旗艦版', ai_reply_limit: 5000, push_limit: 3000, price_monthly: 1899, price_yearly: 1599 },
          { id: 'enterprise', name: '企業版', ai_reply_limit: -1, push_limit: -1, price_monthly: -1, price_yearly: -1 },
        ],
      } as unknown as Record<string, unknown>,
      status: 200,
    }
  }

  // GET /api/billing
  if (method === 'GET' && path === '/api/billing') {
    return {
      body: {
        data: [
          { id: 'bill1', plan: '標準版', amount: 599, currency: 'TWD', status: 'paid', paid_at: '2026-03-01T00:00:00Z', method: 'credit_card' },
          { id: 'bill2', plan: '標準版', amount: 599, currency: 'TWD', status: 'paid', paid_at: '2026-02-01T00:00:00Z', method: 'credit_card' },
          { id: 'bill3', plan: '體驗版', amount: 299, currency: 'TWD', status: 'paid', paid_at: '2026-01-01T00:00:00Z', method: 'atm' },
        ],
      } as unknown as Record<string, unknown>,
      status: 200,
    }
  }

  return null
}

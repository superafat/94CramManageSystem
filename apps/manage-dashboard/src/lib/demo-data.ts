/**
 * Manage Dashboard Demo 假資料模組
 * 當 demo 用戶登入時，API proxy 會回傳這些資料而非呼叫真實 backend
 */

const DEMO_TENANT_1 = '11111111-1111-1111-1111-111111111111'
const DEMO_TENANT_2 = '22222222-2222-2222-2222-222222222222'

// ===== Tenants =====
const TENANTS = [
  { id: DEMO_TENANT_1, name: '蜂神榜示範補習班', slug: 'demo-cram', plan: 'ai', active: true },
]

const TENANT_STATS: Record<string, { conversations: number; knowledgeChunks: number; branches: number }> = {
  [DEMO_TENANT_1]: { conversations: 128, knowledgeChunks: 45, branches: 1 },
  [DEMO_TENANT_2]: { conversations: 32, knowledgeChunks: 12, branches: 1 },
}

// ===== Students =====
const STUDENTS = [
  { id: 's1', name: '陳小利', grade: '國中一', phone: '0912-111-001', email: 'chen@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 95, average_grade: 88, risk_level: null },
  { id: 's2', name: '王大明', grade: '國中二', phone: '0912-111-002', email: 'wang@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 90, average_grade: 76, risk_level: null },
  { id: 's3', name: '林美琪', grade: '國中一', phone: '0912-111-003', email: 'lin@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 98, average_grade: 92, risk_level: null },
  { id: 's4', name: '張志豪', grade: '國中三', phone: '0912-111-004', email: 'zhang@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 80, average_grade: 67, risk_level: 'medium' },
  { id: 's5', name: '李宜庭', grade: '國小六', phone: '0912-111-005', email: 'li@demo.com', status: 'active', joined_date: '2026-02-01', attendance_rate: 85, average_grade: 0, risk_level: null },
  { id: 's6', name: '黃柏翰', grade: '國中二', phone: '0912-111-006', email: 'huang@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 92, average_grade: 83, risk_level: null },
  { id: 's7', name: '劉思涵', grade: '國中一', phone: '0912-111-007', email: 'liu@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 88, average_grade: 79, risk_level: null },
  { id: 's8', name: '吳承恩', grade: '國中三', phone: '0912-111-008', email: 'wu@demo.com', status: 'at_risk', joined_date: '2025-09-01', attendance_rate: 65, average_grade: 58, risk_level: 'high' },
]

// ===== Courses/Classes =====
const COURSES = [
  { id: 'c1', name: '國中數學 A 班', grade: '國中', room: '201', capacity: 15, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 3500, schedule: '週二 18:00-20:00, 週五 18:00-20:00' },
  { id: 'c2', name: '國中英文菁英班', grade: '國中', room: '202', capacity: 12, teacher_id: 't2', teacher_name: '李老師', fee_monthly: 4000, schedule: '週三 18:00-20:00, 週六 10:00-12:00' },
  { id: 'c3', name: '國小先修班', grade: '國小', room: '101', capacity: 10, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 2800, schedule: '週四 16:00-18:00' },
]

// ===== Teachers =====
const TEACHERS = [
  { id: 't1', name: '王老師', email: 'wang@demo.com', phone: '0912-345-678', subject: '數學', hourly_rate: 800, status: 'active' },
  { id: 't2', name: '李老師', email: 'lee@demo.com', phone: '0923-456-789', subject: '英文', hourly_rate: 900, status: 'active' },
]

// ===== Schedules =====
function getWeekSchedules(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const schedules = []
  for (let d = new Date(start); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    const dateStr = d.toISOString().split('T')[0]
    if (dow === 2 || dow === 5) { // 週二、週五
      schedules.push({ id: `sch-${dateStr}-c1`, course_id: 'c1', course_name: '國中數學 A 班', teacher_name: '王老師', room: '201', date: dateStr, start_time: '18:00', end_time: '20:00' })
    }
    if (dow === 3 || dow === 6) { // 週三、週六
      schedules.push({ id: `sch-${dateStr}-c2`, course_id: 'c2', course_name: '國中英文菁英班', teacher_name: '李老師', room: '202', date: dateStr, start_time: dow === 3 ? '18:00' : '10:00', end_time: dow === 3 ? '20:00' : '12:00' })
    }
    if (dow === 4) { // 週四
      schedules.push({ id: `sch-${dateStr}-c3`, course_id: 'c3', course_name: '國小先修班', teacher_name: '王老師', room: '101', date: dateStr, start_time: '16:00', end_time: '18:00' })
    }
  }
  return schedules
}

// ===== Attendance =====
function getAttendance(from: string, to: string) {
  const records = STUDENTS.map((s, i) => ({
    id: `att-${from}-${s.id}`,
    student_id: s.id,
    student_name: s.name,
    date: from,
    status: i < 5 ? 'present' : i === 5 ? 'late' : 'absent',
    check_in_time: i < 5 ? `${from}T15:${50 + i}:00` : i === 5 ? `${from}T16:25:00` : null,
    notes: '',
  }))
  return {
    attendances: records,
    stats: { total: 8, present: 5, late: 1, absent: 2, rate: 75 },
  }
}

// ===== Grades =====
const GRADES = [
  { id: 'g1', student_id: 's1', student_name: '陳小利', subject: '數學', score: 88, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-20' },
  { id: 'g2', student_id: 's2', student_name: '王大明', subject: '數學', score: 72, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-20' },
  { id: 'g3', student_id: 's3', student_name: '林美琪', subject: '數學', score: 95, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-20' },
  { id: 'g4', student_id: 's4', student_name: '張志豪', subject: '數學', score: 64, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-20' },
  { id: 'g5', student_id: 's6', student_name: '黃柏翰', subject: '數學', score: 81, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-20' },
  { id: 'g6', student_id: 's8', student_name: '吳承恩', subject: '數學', score: 58, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-20' },
  { id: 'g7', student_id: 's1', student_name: '陳小利', subject: '英文', score: 92, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-21' },
  { id: 'g8', student_id: 's2', student_name: '王大明', subject: '英文', score: 85, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-21' },
  { id: 'g9', student_id: 's3', student_name: '林美琪', subject: '英文', score: 78, max_score: 100, exam_name: '第一次段考', exam_date: '2026-02-21' },
]

// ===== Alerts =====
const ALERTS = [
  { id: 'al1', action: 'checkin', table_name: 'attendance', change_summary: '陳小利 NFC 刷卡到校', user_name: '系統', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'al2', action: 'checkin', table_name: 'attendance', change_summary: '王大明 NFC 刷卡到校', user_name: '系統', created_at: new Date(Date.now() - 3500000).toISOString() },
  { id: 'al3', action: 'update', table_name: 'grades', change_summary: '新增數學段考成績 6 筆', user_name: 'Demo 館長', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'al4', action: 'create', table_name: 'students', change_summary: '新增學生：李宜庭', user_name: 'Demo 館長', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'al5', action: 'payment', table_name: 'billing', change_summary: '收到繳費：陳小利 NT$3,500', user_name: '系統', created_at: new Date(Date.now() - 172800000).toISOString() },
]

// ===== Route handler =====

export const DEMO_TENANTS = [DEMO_TENANT_1, DEMO_TENANT_2]

export function getDemoResponse(method: string, path: string, searchParams: URLSearchParams): { status: number; body: unknown } | null {
  if (method === 'GET') {
    // Tenant APIs
    if (path === '/api/admin/tenants') return { status: 200, body: { tenants: TENANTS } }
    const tenantStatsMatch = path.match(/^\/api\/admin\/tenants\/([\w-]+)\/stats$/)
    if (tenantStatsMatch) {
      const tid = tenantStatsMatch[1]
      return { status: 200, body: TENANT_STATS[tid] || { conversations: 0, knowledgeChunks: 0, branches: 0 } }
    }

    // Student APIs
    if (path === '/api/admin/students') return { status: 200, body: { data: { students: STUDENTS } } }
    const studentMatch = path.match(/^\/api\/admin\/students\/([\w-]+)$/)
    if (studentMatch) {
      const s = STUDENTS.find(st => st.id === studentMatch[1])
      return s ? { status: 200, body: { student: s } } : { status: 404, body: { error: 'Not found' } }
    }

    // Attendance APIs
    if (path === '/api/admin/attendance') {
      const from = searchParams.get('from') || new Date().toISOString().split('T')[0]
      const to = searchParams.get('to') || from
      return { status: 200, body: getAttendance(from, to) }
    }

    // Grades APIs
    if (path === '/api/admin/grades') return { status: 200, body: { grades: GRADES } }

    // Alerts
    if (path === '/api/admin/alerts') return { status: 200, body: { alerts: ALERTS } }

    // Course/Class APIs (w8 prefix = manage backend routes)
    if (path === '/api/w8/courses') return { status: 200, body: { courses: COURSES } }

    // Teachers
    if (path === '/api/w8/teachers') return { status: 200, body: { teachers: TEACHERS } }

    // Schedules
    if (path === '/api/w8/schedules') {
      const start = searchParams.get('start_date') || '2026-02-24'
      const end = searchParams.get('end_date') || '2026-03-02'
      return { status: 200, body: { schedules: getWeekSchedules(start, end) } }
    }

    // Health
    if (path === '/api/health') return { status: 200, body: { status: 'ok' } }

    // Pending users
    if (path === '/api/admin/pending-users') return { status: 200, body: { users: [] } }

    // Trials
    if (path === '/api/admin/trials') return { status: 200, body: { trials: [] } }

    // Salary
    if (path.startsWith('/api/admin/salary') || path.startsWith('/api/w8/salary')) {
      return { status: 200, body: { records: [], summary: { totalHours: 0, totalAmount: 0 } } }
    }

    // Reports
    if (path.startsWith('/api/admin/reports') || path.startsWith('/api/w8/reports')) {
      return { status: 200, body: { data: {} } }
    }

    // Knowledge
    if (path.startsWith('/api/admin/knowledge')) {
      return { status: 200, body: { chunks: [], count: 0 } }
    }

    // Conversations
    if (path.startsWith('/api/admin/conversations') || path.startsWith('/api/bot/conversations')) {
      return { status: 200, body: { conversations: [], total: 0 } }
    }
  }

  // Write operations — return success
  if (method === 'POST') {
    if (path === '/api/bot/ai-query') {
      return { status: 200, body: { answer: '您好！這是 Demo 模式，AI 功能在正式版中可用。目前補習班共有 8 位學生，3 個班級。', model: 'demo', intent: 'general_query', latencyMs: 150 } }
    }
    if (path === '/api/bot/rag-search') {
      return { status: 200, body: { sources: [], count: 0 } }
    }
    if (path.includes('/knowledge/ingest')) {
      return { status: 200, body: { ok: true, stored: 1 } }
    }
    // Generic POST success
    return { status: 200, body: { success: true, message: 'Demo 操作成功' } }
  }

  if (method === 'PUT' || method === 'PATCH') {
    return { status: 200, body: { success: true } }
  }

  if (method === 'DELETE') {
    return { status: 200, body: { success: true } }
  }

  return null
}

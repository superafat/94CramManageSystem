/**
 * InClass Demo 假資料模組
 * 當 demo 用戶登入時，API proxy 會回傳這些資料而非呼叫真實 backend
 */

const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111'

// ===== 學生 =====
const STUDENTS = [
  { id: 's1', name: '陳小利', grade: '國中一', nfcId: 'NFC-001', classId: 'c1', birthDate: '2013-03-15', schoolName: '大安國中', notes: '' },
  { id: 's2', name: '王大明', grade: '國中二', nfcId: 'NFC-002', classId: 'c1', birthDate: '2012-08-22', schoolName: '仁愛國中', notes: '' },
  { id: 's3', name: '林美琪', grade: '國中一', nfcId: 'NFC-003', classId: 'c2', birthDate: '2013-05-10', schoolName: '大安國中', notes: '數學資優班' },
  { id: 's4', name: '張志豪', grade: '國中三', nfcId: 'NFC-004', classId: 'c2', birthDate: '2011-11-28', schoolName: '信義國中', notes: '' },
  { id: 's5', name: '李宜庭', grade: '國小六', nfcId: 'NFC-005', classId: 'c3', birthDate: '2014-01-07', schoolName: '幸安國小', notes: '新生' },
  { id: 's6', name: '黃柏翰', grade: '國中二', nfcId: 'NFC-006', classId: 'c1', birthDate: '2012-06-14', schoolName: '仁愛國中', notes: '' },
  { id: 's7', name: '劉思涵', grade: '國中一', nfcId: 'NFC-007', classId: 'c3', birthDate: '2013-09-03', schoolName: '大安國中', notes: '' },
  { id: 's8', name: '吳承恩', grade: '國中三', nfcId: 'NFC-008', classId: 'c2', birthDate: '2011-04-19', schoolName: '信義國中', notes: '即將畢業' },
]

// ===== 班級 =====
const CLASSES = [
  { id: 'c1', name: '國中數學 A 班', grade: '國中', room: '201', capacity: 15, feeMonthly: 3500, feeQuarterly: 9800, feeSemester: 18000, feeYearly: 33000 },
  { id: 'c2', name: '國中英文菁英班', grade: '國中', room: '202', capacity: 12, feeMonthly: 4000, feeQuarterly: 11200, feeSemester: 20000, feeYearly: 36000 },
  { id: 'c3', name: '國小先修班', grade: '國小', room: '101', capacity: 10, feeMonthly: 2800, feeQuarterly: 7800, feeSemester: 14000, feeYearly: 25000 },
]

// ===== 今日出勤 =====
function getTodayAttendance() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  return {
    stats: { total: 8, arrived: 5, late: 1, absent: 2 },
    attendances: [
      { id: 'a1', studentId: 's1', studentName: '陳小利', status: 'arrived', checkInTime: `${today}T15:55:00` },
      { id: 'a2', studentId: 's2', studentName: '王大明', status: 'arrived', checkInTime: `${today}T15:58:00` },
      { id: 'a3', studentId: 's3', studentName: '林美琪', status: 'arrived', checkInTime: `${today}T16:00:00` },
      { id: 'a4', studentId: 's6', studentName: '黃柏翰', status: 'arrived', checkInTime: `${today}T15:50:00` },
      { id: 'a5', studentId: 's7', studentName: '劉思涵', status: 'arrived', checkInTime: `${today}T16:02:00` },
      { id: 'a6', studentId: 's4', studentName: '張志豪', status: 'late', checkInTime: `${today}T16:25:00` },
      { id: 'a7', studentId: 's5', studentName: '李宜庭', status: 'absent', checkInTime: '' },
      { id: 'a8', studentId: 's8', studentName: '吳承恩', status: 'absent', checkInTime: '' },
    ],
  }
}

// ===== 考試 =====
const EXAMS = [
  { id: 'e1', name: '第一次段考', subject: '數學', maxScore: 100, examDate: '2026-02-20' },
  { id: 'e2', name: '第一次段考', subject: '英文', maxScore: 100, examDate: '2026-02-21' },
  { id: 'e3', name: '小考 Week 8', subject: '數學', maxScore: 50, examDate: '2026-02-25' },
]

const SCORES: Record<string, { exam: typeof EXAMS[0]; scores: Array<{ id: string; studentId: string; studentName: string; score: number }>; stats: { average: number; highest: number; lowest: number; total: number } }> = {
  e1: {
    exam: EXAMS[0],
    scores: [
      { id: 'sc1', studentId: 's1', studentName: '陳小利', score: 88 },
      { id: 'sc2', studentId: 's2', studentName: '王大明', score: 72 },
      { id: 'sc3', studentId: 's3', studentName: '林美琪', score: 95 },
      { id: 'sc4', studentId: 's4', studentName: '張志豪', score: 64 },
      { id: 'sc5', studentId: 's6', studentName: '黃柏翰', score: 81 },
      { id: 'sc6', studentId: 's8', studentName: '吳承恩', score: 58 },
    ],
    stats: { average: 76.3, highest: 95, lowest: 58, total: 6 },
  },
  e2: {
    exam: EXAMS[1],
    scores: [
      { id: 'sc7', studentId: 's1', studentName: '陳小利', score: 92 },
      { id: 'sc8', studentId: 's2', studentName: '王大明', score: 85 },
      { id: 'sc9', studentId: 's3', studentName: '林美琪', score: 78 },
      { id: 'sc10', studentId: 's4', studentName: '張志豪', score: 70 },
      { id: 'sc11', studentId: 's6', studentName: '黃柏翰', score: 88 },
      { id: 'sc12', studentId: 's8', studentName: '吳承恩', score: 75 },
    ],
    stats: { average: 81.3, highest: 92, lowest: 70, total: 6 },
  },
  e3: {
    exam: EXAMS[2],
    scores: [
      { id: 'sc13', studentId: 's1', studentName: '陳小利', score: 45 },
      { id: 'sc14', studentId: 's2', studentName: '王大明', score: 38 },
      { id: 'sc15', studentId: 's3', studentName: '林美琪', score: 48 },
    ],
    stats: { average: 43.7, highest: 48, lowest: 38, total: 3 },
  },
}

// ===== 繳費紀錄 =====
const PAYMENT_RECORDS = [
  { id: 'p1', studentId: 's1', classId: 'c1', paymentType: 'monthly', amount: 3500, periodMonth: '2026-02', paymentDate: '2026-02-01', notes: '' },
  { id: 'p2', studentId: 's2', classId: 'c1', paymentType: 'monthly', amount: 3500, periodMonth: '2026-02', paymentDate: '2026-02-03', notes: '' },
  { id: 'p3', studentId: 's3', classId: 'c2', paymentType: 'quarterly', amount: 11200, periodMonth: '2026-01', paymentDate: '2026-01-05', notes: '預繳到三月' },
  { id: 'p4', studentId: 's6', classId: 'c1', paymentType: 'monthly', amount: 3500, periodMonth: '2026-02', paymentDate: '2026-02-05', notes: '' },
  { id: 'p5', studentId: 's5', classId: 'c3', paymentType: 'monthly', amount: 2800, periodMonth: '2026-02', paymentDate: '2026-02-10', notes: '新生優惠' },
]

// ===== Alerts =====
const ALERTS = [
  { id: 'al1', action: 'checkin', table_name: 'attendance', change_summary: '陳小利 NFC 刷卡到校', user_name: '系統', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'al2', action: 'checkin', table_name: 'attendance', change_summary: '王大明 NFC 刷卡到校', user_name: '系統', created_at: new Date(Date.now() - 3500000).toISOString() },
  { id: 'al3', action: 'update', table_name: 'scores', change_summary: '新增數學小考成績 3 筆', user_name: 'Demo 管理員', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'al4', action: 'create', table_name: 'students', change_summary: '新增學生：李宜庭', user_name: 'Demo 管理員', created_at: new Date(Date.now() - 86400000).toISOString() },
]

// ===== Dashboard Stats =====
const DASHBOARD_STATS = {
  totalStudents: 8,
  newStudentsThisMonth: 1,
  attendanceRate: 87.5,
  totalRevenue: 24500,
  stats: { totalStudents: 8, activeStudents: 8, totalClasses: 3, totalTeachers: 2 },
}

// ===== Reports =====
function getAttendanceReport(month?: string) {
  const m = month || '2026-02'
  const studentStats = STUDENTS.map((s, i) => ({
    studentId: s.id,
    studentName: s.name,
    arrived: 15 - i,
    late: i % 3,
    absent: i % 2,
    total: 18,
    rate: Math.round(((15 - i + (i % 3)) / 18) * 100),
  }))
  return {
    month: m,
    dailyStats: {},
    studentStats,
    summary: { totalDays: 18, totalAttendances: 120, averageRate: 87, totalStudents: 8 },
  }
}

// ===== Admin =====
const PENDING_USERS: Array<{ id: string; email: string; name: string; role: string; status: string; createdAt: string }> = []

// ===== 路由 handler =====

export const DEMO_TENANT = DEMO_TENANT_ID

export function getDemoResponse(method: string, path: string, searchParams: URLSearchParams): { status: number; body: unknown } | null {
  // GET endpoints
  if (method === 'GET') {
    if (path === '/api/students') return { status: 200, body: { students: STUDENTS } }
    if (path === '/api/classes') return { status: 200, body: { classes: CLASSES } }
    if (path === '/api/attendance/today') return { status: 200, body: getTodayAttendance() }
    if (path === '/api/exams') return { status: 200, body: { exams: EXAMS } }
    if (path === '/api/alerts') return { status: 200, body: { alerts: ALERTS } }
    if (path === '/api/dashboard/stats') return { status: 200, body: DASHBOARD_STATS }
    if (path === '/api/payment-records') return { status: 200, body: { records: PAYMENT_RECORDS } }
    if (path === '/api/teachers') return { status: 200, body: { teachers: [{ id: 't1', name: '王老師', email: 'wang@demo.com', phone: '0912-345-678', subject: '數學' }, { id: 't2', name: '李老師', email: 'lee@demo.com', phone: '0923-456-789', subject: '英文' }] } }
    if (path === '/api/schedules') return { status: 200, body: { schedules: [] } }
    if (path === '/api/payments') return { status: 200, body: { payments: PAYMENT_RECORDS } }
    if (path === '/api/admin/pending-users') return { status: 200, body: { users: PENDING_USERS } }

    // Dynamic routes
    const examScoresMatch = path.match(/^\/api\/exams\/(\w+)\/scores$/)
    if (examScoresMatch) {
      const examId = examScoresMatch[1]
      const data = SCORES[examId]
      if (data) return { status: 200, body: data }
      return { status: 200, body: { exam: EXAMS.find(e => e.id === examId) || {}, scores: [], stats: { average: 0, highest: 0, lowest: 0, total: 0 } } }
    }

    const scoresMatch = path.match(/^\/api\/scores\/(\w+)$/)
    if (scoresMatch) {
      const studentId = scoresMatch[1]
      const allScores = Object.values(SCORES).flatMap(d => d.scores.filter(s => s.studentId === studentId))
      return { status: 200, body: { scores: allScores } }
    }

    const classBillingMatch = path.match(/^\/api\/classes\/(\w+)\/billing$/)
    if (classBillingMatch) {
      const classId = classBillingMatch[1]
      const cls = CLASSES.find(c => c.id === classId)
      const classStudents = STUDENTS.filter(s => s.classId === classId)
      const periodMonth = searchParams.get('periodMonth') || '2026-02'
      return {
        status: 200,
        body: {
          class: cls,
          periodMonth,
          students: classStudents.map(s => {
            const pr = PAYMENT_RECORDS.find(p => p.studentId === s.id && p.classId === classId)
            return { id: s.id, name: s.name, grade: s.grade, isPaid: !!pr, paymentRecord: pr || null }
          }),
          stats: {
            total: classStudents.length,
            paid: classStudents.filter(s => PAYMENT_RECORDS.some(p => p.studentId === s.id && p.classId === classId)).length,
            unpaid: classStudents.filter(s => !PAYMENT_RECORDS.some(p => p.studentId === s.id && p.classId === classId)).length,
          },
        },
      }
    }

    const reportMatch = path.match(/^\/api\/reports\/attendance$/)
    if (reportMatch) return { status: 200, body: getAttendanceReport(searchParams.get('month') || undefined) }
  }

  // Write operations — return success without doing anything
  if (method === 'POST') {
    if (path === '/api/students') return { status: 201, body: { id: `s${Date.now()}`, name: 'Demo 學生', grade: '', nfcId: '', classId: '', birthDate: '', schoolName: '', notes: '' } }
    if (path === '/api/classes') return { status: 201, body: { id: `c${Date.now()}`, name: 'Demo 班級' } }
    if (path === '/api/exams') return { status: 201, body: { id: `e${Date.now()}`, name: 'Demo 考試', subject: '', maxScore: 100, examDate: new Date().toISOString().split('T')[0] } }
    if (path === '/api/attendance/checkin') return { status: 200, body: { success: true, message: 'Demo 打卡成功' } }
    if (path === '/api/payment-records/batch') return { status: 200, body: { success: true, message: 'Demo 繳費紀錄已建立' } }
    if (path === '/api/notify/absence') return { status: 200, body: { success: true, message: 'Demo 通知已發送' } }
    if (path.match(/^\/api\/exams\/\w+\/scores$/)) return { status: 201, body: { id: `sc${Date.now()}`, score: 0 } }
    if (path.match(/^\/api\/admin\/users\/\w+\/(approve|reject)$/)) return { status: 200, body: { success: true } }
  }

  if (method === 'PUT') {
    if (path.match(/^\/api\/students\/\w+$/)) return { status: 200, body: { success: true } }
    if (path.match(/^\/api\/classes\/\w+$/)) return { status: 200, body: { success: true } }
  }

  if (method === 'DELETE') {
    if (path.match(/^\/api\/students\/\w+$/)) return { status: 200, body: { success: true } }
    if (path.match(/^\/api\/classes\/\w+$/)) return { status: 200, body: { success: true } }
  }

  return null
}

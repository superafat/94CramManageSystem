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

type DemoContactBookScore = {
  id: string
  subject: string
  score: number
  classAvg?: number
  fullScore?: number
}

type DemoContactBookPhoto = {
  id: string
  url: string
  caption?: string
  sortOrder?: number
}

type DemoContactBookFeedback = {
  id: string
  parentUserId: string
  rating: number
  comment?: string
  createdAt: string
}

type DemoContactBookAiAnalysis = {
  id: string
  weaknessSummary: string
  recommendedCourseName?: string
  recommendedCourseDesc?: string
}

type DemoContactBookEntry = {
  id: string
  studentId: string
  courseId: string
  entryDate: string
  status: 'draft' | 'sent' | 'read' | 'pending'
  groupProgress: string | null
  groupHomework: string | null
  individualNote: string | null
  individualHomework: string | null
  teacherTip: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
  scores: DemoContactBookScore[]
  photos: DemoContactBookPhoto[]
  feedback: DemoContactBookFeedback[]
  aiAnalysis: DemoContactBookAiAnalysis | null
}

let CONTACT_BOOK_ENTRIES: DemoContactBookEntry[] = [
  {
    id: 'cbe1',
    studentId: 's1',
    courseId: 'c1',
    entryDate: '2026-03-07',
    status: 'sent',
    groupProgress: '今天完成一元一次方程式應用題，學生能掌握列式與驗算。',
    groupHomework: '講義第 12 到 14 頁，完成後拍照上傳。',
    individualNote: '陳小利今天主動發言，解題步驟清楚。',
    individualHomework: '加強第 5 題與第 8 題的文字轉換。',
    teacherTip: '建議晚上複習錯題本 15 分鐘。',
    sentAt: '2026-03-07T10:20:00.000Z',
    readAt: '2026-03-07T12:05:00.000Z',
    createdAt: '2026-03-07T09:50:00.000Z',
    updatedAt: '2026-03-07T10:20:00.000Z',
    scores: [{ id: 'cbes1', subject: '數學隨堂測驗', score: 88, classAvg: 76, fullScore: 100 }],
    photos: [{ id: 'cbep1', url: 'https://placehold.co/320x240/e9e2d8/5c4b3b?text=%E8%AA%B2%E5%A0%82%E7%B4%80%E9%8C%84', caption: '課堂解題練習', sortOrder: 1 }],
    feedback: [{ id: 'cbef1', parentUserId: 'parent-1', rating: 5, comment: '收到，今晚會陪孩子複習。', createdAt: '2026-03-07T12:05:00.000Z' }],
    aiAnalysis: { id: 'cbea1', weaknessSummary: '計算穩定，但遇到文字題時仍需多一步拆解條件。', recommendedCourseName: '數學應用題加強', recommendedCourseDesc: '每天練 2 題關鍵字判斷；整理題意再列式；週末複習錯題本' },
  },
  {
    id: 'cbe2',
    studentId: 's2',
    courseId: 'c1',
    entryDate: '2026-03-07',
    status: 'draft',
    groupProgress: '今天完成一元一次方程式應用題，學生能掌握列式與驗算。',
    groupHomework: '講義第 12 到 14 頁，完成後拍照上傳。',
    individualNote: '王大明基礎穩定，但計算速度較慢。',
    individualHomework: '請特別完成第 9 題到第 11 題。',
    teacherTip: '先求穩定正確，再練速度。',
    sentAt: null,
    readAt: null,
    createdAt: '2026-03-07T09:55:00.000Z',
    updatedAt: '2026-03-07T09:55:00.000Z',
    scores: [{ id: 'cbes2', subject: '數學隨堂測驗', score: 72, classAvg: 76, fullScore: 100 }],
    photos: [],
    feedback: [],
    aiAnalysis: null,
  },
  {
    id: 'cbe3',
    studentId: 's3',
    courseId: 'c2',
    entryDate: '2026-03-07',
    status: 'read',
    groupProgress: '本日完成閱讀測驗與句型改寫。',
    groupHomework: '完成文法講義 Unit 3。',
    individualNote: '林美琪表現積極，口說練習完整。',
    individualHomework: '複習被動語態與片語整理。',
    teacherTip: '可開始挑戰進階閱讀題型。',
    sentAt: '2026-03-07T10:30:00.000Z',
    readAt: '2026-03-07T11:40:00.000Z',
    createdAt: '2026-03-07T10:00:00.000Z',
    updatedAt: '2026-03-07T10:30:00.000Z',
    scores: [{ id: 'cbes3', subject: '英文小考', score: 95, classAvg: 84, fullScore: 100 }],
    photos: [],
    feedback: [{ id: 'cbef3', parentUserId: 'parent-3', rating: 4, comment: '謝謝老師，會加強文法複習。', createdAt: '2026-03-07T11:40:00.000Z' }],
    aiAnalysis: { id: 'cbea3', weaknessSummary: '閱讀理解佳，但文法細節仍會遺漏冠詞。', recommendedCourseName: '英文文法整合班', recommendedCourseDesc: '冠詞與時態對照；句型改寫練習；每週文法小測' },
  },
]

function nowIso(): string {
  return new Date().toISOString()
}

function getStudentName(studentId: string): string {
  return STUDENTS.find((student) => student.id === studentId)?.name ?? ''
}

function getContactBookEntries(courseId: string, date: string) {
  const entries = CONTACT_BOOK_ENTRIES
    .filter((entry) => entry.courseId === courseId && entry.entryDate === date)
    .map((entry) => ({
      ...entry,
      studentName: getStudentName(entry.studentId),
    }))

  const studentsWithoutEntry = STUDENTS
    .filter((student) => student.classId === courseId && !entries.some((entry) => entry.studentId === student.id))
    .map((student) => ({
      studentId: student.id,
      studentName: student.name,
      studentGrade: student.grade,
    }))

  return { entries, studentsWithoutEntry }
}

function ensureContactBookEntries(
  courseId: string,
  entryDate: string,
  studentIds: string[],
  groupProgress?: string,
  groupHomework?: string,
) {
  const createdIds: string[] = []
  for (const studentId of studentIds) {
    const existing = CONTACT_BOOK_ENTRIES.find((entry) => entry.studentId === studentId && entry.courseId === courseId && entry.entryDate === entryDate)
    if (existing) {
      existing.groupProgress = groupProgress ?? existing.groupProgress
      existing.groupHomework = groupHomework ?? existing.groupHomework
      existing.updatedAt = nowIso()
      createdIds.push(existing.id)
      continue
    }

    const id = `cbe-${studentId}-${entryDate}`
    CONTACT_BOOK_ENTRIES.push({
      id,
      studentId,
      courseId,
      entryDate,
      status: 'draft',
      groupProgress: groupProgress ?? '',
      groupHomework: groupHomework ?? '',
      individualNote: '',
      individualHomework: '',
      teacherTip: '',
      sentAt: null,
      readAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      scores: [],
      photos: [],
      feedback: [],
      aiAnalysis: null,
    })
    createdIds.push(id)
  }
  return createdIds
}

function updateContactBookEntry(
  entryId: string,
  updates: Partial<Pick<DemoContactBookEntry, 'groupProgress' | 'groupHomework' | 'individualNote' | 'individualHomework' | 'teacherTip' | 'scores'>>,
) {
  const entry = CONTACT_BOOK_ENTRIES.find((item) => item.id === entryId)
  if (!entry) return null
  entry.groupProgress = updates.groupProgress ?? entry.groupProgress
  entry.groupHomework = updates.groupHomework ?? entry.groupHomework
  entry.individualNote = updates.individualNote ?? entry.individualNote
  entry.individualHomework = updates.individualHomework ?? entry.individualHomework
  entry.teacherTip = updates.teacherTip ?? entry.teacherTip
  entry.scores = updates.scores ?? entry.scores
  entry.updatedAt = nowIso()
  return entry
}

function sendContactBookEntry(entryId: string) {
  const entry = CONTACT_BOOK_ENTRIES.find((item) => item.id === entryId)
  if (!entry) return null
  entry.status = 'sent'
  entry.sentAt = nowIso()
  entry.updatedAt = nowIso()
  return entry
}

function appendPhotoToEntry(entryId: string | null, caption = 'Demo 上傳照片') {
  const photoId = `photo-${Date.now()}`
  const photo = {
    id: photoId,
    url: `https://placehold.co/320x240/d9d2c6/5c4b3b?text=${photoId}`,
    caption,
    sortOrder: 1,
  }
  if (entryId) {
    const entry = CONTACT_BOOK_ENTRIES.find((item) => item.id === entryId)
    if (entry) {
      entry.photos.push(photo)
      entry.updatedAt = nowIso()
    }
  }
  return photo
}

function deleteContactBookPhoto(photoId: string) {
  for (const entry of CONTACT_BOOK_ENTRIES) {
    const nextPhotos = entry.photos.filter((photo) => photo.id !== photoId)
    if (nextPhotos.length !== entry.photos.length) {
      entry.photos = nextPhotos
      entry.updatedAt = nowIso()
      return true
    }
  }
  return false
}

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
  // Generate daily stats for the month
  const dailyStats: Record<string, { arrived: number; late: number; absent: number; total: number; rate: number }> = {}
  const [year, mon] = m.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, mon - 1, d).getDay()
    if (dow === 0 || dow === 6) continue // skip weekends (Sun/Sat simplification — only weekday classes)
    if (dow === 1) continue // no class on Monday
    const dateStr = `${m}-${String(d).padStart(2, '0')}`
    const arrived = 5 + (d % 2)
    const late = d % 3 === 0 ? 1 : 0
    const absent = 8 - arrived - late
    dailyStats[dateStr] = { arrived, late, absent, total: 8, rate: Math.round(((arrived + late) / 8) * 100) }
  }
  return {
    month: m,
    dailyStats,
    studentStats,
    summary: { totalDays: 18, totalAttendances: 120, averageRate: 87, totalStudents: 8 },
  }
}

// ===== Admin =====
const PENDING_USERS: Array<{ id: string; email: string; name: string; role: string; status: string; createdAt: string }> = []

// ===== 路由 handler =====

export const DEMO_TENANT = DEMO_TENANT_ID

export function getDemoResponse(
  method: string,
  path: string,
  searchParams: URLSearchParams,
  body?: Record<string, unknown>,
): { status: number; body: unknown } | null {
  // GET endpoints
  if (method === 'GET') {
    // AuthContext expects { user: {...}, school: {...} }
    if (path === '/api/auth/me') return { status: 200, body: {
      user: { id: 'demo-admin', email: 'demo@94cram.com', name: 'Demo 管理員', role: 'admin', isDemo: true },
      school: { id: DEMO_TENANT_ID, name: '蜂神榜示範補習班' },
    } }
    if (path === '/api/students') return { status: 200, body: { students: STUDENTS } }
    if (path === '/api/classes') return { status: 200, body: { classes: CLASSES } }
    if (path === '/api/w8/courses') return { status: 200, body: { success: true, data: { courses: CLASSES.map(({ id, name }) => ({ id, name })) } } }
    if (path === '/api/attendance/today') return { status: 200, body: getTodayAttendance() }
    if (path === '/api/exams') return { status: 200, body: { exams: EXAMS } }
    if (path === '/api/alerts') return { status: 200, body: { alerts: ALERTS } }
    if (path === '/api/dashboard/stats') return { status: 200, body: DASHBOARD_STATS }
    if (path === '/api/payment-records') return { status: 200, body: { records: PAYMENT_RECORDS } }
    if (path === '/api/teachers') return { status: 200, body: { teachers: [{ id: 't1', name: '王老師', email: 'wang@demo.com', phone: '0912-345-678', subject: '數學' }, { id: 't2', name: '李老師', email: 'lee@demo.com', phone: '0923-456-789', subject: '英文' }] } }
    if (path === '/api/schedules') return { status: 200, body: { schedules: [] } }
    if (path === '/api/payments') return { status: 200, body: { payments: PAYMENT_RECORDS } }
    if (path === '/api/admin/pending-users') return { status: 200, body: { users: PENDING_USERS } }

    if (path === '/api/contact-book/entries') {
      const courseId = searchParams.get('courseId') || 'c1'
      const date = searchParams.get('date') || '2026-03-07'
      return { status: 200, body: { success: true, data: getContactBookEntries(courseId, date) } }
    }

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
    if (path === '/api/contact-book/templates') return { status: 200, body: { success: true, data: { applied: true } } }
    if (path === '/api/contact-book/ai-analysis') return {
      status: 200,
      body: {
        success: true,
        data: {
          weaknessSummary: '目前基礎概念已建立，建議加強題意拆解與計算穩定度。',
          recommendedCourseName: 'AI 個別化加強計畫',
          recommendedCourseDesc: '每天複習錯題；每週一次重點觀念整理；建立解題檢查習慣',
        },
      },
    }
    if (path === '/api/contact-book/ai-writing') return {
      status: 200,
      body: {
        success: true,
        data: {
          text: '孩子今天在課堂上投入度不錯，已能跟上主要進度。建議家長回家後協助複習錯題與重點講義，持續建立穩定的學習節奏。',
        },
      },
    }
    if (path === '/api/contact-book/upload') {
      const entryId = typeof body?.entryId === 'string' ? body.entryId : null
      const photo = appendPhotoToEntry(entryId)
      return {
        status: 200,
        body: {
          success: true,
          data: photo,
        },
      }
    }
    if (path === '/api/contact-book/entries') {
      const courseId = typeof body?.courseId === 'string' ? body.courseId : 'c1'
      const entryDate = typeof body?.entryDate === 'string' ? body.entryDate : '2026-03-07'
      const groupProgress = typeof body?.groupProgress === 'string' ? body.groupProgress : undefined
      const groupHomework = typeof body?.groupHomework === 'string' ? body.groupHomework : undefined
      const studentIds = Array.isArray(body?.studentIds)
        ? body.studentIds.filter((studentId): studentId is string => typeof studentId === 'string')
        : []
      const ids = ensureContactBookEntries(courseId, entryDate, studentIds, groupProgress, groupHomework)
      return { status: 200, body: { success: true, data: { ids } } }
    }
    if (path.match(/^\/api\/exams\/\w+\/scores$/)) return { status: 201, body: { id: `sc${Date.now()}`, score: 0 } }
    if (path.match(/^\/api\/admin\/users\/\w+\/(approve|reject)$/)) return { status: 200, body: { success: true } }
    const contactBookSendMatch = path.match(/^\/api\/contact-book\/entries\/(.+)\/send$/)
    if (contactBookSendMatch) {
      const entry = sendContactBookEntry(contactBookSendMatch[1])
      return { status: entry ? 200 : 404, body: entry ? { success: true, data: { id: entry.id, status: entry.status } } : { success: false, message: '找不到聯絡簿資料' } }
    }
  }

  if (method === 'PUT') {
    if (path.match(/^\/api\/students\/\w+$/)) return { status: 200, body: { success: true } }
    if (path.match(/^\/api\/classes\/\w+$/)) return { status: 200, body: { success: true } }
    const contactBookEntryMatch = path.match(/^\/api\/contact-book\/entries\/(.+)$/)
    if (contactBookEntryMatch) {
      const entry = updateContactBookEntry(contactBookEntryMatch[1], {
        groupProgress: typeof body?.groupProgress === 'string' ? body.groupProgress : undefined,
        groupHomework: typeof body?.groupHomework === 'string' ? body.groupHomework : undefined,
        individualNote: typeof body?.individualNote === 'string' ? body.individualNote : undefined,
        individualHomework: typeof body?.individualHomework === 'string' ? body.individualHomework : undefined,
        teacherTip: typeof body?.teacherTip === 'string' ? body.teacherTip : undefined,
        scores: Array.isArray(body?.scores) ? body.scores.filter((score): score is DemoContactBookScore => typeof score === 'object' && score !== null) : undefined,
      })
      return { status: entry ? 200 : 404, body: entry ? { success: true, data: { id: entry.id } } : { success: false, message: '找不到聯絡簿資料' } }
    }
  }

  if (method === 'DELETE') {
    if (path.match(/^\/api\/students\/\w+$/)) return { status: 200, body: { success: true } }
    if (path.match(/^\/api\/classes\/\w+$/)) return { status: 200, body: { success: true } }
    const contactBookPhotoMatch = path.match(/^\/api\/contact-book\/photos\/(.+)$/)
    if (contactBookPhotoMatch) {
      return { status: 200, body: { success: deleteContactBookPhoto(contactBookPhotoMatch[1]) } }
    }
  }

  return null
}

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
  { id: 'c1', name: '國中數學 A 班', subject: '數學', grade: '國中', room: '201', capacity: 15, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 3500, duration_minutes: 120, schedule: '週二 18:00-20:00, 週五 18:00-20:00' },
  { id: 'c2', name: '國中英文菁英班', subject: '英文', grade: '國中', room: '202', capacity: 12, teacher_id: 't2', teacher_name: '李老師', fee_monthly: 4000, duration_minutes: 120, schedule: '週三 18:00-20:00, 週六 10:00-12:00' },
  { id: 'c3', name: '國小先修班', subject: '數學', grade: '國小', room: '101', capacity: 10, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 2800, duration_minutes: 120, schedule: '週四 16:00-18:00' },
]

// ===== Teachers =====
const TEACHERS = [
  { id: 't1', name: '王老師', title: '資深講師', email: 'wang@demo.com', phone: '0912-345-678', subject: '數學', hourly_rate: 800, rate_per_class: '800', status: 'active', teacher_role: null, salary_type: 'per_class', base_salary: null, subjects: ['數學'], grade_levels: ['國中', '國小'] },
  { id: 't2', name: '李老師', title: '首席講師', email: 'lee@demo.com', phone: '0923-456-789', subject: '英文', hourly_rate: 900, rate_per_class: '900', status: 'active', teacher_role: null, salary_type: 'per_class', base_salary: null, subjects: ['英文'], grade_levels: ['國中'] },
  { id: 't3', name: '陳主任', title: '教務主任', email: 'chen@demo.com', phone: '0934-567-890', subject: '國文', hourly_rate: 0, rate_per_class: '0', status: 'active', teacher_role: '主任', salary_type: 'monthly', base_salary: '45000', subjects: ['國文', '作文'], grade_levels: ['國中', '高中'] },
  { id: 't4', name: '林助教', title: '助教', email: 'lin@demo.com', phone: '0945-678-901', subject: '數學', hourly_rate: 200, rate_per_class: '0', status: 'active', teacher_role: '助教', salary_type: 'hourly', base_salary: null, subjects: ['數學'], grade_levels: ['國中'] },
]

// ===== Schedules =====
function getWeekSchedules(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const schedules = []
  for (let d = new Date(start); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    const dateStr = d.toISOString().split('T')[0]
    const isPast = d < new Date()
    if (dow === 2 || dow === 5) { // 週二、週五
      schedules.push({ id: `sch-${dateStr}-c1`, course_id: 'c1', course_name: '國中數學 A 班', subject: '數學', teacher_id: 't1', teacher_name: '王老師', teacher_title: '資深講師', room: '201', scheduled_date: dateStr, start_time: '18:00:00', end_time: '20:00:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '800' })
    }
    if (dow === 3 || dow === 6) { // 週三、週六
      const st = dow === 3 ? '18:00:00' : '10:00:00'
      const et = dow === 3 ? '20:00:00' : '12:00:00'
      schedules.push({ id: `sch-${dateStr}-c2`, course_id: 'c2', course_name: '國中英文菁英班', subject: '英文', teacher_id: 't2', teacher_name: '李老師', teacher_title: '首席講師', room: '202', scheduled_date: dateStr, start_time: st, end_time: et, status: isPast ? 'completed' : 'scheduled', rate_per_class: '900' })
    }
    if (dow === 4) { // 週四
      schedules.push({ id: `sch-${dateStr}-c3`, course_id: 'c3', course_name: '國小先修班', subject: '數學', teacher_id: 't1', teacher_name: '王老師', teacher_title: '資深講師', room: '101', scheduled_date: dateStr, start_time: '16:00:00', end_time: '18:00:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '800' })
    }
  }
  return schedules
}

// ===== Attendance =====
function getAttendance(from: string, _to: string) {
  const gradeMap: Record<string, string> = { 's1': '國中一', 's2': '國中二', 's3': '國中一', 's4': '國中三', 's5': '國小六', 's6': '國中二', 's7': '國中一', 's8': '國中三' }
  const records = STUDENTS.map((s, i) => {
    const status = i < 5 ? 'present' : i === 5 ? 'late' : 'absent'
    return {
      id: `att-${from}-${s.id}`,
      student_id: s.id,
      student_name: s.name,
      date: from,
      present: status === 'present' || status === 'late',
      status,
      check_in_time: i < 5 ? `${from}T15:${50 + i}:00` : i === 5 ? `${from}T16:25:00` : null,
      notes: '',
      grade_level: gradeMap[s.id] || '國中一',
    }
  })
  return {
    attendance: records,
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

// ===== Billing Records (家長繳費紀錄) =====
const BILLING_RECORDS = [
  { id: 'bill-1', student_name: '陳小利', course_name: '國中數學 A 班', amount: 3500, status: 'paid', period_month: '2026-03', created_at: '2026-03-01T09:00:00Z' },
  { id: 'bill-2', student_name: '陳小利', course_name: '國中數學 A 班', amount: 3500, status: 'paid', period_month: '2026-02', created_at: '2026-02-01T09:00:00Z' },
  { id: 'bill-3', student_name: '王大明', course_name: '國中數學 A 班', amount: 3500, status: 'paid', period_month: '2026-03', created_at: '2026-03-02T10:30:00Z' },
  { id: 'bill-4', student_name: '林美琪', course_name: '國中英文菁英班', amount: 11200, status: 'paid', period_month: '2026-01', created_at: '2026-01-05T14:00:00Z' },
  { id: 'bill-5', student_name: '張志豪', course_name: '國中英文菁英班', amount: 4000, status: 'pending', period_month: '2026-03', created_at: '2026-03-01T00:00:00Z' },
  { id: 'bill-6', student_name: '李宜庭', course_name: '國小先修班', amount: 2800, status: 'paid', period_month: '2026-03', created_at: '2026-03-10T11:00:00Z' },
  { id: 'bill-7', student_name: '黃柏翰', course_name: '國中數學 A 班', amount: 3500, status: 'paid', period_month: '2026-03', created_at: '2026-03-05T08:45:00Z' },
  { id: 'bill-8', student_name: '劉思涵', course_name: '國小先修班', amount: 2800, status: 'pending', period_month: '2026-03', created_at: '2026-03-01T00:00:00Z' },
  { id: 'bill-9', student_name: '吳承恩', course_name: '國中英文菁英班', amount: 4000, status: 'unpaid', period_month: '2026-02', created_at: '2026-02-01T00:00:00Z' },
  { id: 'bill-10', student_name: '吳承恩', course_name: '國中英文菁英班', amount: 4000, status: 'unpaid', period_month: '2026-03', created_at: '2026-03-01T00:00:00Z' },
]

// ===== Audit Logs (異動日誌) =====
const AUDIT_LOGS = [
  { id: 'log-1', user_name: 'Demo 館長', user_role: 'admin', action: 'create', table_name: 'students', record_id: 's5', change_summary: '新增學生：李宜庭（國小六年級）', old_value: null, new_value: { name: '李宜庭', grade: '國小六' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, created_at: '2026-02-28T10:30:00Z' },
  { id: 'log-2', user_name: 'Demo 行政', user_role: 'staff', action: 'update', table_name: 'attendance', record_id: 'att-s8', change_summary: '吳承恩出勤狀態從「出席」改為「缺席」', old_value: { status: 'present' }, new_value: { status: 'absent' }, needs_alert: true, alert_sent: true, parent_notified: true, alert_confirmed_at: null, created_at: '2026-02-27T18:15:00Z' },
  { id: 'log-3', user_name: 'Demo 館長', user_role: 'admin', action: 'update', table_name: 'grades', record_id: 'g1-g6', change_summary: '新增第一次段考數學成績 6 筆', old_value: null, new_value: { count: 6, exam: '第一次段考' }, needs_alert: true, alert_sent: true, parent_notified: true, alert_confirmed_at: '2026-02-21T09:00:00Z', created_at: '2026-02-20T16:00:00Z' },
  { id: 'log-4', user_name: '系統', user_role: 'system', action: 'create', table_name: 'payment_records', record_id: 'bill-1', change_summary: '陳小利繳費 NT$3,500（國中數學 A 班 3月份）', old_value: null, new_value: { amount: 3500, course: '國中數學 A 班' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, created_at: '2026-03-01T09:00:00Z' },
  { id: 'log-5', user_name: '系統', user_role: 'system', action: 'create', table_name: 'payment_records', record_id: 'bill-3', change_summary: '王大明繳費 NT$3,500（國中數學 A 班 3月份）', old_value: null, new_value: { amount: 3500, course: '國中數學 A 班' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, created_at: '2026-03-02T10:30:00Z' },
  { id: 'log-6', user_name: 'Demo 館長', user_role: 'admin', action: 'update', table_name: 'courses', record_id: 'c2', change_summary: '國中英文菁英班學費調整：月費 NT$3,800 → NT$4,000', old_value: { fee_monthly: 3800 }, new_value: { fee_monthly: 4000 }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, created_at: '2026-02-15T14:20:00Z' },
  { id: 'log-7', user_name: 'Demo 行政', user_role: 'staff', action: 'update', table_name: 'students', record_id: 's4', change_summary: '張志豪風險等級標記為「中等風險」（出席率 80%）', old_value: { risk_level: null }, new_value: { risk_level: 'medium' }, needs_alert: true, alert_sent: true, parent_notified: false, alert_confirmed_at: null, created_at: '2026-02-25T11:00:00Z' },
  { id: 'log-8', user_name: '系統', user_role: 'system', action: 'update', table_name: 'students', record_id: 's8', change_summary: '吳承恩風險等級升高為「高風險」（出席率 65%，2 筆未繳費）', old_value: { risk_level: 'medium' }, new_value: { risk_level: 'high' }, needs_alert: true, alert_sent: true, parent_notified: true, alert_confirmed_at: null, created_at: '2026-02-26T08:00:00Z' },
  { id: 'log-9', user_name: 'Demo 館長', user_role: 'admin', action: 'create', table_name: 'courses', record_id: 'c3', change_summary: '新增課程：國小先修班（王老師，週四 16:00-18:00）', old_value: null, new_value: { name: '國小先修班', teacher: '王老師' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, created_at: '2026-02-10T09:30:00Z' },
  { id: 'log-10', user_name: 'Demo 行政', user_role: 'staff', action: 'delete', table_name: 'attendance', record_id: 'att-dup', change_summary: '刪除重複出勤紀錄（陳小利 2/25 重複打卡）', old_value: { student: '陳小利', date: '2026-02-25' }, new_value: null, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, created_at: '2026-02-25T17:45:00Z' },
]

// ===== Conversations (AI 對話紀錄) =====
const CONVERSATIONS = [
  { id: 'conv-1', channel: 'telegram', intent: 'schedule', query: '請問這週六有上課嗎？', answer: '有的！本週六（3/1）國中英文菁英班照常上課，時間為 10:00-12:00，教室 202。請準時出席！', model: 'gpt-4o-mini', latency_ms: 320, tokens_used: 185, created_at: '2026-03-01T08:15:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-2', channel: 'telegram', intent: 'billing', query: '我兒子王大明這個月學費多少？', answer: '王大明同學目前就讀國中數學 A 班，本月（3月）學費為 NT$3,500，已於 3/2 繳費完成。如有疑問請洽行政老師。', model: 'gpt-4o-mini', latency_ms: 450, tokens_used: 210, created_at: '2026-03-01T09:30:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-3', channel: 'line', intent: 'enrollment', query: '請問還有沒有國小先修班的名額？', answer: '國小先修班目前還有 5 個名額喔！上課時間為每週四 16:00-18:00，月費 NT$2,800。歡迎來電預約試聽！', model: 'gpt-4o-mini', latency_ms: 380, tokens_used: 195, created_at: '2026-02-28T14:20:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-4', channel: 'telegram', intent: 'FAQ', query: '補習班地址在哪裡？', answer: '蜂神榜示範補習班地址：台北市大安區忠孝東路四段 100 號 3 樓。捷運忠孝敦化站 2 號出口步行約 3 分鐘。', model: 'gpt-4o-mini', latency_ms: 280, tokens_used: 160, created_at: '2026-02-28T11:05:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-5', channel: 'web', intent: 'greeting', query: '你好', answer: '您好！歡迎來到蜂神榜補習班 🐝 我是 AI 助理，可以幫您查詢課程、學費、上課時間等資訊，請問有什麼需要幫忙的嗎？', model: 'gpt-4o-mini', latency_ms: 220, tokens_used: 140, created_at: '2026-02-27T16:00:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-6', channel: 'telegram', intent: 'schedule', query: '下週的課表是什麼？', answer: '下週課表如下：\n週二 18:00-20:00 國中數學 A 班（王老師）\n週三 18:00-20:00 國中英文菁英班（李老師）\n週四 16:00-18:00 國小先修班（王老師）\n週五 18:00-20:00 國中數學 A 班（王老師）\n週六 10:00-12:00 國中英文菁英班（李老師）', model: 'gpt-4o-mini', latency_ms: 510, tokens_used: 280, created_at: '2026-02-27T10:30:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-7', channel: 'line', intent: 'billing', query: '吳承恩的繳費狀況如何？', answer: '吳承恩同學（國中英文菁英班）目前有 2 筆未繳費用：\n- 2026年2月 NT$4,000（逾期）\n- 2026年3月 NT$4,000（未繳）\n建議盡快繳費，如有困難可聯繫行政老師討論分期方案。', model: 'gpt-4o-mini', latency_ms: 420, tokens_used: 230, created_at: '2026-02-26T15:45:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-8', channel: 'telegram', intent: 'FAQ', query: '考試成績什麼時候出來？', answer: '第一次段考成績已於 2/21 公布，您可以在 94Manage 系統的「成績管理」中查看完整成績。如需紙本成績單，請洽行政老師。', model: 'gpt-4o-mini', latency_ms: 350, tokens_used: 175, created_at: '2026-02-25T09:20:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-9', channel: 'web', intent: 'enrollment', query: '國中數學 A 班還能報名嗎？上課方式是什麼？', answer: '國中數學 A 班目前還有名額！上課資訊：\n- 時間：週二、週五 18:00-20:00\n- 教室：201\n- 師資：王老師（資深講師）\n- 月費：NT$3,500\n\n採小班制教學（最多15人），歡迎預約試聽！', model: 'gpt-4o-mini', latency_ms: 480, tokens_used: 250, created_at: '2026-02-24T13:10:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
  { id: 'conv-10', channel: 'telegram', intent: 'schedule', query: '張志豪的出席狀況怎麼樣？', answer: '張志豪同學近期出席率約 80%，屬於中等風險。建議關注其到課情況，必要時可與家長溝通了解原因。', model: 'gpt-4o-mini', latency_ms: 390, tokens_used: 200, created_at: '2026-02-23T17:30:00Z', branch_id: 'b1', branch_name: '蜂神榜示範校' },
]

// ===== Course-Student enrollment (帳務管理用) =====
const COURSE_STUDENTS: Record<string, { id: string; full_name: string; grade_level: string; payment_id?: string; paid_amount?: number; payment_type?: string; payment_date?: string }[]> = {
  'c1': [ // 國中數學 A 班
    { id: 's1', full_name: '陳小利', grade_level: '國中一', payment_id: 'pay-1', paid_amount: 3500, payment_type: 'monthly', payment_date: '2026-03-01' },
    { id: 's2', full_name: '王大明', grade_level: '國中二', payment_id: 'pay-2', paid_amount: 3500, payment_type: 'monthly', payment_date: '2026-03-02' },
    { id: 's4', full_name: '張志豪', grade_level: '國中三' },
    { id: 's6', full_name: '黃柏翰', grade_level: '國中二', payment_id: 'pay-3', paid_amount: 3500, payment_type: 'monthly', payment_date: '2026-03-05' },
    { id: 's7', full_name: '劉思涵', grade_level: '國中一' },
  ],
  'c2': [ // 國中英文菁英班
    { id: 's1', full_name: '陳小利', grade_level: '國中一', payment_id: 'pay-4', paid_amount: 4000, payment_type: 'monthly', payment_date: '2026-03-01' },
    { id: 's3', full_name: '林美琪', grade_level: '國中一', payment_id: 'pay-5', paid_amount: 11200, payment_type: 'quarterly', payment_date: '2026-01-05' },
    { id: 's4', full_name: '張志豪', grade_level: '國中三' },
    { id: 's8', full_name: '吳承恩', grade_level: '國中三' },
  ],
  'c3': [ // 國小先修班
    { id: 's5', full_name: '李宜庭', grade_level: '國小六', payment_id: 'pay-6', paid_amount: 2800, payment_type: 'monthly', payment_date: '2026-03-10' },
    { id: 's7', full_name: '劉思涵', grade_level: '國中一' },
  ],
}

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

    // Student APIs — 加上 full_name / grade_level 給出席管理頁用
    if (path === '/api/admin/students') {
      const studentsWithAlias = STUDENTS.map(s => ({ ...s, full_name: s.name, grade_level: s.grade }))
      return { status: 200, body: { success: true, data: { students: studentsWithAlias } } }
    }
    const studentMatch = path.match(/^\/api\/admin\/students\/([\w-]+)$/)
    if (studentMatch) {
      const s = STUDENTS.find(st => st.id === studentMatch[1])
      return s ? { status: 200, body: { student: s } } : { status: 404, body: { error: 'Not found' } }
    }

    // Attendance APIs
    if (path === '/api/admin/attendance') {
      const studentId = searchParams.get('studentId')
      const from = searchParams.get('from') || new Date().toISOString().split('T')[0]
      const to = searchParams.get('to') || from
      // Student detail page expects { records: AttendanceRecord[] }
      if (studentId) {
        const data = getAttendance(from, to)
        const filtered = data.attendance.filter(a => a.student_id === studentId)
        return { status: 200, body: { records: filtered } }
      }
      const data = getAttendance(from, to)
      return { status: 200, body: { success: true, data } }
    }

    // Grades APIs — student detail expects camelCase: maxScore, date, examType
    if (path === '/api/admin/grades') {
      const studentId = searchParams.get('studentId')
      const gradesWithCamel = GRADES.map(g => ({
        ...g,
        maxScore: g.max_score,
        date: g.exam_date,
        examType: g.exam_name,
      }))
      const filtered = studentId ? gradesWithCamel.filter(g => g.student_id === studentId) : gradesWithCamel
      return { status: 200, body: { grades: filtered } }
    }

    // Alerts — dashboard checks data.success then reads data.data.alerts
    if (path === '/api/admin/alerts') return { status: 200, body: { success: true, data: { alerts: ALERTS } } }

    // Course/Class APIs (w8 prefix = manage backend routes)
    if (path === '/api/w8/courses') return { status: 200, body: { success: true, data: { courses: COURSES } } }

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

    // Salary — adjustments
    if (path === '/api/w8/salary/adjustments') {
      return { status: 200, body: { adjustments: [] } }
    }

    // Salary — 薪資計算
    if (path.startsWith('/api/admin/salary') || path.startsWith('/api/w8/salary')) {
      const now = new Date()
      const startDate = searchParams.get('startDate') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const endDate = searchParams.get('endDate') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-28`
      return { status: 200, body: { data: {
        period: { start: startDate, end: endDate },
        teachers: [
          { teacher_id: 't1', teacher_name: '王老師', title: '資深講師', teacher_role: null, salary_type: 'per_class', rate_per_class: '800', base_salary: '0', hourly_rate: '0', total_classes: 12, base_amount: 9600, bonus_total: 500, deduction_total: 0, total_amount: 10100, adjustments: [{ type: 'bonus', name: '全勤獎金', amount: '500' }] },
          { teacher_id: 't2', teacher_name: '李老師', title: '首席講師', teacher_role: null, salary_type: 'per_class', rate_per_class: '900', base_salary: '0', hourly_rate: '0', total_classes: 8, base_amount: 7200, bonus_total: 0, deduction_total: 200, total_amount: 7000, adjustments: [{ type: 'deduction', name: '遲到扣薪', amount: '200' }] },
          { teacher_id: 't3', teacher_name: '陳主任', title: '教務主任', teacher_role: '主任', salary_type: 'monthly', rate_per_class: '0', base_salary: '45000', hourly_rate: '0', total_classes: 0, base_amount: 45000, bonus_total: 0, deduction_total: 0, total_amount: 45000, adjustments: [] },
          { teacher_id: 't4', teacher_name: '林助教', title: '助教', teacher_role: '助教', salary_type: 'hourly', rate_per_class: '0', base_salary: '0', hourly_rate: '200', total_classes: 20, base_amount: 8000, bonus_total: 0, deduction_total: 0, total_amount: 8000, adjustments: [] },
        ],
        grand_total_classes: 40,
        grand_total_amount: 70100,
      } } }
    }

    // Expenses — 支出管理
    if (path === '/api/w8/expenses/categories') {
      return { status: 200, body: { categories: ['內務', '水電', '教材', '房租', '設備', '文具'] } }
    }
    if (path.startsWith('/api/w8/expenses')) {
      return { status: 200, body: { expenses: [
        { id: 'exp-1', name: '3月份房租', amount: 25000, category: '房租', expense_date: '2026-03-01', notes: '每月固定', created_at: '2026-03-01T00:00:00Z' },
        { id: 'exp-2', name: '冷氣電費', amount: 4200, category: '水電', expense_date: '2026-03-05', notes: '2月份電費帳單', created_at: '2026-03-05T00:00:00Z' },
        { id: 'exp-3', name: '數學講義印刷', amount: 1800, category: '教材', expense_date: '2026-03-03', notes: '國中數學 A 班 15 份', created_at: '2026-03-03T00:00:00Z' },
        { id: 'exp-4', name: '白板筆/粉筆', amount: 350, category: '文具', expense_date: '2026-03-10', notes: null, created_at: '2026-03-10T00:00:00Z' },
        { id: 'exp-5', name: '飲水機濾芯更換', amount: 600, category: '內務', expense_date: '2026-03-08', notes: '半年更換一次', created_at: '2026-03-08T00:00:00Z' },
      ] } }
    }

    // Billing — 按課程查詢帳務
    const billingCourseMatch = path.match(/^\/api\/admin\/billing\/course\/([\w-]+)$/)
    if (billingCourseMatch) {
      const courseId = billingCourseMatch[1]
      const course = COURSES.find(c => c.id === courseId)
      const periodMonth = searchParams.get('periodMonth') || '2026-03'
      const students = COURSE_STUDENTS[courseId] || []
      const paid = students.filter(s => s.payment_id).length
      return { status: 200, body: { success: true, data: {
        course: course ? { id: course.id, name: course.name, subject: course.subject, grade_level: course.grade, fee_monthly: course.fee_monthly, fee_quarterly: course.fee_monthly * 3 * 0.95, fee_semester: course.fee_monthly * 6 * 0.9, fee_yearly: course.fee_monthly * 12 * 0.85 } : null,
        periodMonth,
        students,
        stats: { total: students.length, paid, unpaid: students.length - paid },
      } } }
    }

    // Billing — 家長繳費紀錄
    if (path === '/api/admin/billing/payment-records' || path.startsWith('/api/admin/billing')) {
      return { status: 200, body: { success: true, data: { records: BILLING_RECORDS } } }
    }

    // Churn risk — reports page fetches /api/admin/churn/:branchId
    if (path.startsWith('/api/admin/churn')) {
      return { status: 200, body: { data: { students: [
        { id: 's8', name: '吳承恩', risk_score: 85, risk_factors: ['出席率 65%', '2 筆未繳費'] },
        { id: 's4', name: '張志豪', risk_score: 55, risk_factors: ['出席率 80%', '成績下滑'] },
      ] } } }
    }

    // Reports — trend endpoint returns monthly data for charts
    if (path === '/api/admin/reports/trend') {
      return { status: 200, body: { data: { months: [
        { month: '2025-10', activeStudents: 6, attendanceRate: 90, avgScore: 78 },
        { month: '2025-11', activeStudents: 6, attendanceRate: 88, avgScore: 80 },
        { month: '2025-12', activeStudents: 7, attendanceRate: 85, avgScore: 77 },
        { month: '2026-01', activeStudents: 7, attendanceRate: 87, avgScore: 82 },
        { month: '2026-02', activeStudents: 8, attendanceRate: 86, avgScore: 79 },
        { month: '2026-03', activeStudents: 8, attendanceRate: 88, avgScore: 81 },
      ] } } }
    }

    // Reports — generic fallback
    if (path.startsWith('/api/admin/reports') || path.startsWith('/api/w8/reports')) {
      return { status: 200, body: { data: {} } }
    }

    // Audit Logs — 異動日誌
    if (path.startsWith('/api/admin/audit-logs')) {
      let filtered = AUDIT_LOGS
      const tableName = searchParams.get('tableName')
      const action = searchParams.get('action')
      const needsAlert = searchParams.get('needsAlert')
      if (tableName) filtered = filtered.filter(l => l.table_name === tableName)
      if (action) filtered = filtered.filter(l => l.action === action)
      if (needsAlert === 'true') filtered = filtered.filter(l => l.needs_alert && !l.alert_confirmed_at)
      return { status: 200, body: { success: true, data: { logs: filtered } } }
    }

    // Knowledge
    if (path.startsWith('/api/admin/knowledge')) {
      return { status: 200, body: { chunks: [], count: 0 } }
    }

    // Conversations — AI 對話紀錄
    if (path.startsWith('/api/admin/conversations') || path.startsWith('/api/bot/conversations')) {
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')
      const platform = searchParams.get('platform')
      let filtered = CONVERSATIONS
      if (platform) {
        filtered = filtered.filter(c => c.channel === platform)
      }
      const paged = filtered.slice(offset, offset + limit)
      return { status: 200, body: { success: true, data: { conversations: paged, pagination: { total: filtered.length, limit, offset } } } }
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

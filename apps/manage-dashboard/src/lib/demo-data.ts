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

const TENANT_STATS: Record<string, { branches: number }> = {
  [DEMO_TENANT_1]: { branches: 1 },
  [DEMO_TENANT_2]: { branches: 1 },
}

// ===== Students =====
const STUDENTS = [
  { id: 's1', name: '陳小利', grade: '國一', date_of_birth: '2013-05-15', computed_grade: '國一', phone: '0912-111-001', email: 'chen@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 95, average_grade: 88, risk_level: null },
  { id: 's2', name: '王大明', grade: '國二', date_of_birth: '2012-08-20', computed_grade: '國二', phone: '0912-111-002', email: 'wang@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 90, average_grade: 76, risk_level: null },
  { id: 's3', name: '林美琪', grade: '國一', date_of_birth: '2013-11-03', computed_grade: '國一', phone: '0912-111-003', email: 'lin@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 98, average_grade: 92, risk_level: null },
  { id: 's4', name: '張志豪', grade: '國三', date_of_birth: '2011-03-10', computed_grade: '國三', phone: '0912-111-004', email: 'zhang@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 80, average_grade: 67, risk_level: 'medium' },
  { id: 's5', name: '李宜庭', grade: '小六', date_of_birth: '2014-07-22', computed_grade: '小六', phone: '0912-111-005', email: 'li@demo.com', status: 'active', joined_date: '2026-02-01', attendance_rate: 85, average_grade: 0, risk_level: null },
  { id: 's6', name: '黃柏翰', grade: '國二', date_of_birth: '2012-04-18', computed_grade: '國二', phone: '0912-111-006', email: 'huang@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 92, average_grade: 83, risk_level: null },
  { id: 's7', name: '劉思涵', grade: '國一', date_of_birth: '2013-09-25', computed_grade: '國一', phone: '0912-111-007', email: 'liu@demo.com', status: 'active', joined_date: '2025-09-01', attendance_rate: 88, average_grade: 79, risk_level: null },
  { id: 's8', name: '吳承恩', grade: '國三', date_of_birth: '2011-12-01', computed_grade: '國三', phone: '0912-111-008', email: 'wu@demo.com', status: 'at_risk', joined_date: '2025-09-01', attendance_rate: 65, average_grade: 58, risk_level: 'high' },
]

// ===== Binding Tokens =====
const DEMO_BINDING_TOKENS = [
  { id: 'bt1', student_id: 's1', student_name: '陳小利', token: 'demo-token-chen-active', expires_at: '2026-03-12T00:00:00Z', used_at: null, used_by_line_id: null, created_at: '2026-03-05T10:00:00Z', qr_url: 'https://94cram.com/bind/demo-token-chen-active' },
  { id: 'bt2', student_id: 's2', student_name: '王大明', token: 'demo-token-wang-expired', expires_at: '2026-02-20T00:00:00Z', used_at: null, used_by_line_id: null, created_at: '2026-02-13T10:00:00Z', qr_url: 'https://94cram.com/bind/demo-token-wang-expired' },
  { id: 'bt3', student_id: 's3', student_name: '林美琪', token: 'demo-token-lin-used', expires_at: null, used_at: '2026-02-28T10:00:00Z', used_by_line_id: 'U1234567890abcdef', created_at: '2026-02-20T10:00:00Z', qr_url: 'https://94cram.com/bind/demo-token-lin-used' },
]

// ===== Courses/Classes =====
const COURSES = [
  { id: 'c1', name: '國中數學 A 班', subject: '數學', grade: '國中', room: '201', capacity: 15, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 3500, duration_minutes: 120, schedule: '週二 18:00-20:00, 週五 18:00-20:00', course_type: 'group' },
  { id: 'c2', name: '國中英文菁英班', subject: '英文', grade: '國中', room: '202', capacity: 12, teacher_id: 't2', teacher_name: '李老師', fee_monthly: 4000, duration_minutes: 120, schedule: '週三 18:00-20:00, 週六 10:00-12:00', course_type: 'group' },
  { id: 'c3', name: '國小先修班', subject: '數學', grade: '國小', room: '101', capacity: 10, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 2800, duration_minutes: 120, schedule: '週四 16:00-18:00', course_type: 'group' },
  { id: 'c4', name: '張志豪 數學個指', subject: '數學', grade: '國中', room: '301', capacity: 1, teacher_id: 't1', teacher_name: '王老師', fee_monthly: 0, fee_per_session: 1200, duration_minutes: 90, schedule: '週一 17:00-18:30', course_type: 'individual', max_students: 1 },
  { id: 'c5', name: '陳小利+林美琪 英文個指', subject: '英文', grade: '國中', room: '301', capacity: 2, teacher_id: 't2', teacher_name: '李老師', fee_monthly: 0, fee_per_session: 900, duration_minutes: 90, schedule: '週四 18:30-20:00', course_type: 'individual', max_students: 2 },
  { id: 'c6', name: '安親班（國小）', subject: '全科', grade: '國小', room: '103', capacity: 20, teacher_id: 't4', teacher_name: '林助教', fee_monthly: 8000, duration_minutes: 240, schedule: '週一～週五 12:00-16:00', course_type: 'daycare' },
]

// ===== Teachers =====
const TEACHERS = [
  { id: 't1', name: '王老師', title: '資深講師', email: 'wang@demo.com', phone: '0912-345-678', subject: '數學', hourly_rate: 800, rate_per_class: '800', status: 'active', teacher_role: null, salary_type: 'per_class', base_salary: null, insurance_config: { labor: { enabled: false, tierLevel: 1, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, health: { enabled: false, tierLevel: 1, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, supplementalHealth: { employmentType: 'part_time', insuredThroughUnit: false, averageWeeklyHours: 6, notes: '兼職堂薪，單次達基本工資再評估補充保費' } }, subjects: ['數學'], grade_levels: ['國中', '國小'] },
  { id: 't2', name: '李老師', title: '首席講師', email: 'lee@demo.com', phone: '0923-456-789', subject: '英文', hourly_rate: 900, rate_per_class: '900', status: 'active', teacher_role: null, salary_type: 'per_class', base_salary: null, insurance_config: { labor: { enabled: false, tierLevel: 1, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, health: { enabled: true, tierLevel: 2, calculationMode: 'manual', manualPersonalAmount: 420, manualEmployerAmount: 840 }, supplementalHealth: { employmentType: 'part_time', insuredThroughUnit: false, averageWeeklyHours: 10, notes: '外聘兼職，人工覆核補充保費' } }, subjects: ['英文'], grade_levels: ['國中'] },
  { id: 't3', name: '陳主任', title: '教務主任', email: 'chen@demo.com', phone: '0934-567-890', subject: '國文', hourly_rate: 0, rate_per_class: '0', status: 'active', teacher_role: '主任', salary_type: 'monthly', base_salary: '45000', insurance_config: { labor: { enabled: true, tierLevel: 11, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, health: { enabled: true, tierLevel: 11, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, supplementalHealth: { employmentType: 'full_time', insuredThroughUnit: true, averageWeeklyHours: 40, notes: null } }, subjects: ['國文', '作文'], grade_levels: ['國中', '高中'] },
  { id: 't4', name: '林助教', title: '助教', email: 'lin@demo.com', phone: '0945-678-901', subject: '數學', hourly_rate: 200, rate_per_class: '0', status: 'active', teacher_role: '助教', salary_type: 'hourly', base_salary: null, insurance_config: { labor: { enabled: false, tierLevel: 1, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, health: { enabled: false, tierLevel: 1, calculationMode: 'auto', manualPersonalAmount: null, manualEmployerAmount: null }, supplementalHealth: { employmentType: 'part_time', insuredThroughUnit: false, averageWeeklyHours: 20, notes: '每週超過 12 小時，需確認是否應改由本單位投保' } }, subjects: ['數學'], grade_levels: ['國中'] },
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
      schedules.push({ id: `sch-${dateStr}-c1`, course_id: 'c1', course_name: '國中數學 A 班', subject: '數學', teacher_id: 't1', teacher_name: '王老師', teacher_title: '資深講師', room: '201', scheduled_date: dateStr, start_time: '18:00:00', end_time: '20:00:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '800', course_type: 'group' })
    }
    if (dow === 3 || dow === 6) { // 週三、週六
      const st = dow === 3 ? '18:00:00' : '10:00:00'
      const et = dow === 3 ? '20:00:00' : '12:00:00'
      schedules.push({ id: `sch-${dateStr}-c2`, course_id: 'c2', course_name: '國中英文菁英班', subject: '英文', teacher_id: 't2', teacher_name: '李老師', teacher_title: '首席講師', room: '202', scheduled_date: dateStr, start_time: st, end_time: et, status: isPast ? 'completed' : 'scheduled', rate_per_class: '900', course_type: 'group' })
    }
    if (dow === 4) { // 週四
      schedules.push({ id: `sch-${dateStr}-c3`, course_id: 'c3', course_name: '國小先修班', subject: '數學', teacher_id: 't1', teacher_name: '王老師', teacher_title: '資深講師', room: '101', scheduled_date: dateStr, start_time: '16:00:00', end_time: '18:00:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '800', course_type: 'group' })
    }
    if (dow === 1) { // 週一 — 個指
      schedules.push({ id: `sch-${dateStr}-c4`, course_id: 'c4', course_name: '張志豪 數學個指', subject: '數學', teacher_id: 't1', teacher_name: '王老師', teacher_title: '資深講師', room: '301', scheduled_date: dateStr, start_time: '17:00:00', end_time: '18:30:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '1200', course_type: 'individual', student_ids: ['s4'], student_names: ['張志豪'] })
    }
    if (dow === 4) { // 週四 — 個指
      schedules.push({ id: `sch-${dateStr}-c5`, course_id: 'c5', course_name: '陳小利+林美琪 英文個指', subject: '英文', teacher_id: 't2', teacher_name: '李老師', teacher_title: '首席講師', room: '301', scheduled_date: dateStr, start_time: '18:30:00', end_time: '20:00:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '900', course_type: 'individual', student_ids: ['s1', 's3'], student_names: ['陳小利', '林美琪'] })
    }
    if (dow >= 1 && dow <= 5) { // 週一～週五 — 安親
      schedules.push({ id: `sch-${dateStr}-c6`, course_id: 'c6', course_name: '安親班（國小）', subject: '全科', teacher_id: 't4', teacher_name: '林助教', teacher_title: '助教', room: '103', scheduled_date: dateStr, start_time: '12:00:00', end_time: '16:00:00', status: isPast ? 'completed' : 'scheduled', rate_per_class: '0', course_type: 'daycare' })
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
  { id: 'log-1', user_name: 'Demo 館長', user_role: 'admin', action: 'create', table_name: 'students', record_id: 's5', change_summary: '新增學生：李宜庭（國小六年級）', old_value: null, new_value: { name: '李宜庭', grade: '國小六' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, ip_address: '203.69.115.42', created_at: '2026-02-28T10:30:00Z' },
  { id: 'log-2', user_name: 'Demo 行政', user_role: 'staff', action: 'update', table_name: 'attendance', record_id: 'att-s8', change_summary: '吳承恩出勤狀態從「出席」改為「缺席」', old_value: { status: 'present' }, new_value: { status: 'absent' }, needs_alert: true, alert_sent: true, parent_notified: true, alert_confirmed_at: null, ip_address: '203.69.115.42', created_at: '2026-02-27T18:15:00Z' },
  { id: 'log-3', user_name: 'Demo 館長', user_role: 'admin', action: 'update', table_name: 'grades', record_id: 'g1-g6', change_summary: '新增第一次段考數學成績 6 筆', old_value: null, new_value: { count: 6, exam: '第一次段考' }, needs_alert: true, alert_sent: true, parent_notified: true, alert_confirmed_at: '2026-02-21T09:00:00Z', ip_address: '203.69.115.42', created_at: '2026-02-20T16:00:00Z' },
  { id: 'log-4', user_name: '系統', user_role: 'system', action: 'create', table_name: 'payment_records', record_id: 'bill-1', change_summary: '陳小利繳費 NT$3,500（國中數學 A 班 3月份）', old_value: null, new_value: { amount: 3500, course: '國中數學 A 班' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, ip_address: '10.0.0.1', created_at: '2026-03-01T09:00:00Z' },
  { id: 'log-5', user_name: '系統', user_role: 'system', action: 'create', table_name: 'payment_records', record_id: 'bill-3', change_summary: '王大明繳費 NT$3,500（國中數學 A 班 3月份）', old_value: null, new_value: { amount: 3500, course: '國中數學 A 班' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, ip_address: '10.0.0.1', created_at: '2026-03-02T10:30:00Z' },
  { id: 'log-6', user_name: 'Demo 館長', user_role: 'admin', action: 'update', table_name: 'courses', record_id: 'c2', change_summary: '國中英文菁英班學費調整：月費 NT$3,800 → NT$4,000', old_value: { fee_monthly: 3800 }, new_value: { fee_monthly: 4000 }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, ip_address: '203.69.115.42', created_at: '2026-02-15T14:20:00Z' },
  { id: 'log-7', user_name: 'Demo 行政', user_role: 'staff', action: 'update', table_name: 'students', record_id: 's4', change_summary: '張志豪風險等級標記為「中等風險」（出席率 80%）', old_value: { risk_level: null }, new_value: { risk_level: 'medium' }, needs_alert: true, alert_sent: true, parent_notified: false, alert_confirmed_at: null, ip_address: '192.168.1.105', created_at: '2026-02-25T11:00:00Z' },
  { id: 'log-8', user_name: '系統', user_role: 'system', action: 'update', table_name: 'students', record_id: 's8', change_summary: '吳承恩風險等級升高為「高風險」（出席率 65%，2 筆未繳費）', old_value: { risk_level: 'medium' }, new_value: { risk_level: 'high' }, needs_alert: true, alert_sent: true, parent_notified: true, alert_confirmed_at: null, ip_address: '10.0.0.1', created_at: '2026-02-26T08:00:00Z' },
  { id: 'log-9', user_name: 'Demo 館長', user_role: 'admin', action: 'create', table_name: 'courses', record_id: 'c3', change_summary: '新增課程：國小先修班（王老師，週四 16:00-18:00）', old_value: null, new_value: { name: '國小先修班', teacher: '王老師' }, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, ip_address: '203.69.115.42', created_at: '2026-02-10T09:30:00Z' },
  { id: 'log-10', user_name: 'Demo 行政', user_role: 'staff', action: 'delete', table_name: 'attendance', record_id: 'att-dup', change_summary: '刪除重複出勤紀錄（陳小利 2/25 重複打卡）', old_value: { student: '陳小利', date: '2026-02-25' }, new_value: null, needs_alert: false, alert_sent: false, parent_notified: false, alert_confirmed_at: null, ip_address: '192.168.1.105', created_at: '2026-02-25T17:45:00Z' },
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
  'c4': [ // 張志豪 數學個指
    { id: 's4', full_name: '張志豪', grade_level: '國中三', payment_id: 'pay-7', paid_amount: 4800, payment_type: 'per_session', payment_date: '2026-03-08' },
  ],
  'c5': [ // 陳小利+林美琪 英文個指
    { id: 's1', full_name: '陳小利', grade_level: '國中一', payment_id: 'pay-8', paid_amount: 3600, payment_type: 'per_session', payment_date: '2026-03-05' },
    { id: 's3', full_name: '林美琪', grade_level: '國中一' },
  ],
  'c6': [ // 安親班（國小）
    { id: 's5', full_name: '李宜庭', grade_level: '國小六', payment_id: 'pay-9', paid_amount: 8000, payment_type: 'monthly', payment_date: '2026-03-01' },
  ],
}

// ===== Notifications (電子聯絡簿) =====
const NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'grade_notification',
    title: '新成績公布：數學第一次段考',
    message: '陳小利 數學第一次段考成績已公布，得分 88 / 100（等第：B）',
    student_name: '陳小利',
    created_at: '2026-02-20T16:00:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'grade_notification',
    title: '新成績公布：英文第一次段考',
    message: '陳小利 英文第一次段考成績已公布，得分 92 / 100（等第：A）',
    student_name: '陳小利',
    created_at: '2026-02-21T09:00:00Z',
    read: true,
  },
  {
    id: 'notif-3',
    type: 'attendance_alert',
    title: '出勤提醒：今日已到校',
    message: '陳小利 今日 15:52 NFC 刷卡到校，出勤狀態：出席',
    student_name: '陳小利',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: 'notif-4',
    type: 'billing_reminder',
    title: '繳費通知：3月份學費已繳清',
    message: '陳小利 國中數學 A 班 3月份學費 NT$3,500 已於 3/1 完成繳費，謝謝！',
    student_name: '陳小利',
    created_at: '2026-03-01T09:00:00Z',
    read: true,
  },
  {
    id: 'notif-5',
    type: 'billing_reminder',
    title: '繳費通知：3月份學費已繳清',
    message: '陳小利 國中英文菁英班 3月份學費 NT$4,000 已於 3/1 完成繳費，謝謝！',
    student_name: '陳小利',
    created_at: '2026-03-01T09:05:00Z',
    read: true,
  },
  {
    id: 'notif-6',
    type: 'schedule_change',
    title: '課表異動：國中英文菁英班本週六停課',
    message: '國中英文菁英班（李老師）本週六（3/8）停課一次，補課日期另行通知，造成不便敬請見諒。',
    student_name: '陳小利',
    created_at: '2026-03-05T10:00:00Z',
    read: false,
  },
  {
    id: 'notif-7',
    type: 'grade_notification',
    title: '新成績公布：數學隨堂測驗',
    message: '陳小利 數學隨堂測驗成績已公布，得分 95 / 100，表現優異！',
    student_name: '陳小利',
    created_at: '2026-03-02T17:30:00Z',
    read: false,
  },
  {
    id: 'notif-8',
    type: 'attendance_alert',
    title: '出勤提醒：今日缺席',
    message: '陳小利 今日國中數學 A 班課程缺席，如有特殊原因請與班導師聯繫。',
    student_name: '陳小利',
    created_at: '2026-02-27T20:00:00Z',
    read: true,
  },
  {
    id: 'notif-9',
    type: 'schedule_change',
    title: '課表異動：國中數學 A 班改期',
    message: '國中數學 A 班（王老師）下週二（3/11）課程改期至 3/13（週四）18:00-20:00，教室不變。',
    student_name: '陳小利',
    created_at: '2026-03-07T14:00:00Z',
    read: false,
  },
  {
    id: 'notif-10',
    type: 'billing_reminder',
    title: '繳費提醒：國中英文菁英班學費調漲通知',
    message: '自 3 月起，國中英文菁英班月費調整為 NT$4,000（原 NT$3,800），如有疑問請洽行政老師。',
    student_name: '陳小利',
    created_at: '2026-02-15T14:20:00Z',
    read: true,
  },
]

// ===== Teacher Attendance (師資出缺勤) =====
// 動態產生指定日期的出缺勤記錄（確保 demo 在任何日期都有數據）
function buildDemoTeacherAttendance(date: string) {
  const dateHash = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const statuses: Array<{ status: string; check_in_time: string | null; check_out_time: string | null; leave_type: string | null; leave_reason: string | null; substitute_teacher_id: string | null; notes: string | null }> = [
    { status: 'present', check_in_time: '15:30', check_out_time: '21:00', leave_type: null, leave_reason: null, substitute_teacher_id: null, notes: null },
    { status: 'present', check_in_time: '17:45', check_out_time: '20:10', leave_type: null, leave_reason: null, substitute_teacher_id: null, notes: null },
    { status: 'present', check_in_time: '09:00', check_out_time: '18:00', leave_type: null, leave_reason: null, substitute_teacher_id: null, notes: null },
    { status: 'late', check_in_time: '16:20', check_out_time: '20:00', leave_type: null, leave_reason: null, substitute_teacher_id: null, notes: '遲到 20 分鐘' },
    { status: 'leave', check_in_time: null, check_out_time: null, leave_type: 'sick', leave_reason: '身體不適', substitute_teacher_id: 't1', notes: '王老師代課' },
    { status: 'present', check_in_time: '13:00', check_out_time: '17:30', leave_type: null, leave_reason: null, substitute_teacher_id: null, notes: null },
  ]
  return TEACHERS.map((t, i) => {
    const idx = (i + dateHash) % statuses.length
    const s = statuses[idx]
    return { id: `ta-${date}-${t.id}`, teacher_id: t.id, teacher_name: t.name, role: t.title, date, ...s, approved: true }
  })
}

// 預建近期日期的記錄（讓月統計也有資料）
const TEACHER_ATTENDANCE = (() => {
  const today = new Date()
  const dates: string[] = []
  for (let d = 0; d < 14; d++) {
    const dt = new Date(today)
    dt.setDate(today.getDate() - d)
    // 跳過週末（週六=6, 週日=0）
    if (dt.getDay() === 0 || dt.getDay() === 6) continue
    dates.push(dt.toISOString().split('T')[0])
  }
  return dates.flatMap(date => buildDemoTeacherAttendance(date))
})()

// ===== Contact Book v2 (電子聯絡簿 v2) =====
const CONTACT_BOOK_ENTRIES = [
  {
    id: 'cb-1', studentId: 's1', studentName: '陳小利', courseId: 'c1', courseName: '國中數學 A 班',
    date: '2026-03-05', status: 'read' as const,
    groupProgress: '本週進入一元二次方程式，同學們掌握度約 80%。配合講義 P.45-52 練習。',
    groupHomework: '數學講義 P.48-50 所有練習題，下週二前繳交。',
    individualProgress: '小利上課認真，但計算偶爾粗心。建議考前多做驗算練習。',
    individualHomework: '額外練習：講義 P.51 進階題 1-5。',
    teacherNote: '小利最近進步很多，繼續保持！考前記得多練習移項步驟。',
    examScores: [
      { id: 'es-1', subject: '數學', score: 88, classAvg: 75, fullScore: 100 },
      { id: 'es-2', subject: '英文', score: 72, classAvg: 78, fullScore: 100 },
    ],
    photos: [
      { id: 'ph-1', url: 'https://placehold.co/400x300/e8dfd5/6b5e50?text=課堂照片1', name: '課堂互動.jpg' },
      { id: 'ph-2', url: 'https://placehold.co/400x300/d5dfe8/50596b?text=課堂照片2', name: '小組討論.jpg' },
    ],
    parentFeedback: { rating: 5, comment: '收到，會督促小利複習！謝謝老師用心！', createdAt: '2026-03-05T20:00:00Z' },
    aiAnalysis: { weakSummary: '英文科目表現略低於班級平均，建議加強單字量與文法練習。', recommendations: ['加強英文文法練習', '每日背誦 10 個新單字', '建議報名英文加強班'] },
    sentAt: '2026-03-05T16:30:00Z', readAt: '2026-03-05T19:45:00Z', createdAt: '2026-03-05T15:00:00Z',
  },
  {
    id: 'cb-2', studentId: 's2', studentName: '林小美', courseId: 'c1', courseName: '國中數學 A 班',
    date: '2026-03-05', status: 'sent' as const,
    groupProgress: '本週進入一元二次方程式，同學們掌握度約 80%。配合講義 P.45-52 練習。',
    groupHomework: '數學講義 P.48-50 所有練習題，下週二前繳交。',
    individualProgress: '小美理解力佳，但速度略慢。建議多做限時練習提升答題速度。',
    individualHomework: '限時練習：20 分鐘內完成講義 P.49 計算題。',
    teacherNote: '小美上課很專注，答題品質很高，再加強速度就完美了！',
    examScores: [
      { id: 'es-3', subject: '數學', score: 92, classAvg: 75, fullScore: 100 },
      { id: 'es-4', subject: '英文', score: 95, classAvg: 78, fullScore: 100 },
    ],
    photos: [],
    parentFeedback: null,
    aiAnalysis: null,
    sentAt: '2026-03-05T16:30:00Z', readAt: null, createdAt: '2026-03-05T15:00:00Z',
  },
  {
    id: 'cb-3', studentId: 's4', studentName: '張志豪', courseId: 'c1', courseName: '國中數學 A 班',
    date: '2026-03-05', status: 'draft' as const,
    groupProgress: '本週進入一元二次方程式，同學們掌握度約 80%。配合講義 P.45-52 練習。',
    groupHomework: '數學講義 P.48-50 所有練習題，下週二前繳交。',
    individualProgress: '',
    individualHomework: '',
    teacherNote: '',
    examScores: [
      { id: 'es-5', subject: '數學', score: 64, classAvg: 75, fullScore: 100 },
    ],
    photos: [],
    parentFeedback: null,
    aiAnalysis: { weakSummary: '數學成績低於班級平均 11 分，一元二次方程式概念仍需加強。', recommendations: ['每天多做 5 題基礎練習', '建議參加個別指導課程', '預計 2 週可見成效'] },
    sentAt: null, readAt: null, createdAt: '2026-03-05T15:00:00Z',
  },
  {
    id: 'cb-4', studentId: 's3', studentName: '王大明', courseId: 'c2', courseName: '國中英文菁英班',
    date: '2026-03-05', status: 'read' as const,
    groupProgress: '今天完成 Unit 5 閱讀理解+口語練習，同學表現優異。',
    groupHomework: 'Workbook P.30-32，下週三繳交。',
    individualProgress: '大明口說能力強，但拼字偶有錯誤，建議多寫。',
    individualHomework: '額外：抄寫本週 20 個新單字各三遍。',
    teacherNote: '大明很有語言天賦，鼓勵他多看英文影片培養語感！',
    examScores: [
      { id: 'es-6', subject: '英文', score: 85, classAvg: 80, fullScore: 100 },
    ],
    photos: [
      { id: 'ph-3', url: 'https://placehold.co/400x300/d5e8d5/506b50?text=英文話劇', name: '話劇排練.jpg' },
    ],
    parentFeedback: { rating: 4, comment: '好棒！孩子回家說今天很開心', createdAt: '2026-03-05T21:00:00Z' },
    aiAnalysis: null,
    sentAt: '2026-03-05T17:00:00Z', readAt: '2026-03-05T20:30:00Z', createdAt: '2026-03-05T16:00:00Z',
  },
  {
    id: 'cb-5', studentId: 's5', studentName: '李宜庭', courseId: 'c6', courseName: '安親班（國小）',
    date: '2026-03-05', status: 'sent' as const,
    groupProgress: '今天完成國語和數學作業指導，全班表現良好。',
    groupHomework: '無額外回家作業。',
    individualProgress: '宜庭今天完成了數學和國語作業，表現很棒！國語閱讀測驗答對 9/10。',
    individualHomework: '回家閱讀課外書 30 分鐘。',
    teacherNote: '宜庭很乖巧，今天幫忙整理教室，是小幫手！',
    examScores: [
      { id: 'es-7', subject: '國語', score: 90, classAvg: 82, fullScore: 100 },
      { id: 'es-8', subject: '數學', score: 100, classAvg: 85, fullScore: 100 },
    ],
    photos: [],
    parentFeedback: null,
    aiAnalysis: null,
    sentAt: '2026-03-05T16:30:00Z', readAt: null, createdAt: '2026-03-05T16:00:00Z',
  },
  // 昨天的記錄
  {
    id: 'cb-6', studentId: 's1', studentName: '陳小利', courseId: 'c1', courseName: '國中數學 A 班',
    date: '2026-03-04', status: 'read' as const,
    groupProgress: '複習因式分解，全班練習測驗平均 78 分。',
    groupHomework: '講義 P.42-44 複習題。',
    individualProgress: '小利因式分解掌握不錯，速度可以再快一些。',
    individualHomework: '限時練習 P.43 第 1-10 題（15 分鐘內完成）。',
    teacherNote: '明天小考，記得複習第三章！',
    examScores: [
      { id: 'es-9', subject: '數學（隨堂）', score: 82, classAvg: 78, fullScore: 100 },
    ],
    photos: [],
    parentFeedback: { rating: 4, comment: '會提醒小利複習的，謝謝！', createdAt: '2026-03-04T21:00:00Z' },
    aiAnalysis: null,
    sentAt: '2026-03-04T16:30:00Z', readAt: '2026-03-04T20:15:00Z', createdAt: '2026-03-04T15:00:00Z',
  },
]

const CONTACT_BOOK_TEMPLATES = [
  { id: 'tpl-1', courseId: 'c1', groupProgress: '本週學習進度：', groupHomework: '回家作業：', createdAt: '2026-03-01T10:00:00Z' },
  { id: 'tpl-2', courseId: 'c6', groupProgress: '今日安親班學習概況：', groupHomework: '回家注意事項：', createdAt: '2026-03-01T10:00:00Z' },
]

// ===== Daycare Packages =====
const DEMO_DAYCARE_PACKAGES = [
  {
    id: 'pkg-1',
    tenant_id: DEMO_TENANT_1,
    branch_id: null,
    name: '全方位套餐',
    services: ['安親', '課輔', '餐食', '才藝'],
    price: '8000',
    description: '含安親看顧、課業輔導、午餐晚餐、才藝課程',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pkg-2',
    tenant_id: DEMO_TENANT_1,
    branch_id: null,
    name: '基礎安親',
    services: ['安親', '課輔'],
    price: '5000',
    description: '含安親看顧、課業輔導',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pkg-3',
    tenant_id: DEMO_TENANT_1,
    branch_id: null,
    name: '安親+餐食',
    services: ['安親', '餐食'],
    price: '6500',
    description: '含安親看顧、午餐晚餐',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

// ===== Price Memory =====
const DEMO_PRICE_MEMORY = [
  { id: 'pm-1', course_id: 'c1', student_id: 's1', amount: '3500', payment_type: 'monthly', metadata: null, updated_at: '2026-02-15T00:00:00Z' },
  { id: 'pm-2', course_id: 'c1', student_id: 's2', amount: '9500', payment_type: 'quarterly', metadata: null, updated_at: '2026-02-15T00:00:00Z' },
  { id: 'pm-3', course_id: 'c6', student_id: 's3', amount: '8000', payment_type: 'monthly', metadata: { packageName: '全方位套餐' }, updated_at: '2026-03-01T00:00:00Z' },
]

// ===== Session Count =====
function getDemoSessionCount(courseId: string, month: string) {
  const counts: Record<string, number> = { 'c1': 12, 'c2': 8, 'c3': 16, 'c4': 4 }
  const count = counts[courseId] || 8
  const sessions = []
  const [year, m] = month.split('-').map(Number)
  for (let i = 0; i < count; i++) {
    const day = Math.min(1 + i * 2, 28)
    sessions.push({
      date: `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      startTime: '14:00',
      endTime: '16:00',
      status: 'scheduled',
    })
  }
  return { courseId, month, sessionCount: count, sessions }
}

// ===== Makeup Classes =====
const DEMO_MAKEUP_CLASSES = [
  {
    id: 'mk-1', tenant_id: '11111111-1111-1111-1111-111111111111',
    student_id: 's1', student_name: '陳小明',
    original_date: '2026-03-03', original_course_id: 'c1', original_course_name: '國中數學A班',
    status: 'pending', makeup_date: null, makeup_time: null, makeup_end_time: null,
    makeup_teacher_id: null, makeup_teacher_name: null, makeup_room: null, notes: '家長已告知',
    created_at: '2026-03-03T10:00:00Z',
  },
  {
    id: 'mk-2', tenant_id: '11111111-1111-1111-1111-111111111111',
    student_id: 's2', student_name: '林小華',
    original_date: '2026-03-01', original_course_id: 'c2', original_course_name: '國中英文B班',
    status: 'scheduled', makeup_date: '2026-03-08', makeup_time: '14:00', makeup_end_time: '16:00',
    makeup_teacher_id: 't1', makeup_teacher_name: '王老師', makeup_room: '教室A',
    notes: null, created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'mk-3', tenant_id: '11111111-1111-1111-1111-111111111111',
    student_id: 's3', student_name: '張志豪',
    original_date: '2026-02-27', original_course_id: 'c1', original_course_name: '國中數學A班',
    status: 'completed', makeup_date: '2026-03-02', makeup_time: '10:00', makeup_end_time: '12:00',
    makeup_teacher_id: 't2', makeup_teacher_name: '李老師', makeup_room: '教室B',
    notes: null, created_at: '2026-02-27T10:00:00Z',
  },
  {
    id: 'mk-4', tenant_id: '11111111-1111-1111-1111-111111111111',
    student_id: 's4', student_name: '王小美',
    original_date: '2026-03-04', original_course_id: 'c3', original_course_name: '高中國文班',
    status: 'pending', makeup_date: null, makeup_time: null, makeup_end_time: null,
    makeup_teacher_id: null, makeup_teacher_name: null, makeup_room: null, notes: null,
    created_at: '2026-03-04T10:00:00Z',
  },
  {
    id: 'mk-5', tenant_id: '11111111-1111-1111-1111-111111111111',
    student_id: 's1', student_name: '陳小明',
    original_date: '2026-02-25', original_course_id: 'c2', original_course_name: '國中英文B班',
    status: 'cancelled', makeup_date: null, makeup_time: null, makeup_end_time: null,
    makeup_teacher_id: null, makeup_teacher_name: null, makeup_room: null, notes: '學生轉班',
    created_at: '2026-02-25T10:00:00Z',
  },
]

// ===== Makeup Slots (補課時段) =====
const DEMO_MAKEUP_SLOTS = [
  { id: 'ms-1', tenant_id: '11111111-1111-1111-1111-111111111111', subject: '數學', makeup_date: '2026-03-10', start_time: '18:00', end_time: '20:00', teacher_id: 't1', teacher_name: '王大明', room: 'A201', max_students: 10, current_students: 3, notes: null, created_at: '2026-03-05T10:00:00Z' },
  { id: 'ms-2', tenant_id: '11111111-1111-1111-1111-111111111111', subject: '英文', makeup_date: '2026-03-12', start_time: '14:00', end_time: '16:00', teacher_id: 't2', teacher_name: '李小華', room: 'B102', max_students: 8, current_students: 5, notes: null, created_at: '2026-03-05T10:00:00Z' },
  { id: 'ms-3', tenant_id: '11111111-1111-1111-1111-111111111111', subject: '國文', makeup_date: '2026-03-15', start_time: '10:00', end_time: '12:00', teacher_id: 't1', teacher_name: '王大明', room: 'A201', max_students: 10, current_students: 0, notes: null, created_at: '2026-03-05T10:00:00Z' },
]

// ===== Route handler =====

export const DEMO_TENANTS = [DEMO_TENANT_1, DEMO_TENANT_2]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDemoResponse(method: string, path: string, searchParams: URLSearchParams, body?: Record<string, any>): { status: number; body: unknown } | null {
  if (method === 'GET') {
    // Tenant APIs
    if (path === '/api/admin/tenants') return { status: 200, body: { tenants: TENANTS } }
    const tenantStatsMatch = path.match(/^\/api\/admin\/tenants\/([\w-]+)\/stats$/)
    if (tenantStatsMatch) {
      const tid = tenantStatsMatch[1]
      return { status: 200, body: TENANT_STATS[tid] || { branches: 0 } }
    }

    // Student APIs — grade-upgrade-preview (must be before generic students handler)
    if (path.includes('grade-upgrade-preview')) {
      return { status: 200, body: { success: true, data: STUDENTS.filter(s => s.date_of_birth).map(s => ({ id: s.id, name: s.name, currentGrade: s.computed_grade, nextGrade: s.computed_grade })) } }
    }

    // Student APIs — binding-token GET (must be before generic student detail handler)
    if (method === 'GET' && path.match(/\/students\/[^/]+\/binding-token$/)) {
      const studentId = path.split('/')[4] // extract from /api/admin/students/:id/binding-token
      const token = DEMO_BINDING_TOKENS.find(t => t.student_id === studentId && !t.used_at)
      if (token) {
        const isExpired = token.expires_at && new Date(token.expires_at) < new Date()
        return { status: 200, body: { success: true, data: isExpired ? null : { token: token.token, expiresAt: token.expires_at, createdAt: token.created_at, usedAt: token.used_at, usedByLineId: token.used_by_line_id, qrUrl: token.qr_url } } }
      }
      // Check for used tokens
      const usedToken = DEMO_BINDING_TOKENS.find(t => t.student_id === studentId)
      if (usedToken && usedToken.used_at) {
        return { status: 200, body: { success: true, data: { token: usedToken.token, expiresAt: usedToken.expires_at, createdAt: usedToken.created_at, usedAt: usedToken.used_at, usedByLineId: usedToken.used_by_line_id, qrUrl: usedToken.qr_url } } }
      }
      return { status: 200, body: { success: true, data: null } }
    }

    // Student APIs — bind/:token GET (public)
    if (method === 'GET' && path.match(/\/bind\/[^/]+$/)) {
      const token = path.split('/').pop()!
      const found = DEMO_BINDING_TOKENS.find(t => t.token === token)
      if (!found) return { status: 200, body: { valid: false, reason: 'not_found' } }
      if (found.used_at) return { status: 200, body: { valid: false, reason: 'used' } }
      if (found.expires_at && new Date(found.expires_at) < new Date()) return { status: 200, body: { valid: false, reason: 'expired' } }
      return { status: 200, body: { valid: true, studentName: found.student_name, tenantName: '蜂神榜示範補習班' } }
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
    if (path === '/api/w8/teachers') return { status: 200, body: { success: true, data: { teachers: TEACHERS.map(t => ({ ...t, full_name: t.name, role: t.teacher_role || t.title })) } } }

    // Students (for schedule page individual tutoring)
    if (path === '/api/w8/students') {
      const studentsWithAlias = STUDENTS.map(s => ({ ...s, full_name: s.name, grade_level: s.grade }))
      return { status: 200, body: { success: true, data: { students: studentsWithAlias } } }
    }

    // Schedules
    if (path === '/api/w8/schedules') {
      const start = searchParams.get('start_date') || '2026-02-24'
      const end = searchParams.get('end_date') || '2026-03-02'
      return { status: 200, body: { schedules: getWeekSchedules(start, end) } }
    }

    // Makeup Slots — 補課時段
    if (path === '/api/admin/makeup-slots') {
      let filtered = DEMO_MAKEUP_SLOTS
      const subject = searchParams.get('subject')
      const dateFrom = searchParams.get('dateFrom')
      const dateTo = searchParams.get('dateTo')
      if (subject) filtered = filtered.filter(s => s.subject === subject)
      if (dateFrom) filtered = filtered.filter(s => s.makeup_date >= dateFrom)
      if (dateTo) filtered = filtered.filter(s => s.makeup_date <= dateTo)
      return { status: 200, body: { success: true, data: { slots: filtered } } }
    }
    const makeupSlotStudentsMatch = path.match(/^\/api\/admin\/makeup-slots\/([\w-]+)\/students$/)
    if (makeupSlotStudentsMatch) {
      return { status: 200, body: { success: true, data: { students: [
        { id: 's1', name: '陳小利', grade: '國一', original_course: '國中數學 A 班', original_date: '2026-03-03' },
        { id: 's4', name: '張志豪', grade: '國三', original_course: '國中數學 A 班', original_date: '2026-03-05' },
        { id: 's7', name: '劉思涵', grade: '國一', original_course: '國中數學 A 班', original_date: '2026-03-03' },
      ] } } }
    }

    // Course detail — 課程詳情 + 學生名單
    const courseDetailMatch = path.match(/^\/api\/w8\/courses\/([\w-]+)$/)
    if (courseDetailMatch) {
      const courseId = courseDetailMatch[1]
      const course = COURSES.find(c => c.id === courseId)
      if (!course) return { status: 404, body: { success: false, error: 'Course not found' } }
      const students = (COURSE_STUDENTS[courseId] || []).map(s => ({
        id: s.id, full_name: s.full_name, grade_level: s.grade_level,
      }))
      return { status: 200, body: { success: true, data: { course, students } } }
    }

    // Makeup Classes notice PDF — HTML 補課通知書
    const makeupNoticePdfMatch = path.match(/^\/api\/admin\/makeup-classes\/([\w-]+)\/notice-pdf$/)
    if (makeupNoticePdfMatch) {
      const mkId = makeupNoticePdfMatch[1]
      const mk = DEMO_MAKEUP_CLASSES.find(m => m.id === mkId)
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>補課通知書</title></head><body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;border:1px solid #ccc;">
<h1 style="text-align:center;">補課通知書</h1>
<p>親愛的家長您好：</p>
<p>貴子弟 <strong>${mk?.student_name || '學生'}</strong> 因 ${mk?.original_date || '日期'} 之 <strong>${mk?.original_course_name || '課程'}</strong> 缺席，需安排補課。</p>
<p>補課日期：${mk?.makeup_date || '待定'}<br/>補課時間：${mk?.makeup_time || '待定'} ~ ${mk?.makeup_end_time || '待定'}<br/>教室：${mk?.makeup_room || '待定'}<br/>授課老師：${mk?.makeup_teacher_name || '待定'}</p>
<p>請準時出席，謝謝！</p>
<p style="text-align:right;margin-top:40px;">蜂神榜示範補習班 敬上</p>
</body></html>`
      return { status: 200, body: html }
    }

    // Makeup Classes — 補課管理
    if (path === '/api/admin/makeup-classes') {
      const status = searchParams.get('status')
      let filtered = DEMO_MAKEUP_CLASSES
      if (status) filtered = filtered.filter(m => m.status === status)
      return { status: 200, body: { success: true, data: { makeupClasses: filtered } } }
    }

    // Contact Book — 反饋統計
    if (path === '/api/admin/contact-book/feedback-stats') {
      return { status: 200, body: { success: true, data: {
        summary: {
          totalFeedbacks: 47,
          averageRating: 4.3,
          ratingDistribution: { '1': 1, '2': 2, '3': 6, '4': 18, '5': 20 },
        },
        byCourse: [
          { courseId: 'c1', courseName: '國中數學A班', avgRating: 4.5, count: 15 },
          { courseId: 'c2', courseName: '國中英文B班', avgRating: 4.2, count: 12 },
          { courseId: 'c3', courseName: '高中國文班', avgRating: 4.1, count: 10 },
          { courseId: 'c6', courseName: '小學安親班', avgRating: 4.6, count: 10 },
        ],
        byTeacher: [
          { teacherId: 't1', teacherName: '王老師', avgRating: 4.6, count: 18 },
          { teacherId: 't2', teacherName: '李老師', avgRating: 4.3, count: 15 },
          { teacherId: 't3', teacherName: '陳主任', avgRating: 4.0, count: 14 },
        ],
        recentFeedbacks: [
          { id: 'fb-1', studentName: '陳小明', rating: 5, comment: '老師非常用心，孩子進步很多！', date: '2026-03-04', courseName: '國中數學A班' },
          { id: 'fb-2', studentName: '林小華', rating: 4, comment: '整體不錯，希望能多些練習', date: '2026-03-03', courseName: '國中英文B班' },
          { id: 'fb-3', studentName: '張志豪', rating: 5, comment: '很滿意教學品質', date: '2026-03-02', courseName: '高中國文班' },
          { id: 'fb-4', studentName: '王小美', rating: 3, comment: '希望作業量能再調整', date: '2026-03-01', courseName: '小學安親班' },
          { id: 'fb-5', studentName: '吳承恩', rating: 4, comment: '孩子很喜歡上課', date: '2026-02-28', courseName: '國中數學A班' },
        ],
      } } }
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
          { teacher_id: 't1', teacher_name: '王老師', title: '資深講師', teacher_role: null, salary_type: 'per_class', rate_per_class: '800', base_salary: '0', hourly_rate: '0', total_classes: 12, total_hours: 18, base_amount: 9600, bonus_total: 500, deduction_total: 0, total_amount: 10100, net_amount: 10100, insurance_config: TEACHERS[0].insurance_config, labor_personal_amount: 0, labor_employer_amount: 0, health_personal_amount: 0, health_employer_amount: 0, personal_insurance_total: 0, employer_insurance_total: 0, supplemental_health_premium_amount: 0, should_withhold_supplemental_health: false, supplemental_health_threshold: 29500, supplemental_health_rate: 0.0211, supplemental_health_reason: '本次給付未達兼職薪資補充保費基本工資門檻。', adjustments: [{ id: 'adj-1', type: 'bonus', name: '全勤獎金', amount: '500' }] },
          { teacher_id: 't2', teacher_name: '李老師', title: '首席講師', teacher_role: null, salary_type: 'per_class', rate_per_class: '900', base_salary: '0', hourly_rate: '0', total_classes: 34, total_hours: 51, base_amount: 30600, bonus_total: 0, deduction_total: 200, total_amount: 30400, net_amount: 29980, insurance_config: TEACHERS[1].insurance_config, labor_personal_amount: 0, labor_employer_amount: 0, health_personal_amount: 420, health_employer_amount: 840, personal_insurance_total: 420, employer_insurance_total: 840, supplemental_health_premium_amount: 641, should_withhold_supplemental_health: true, supplemental_health_threshold: 29500, supplemental_health_rate: 0.0211, supplemental_health_reason: '兼職且未在本單位投保，單次給付達基本工資門檻，建議代扣二代健保補充保費。', adjustments: [{ id: 'adj-2', type: 'deduction', name: '遲到扣薪', amount: '200' }] },
          { teacher_id: 't3', teacher_name: '陳主任', title: '教務主任', teacher_role: '主任', salary_type: 'monthly', rate_per_class: '0', base_salary: '45000', hourly_rate: '0', total_classes: 0, total_hours: 0, base_amount: 45000, bonus_total: 0, deduction_total: 0, total_amount: 45000, net_amount: 43485, insurance_config: TEACHERS[2].insurance_config, labor_personal_amount: 1056, labor_employer_amount: 3696, health_personal_amount: 459, health_employer_amount: 918, personal_insurance_total: 1515, employer_insurance_total: 4614, supplemental_health_premium_amount: 0, should_withhold_supplemental_health: false, supplemental_health_threshold: 29500, supplemental_health_rate: 0.0211, supplemental_health_reason: '正職人員通常走一般健保投保，不列兼職補充保費試算。', adjustments: [] },
          { teacher_id: 't4', teacher_name: '林助教', title: '助教', teacher_role: '助教', salary_type: 'hourly', rate_per_class: '0', base_salary: '0', hourly_rate: '200', total_classes: 20, total_hours: 40, base_amount: 8000, bonus_total: 0, deduction_total: 0, total_amount: 8000, net_amount: 8000, insurance_config: TEACHERS[3].insurance_config, labor_personal_amount: 0, labor_employer_amount: 0, health_personal_amount: 0, health_employer_amount: 0, personal_insurance_total: 0, employer_insurance_total: 0, supplemental_health_premium_amount: 0, should_withhold_supplemental_health: false, supplemental_health_threshold: 29500, supplemental_health_rate: 0.0211, supplemental_health_reason: '平均每週工時達 12 小時以上，應先確認是否改由本單位辦理一般健保投保。', adjustments: [] },
        ],
        grand_total_classes: 40,
        grand_total_amount: 93500,
        grand_net_amount: 91565,
        grand_personal_insurance_total: 1935,
        grand_employer_insurance_total: 5454,
        grand_supplemental_health_premium_amount: 641,
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

    // Billing — 個指帳務
    if (path === '/api/admin/billing/individual') {
      const periodMonth = searchParams.get('periodMonth') || '2026-03'
      return { status: 200, body: { success: true, data: { students: [
        { id: 's4', full_name: '張志豪', grade_level: '國三', fee_per_session: 1200, sessions_completed: 4, payment_id: 'pay-ind-1', paid_amount: 4800, status: 'paid', period_month: periodMonth },
        { id: 's1', full_name: '陳小利', grade_level: '國一', fee_per_session: 900, sessions_completed: 4, payment_id: 'pay-ind-2', paid_amount: 3600, status: 'paid', period_month: periodMonth },
        { id: 's3', full_name: '林美琪', grade_level: '國一', fee_per_session: 900, sessions_completed: 4, status: 'pending', period_month: periodMonth },
      ], stats: { total_amount: 12000, paid_amount: 8400, unpaid_amount: 3600, overdue_amount: 0 } } } }
    }

    // Billing — 安親套餐
    if (path === '/api/admin/billing/daycare-packages') {
      return { status: 200, body: { success: true, data: DEMO_DAYCARE_PACKAGES } }
    }

    // Billing — 價格記憶
    if (path === '/api/admin/billing/price-memory') {
      return { status: 200, body: { success: true, data: DEMO_PRICE_MEMORY } }
    }

    // Billing — 堂數計算
    if (path === '/api/admin/billing/session-count') {
      const courseId = searchParams.get('courseId') || 'c1'
      const month = searchParams.get('month') || '2026-03'
      return { status: 200, body: { success: true, data: getDemoSessionCount(courseId, month) } }
    }

    // Billing — 家長繳費紀錄
    if (path === '/api/admin/billing/payment-records' || path.startsWith('/api/admin/billing')) {
      return { status: 200, body: { success: true, data: { records: BILLING_RECORDS } } }
    }

    // AI 課程推薦
    if (path === '/api/w8/recommendations') {
      const studentId = searchParams.get('studentId')
      const allRecs = [
        {
          student_id: 's4',
          student_name: '張志豪',
          grade: '國中一年級',
          weak_subjects: [{ subject: '數學', average_score: 64, threshold: 70 }],
          recommended_courses: [
            { id: 'c1', name: '國中數學 A 班', teacher: '王老師', schedule: '每週二、四 18:00–20:00', monthly_fee: 3200, subject: '數學', description: '數學平均 64 分，建議加強', priority: 'low' },
          ],
        },
        {
          student_id: 's8',
          student_name: '吳承恩',
          grade: '國中二年級',
          weak_subjects: [
            { subject: '數學', average_score: 58, threshold: 70 },
          ],
          recommended_courses: [
            { id: 'c1', name: '國中數學 A 班', teacher: '王老師', schedule: '每週二、四 18:00–20:00', monthly_fee: 3200, subject: '數學', description: '數學平均 58 分，建議加強', priority: 'high' },
            { id: 'c2', name: '國中英文菁英班', teacher: '林老師', schedule: '每週六 10:00–12:00', monthly_fee: 2800, subject: '英文', description: '英文成績偏弱，建議加強', priority: 'medium' },
          ],
        },
        {
          student_id: 's2',
          student_name: '王大明',
          grade: '國中一年級',
          weak_subjects: [{ subject: '英文', average_score: 68, threshold: 70 }],
          recommended_courses: [
            { id: 'c2', name: '國中英文菁英班', teacher: '林老師', schedule: '每週六 10:00–12:00', monthly_fee: 2800, subject: '英文', description: '英文平均 68 分，建議加強', priority: 'low' },
          ],
        },
      ]
      const filtered = studentId ? allRecs.filter(r => r.student_id === studentId) : allRecs
      return { status: 200, body: { success: true, data: { recommendations: filtered } } }
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

    // Knowledge — 已移至總後台
    // Conversations — 已移至 94BOT

    // Notifications — 電子聯絡簿
    if (path === '/api/w8/notifications') {
      const limitParam = parseInt(searchParams.get('limit') || '20')
      const studentId = searchParams.get('studentId')
      const type = searchParams.get('type')
      let filtered = NOTIFICATIONS
      if (studentId) filtered = filtered.filter(n => n.student_name === studentId)
      if (type && type !== 'all') filtered = filtered.filter(n => n.type === type)
      filtered = filtered.slice(0, limitParam)
      return { status: 200, body: { notifications: filtered, unread: filtered.filter(n => !n.read).length } }
    }

    // Teacher Attendance — 師資出缺勤
    if (path === '/api/teacher-attendance' || path === '/api/teacher-attendance/' || path === '/api/admin/teacher-attendance') {
      const date = searchParams.get('date')
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const month = searchParams.get('month') || currentMonth
      const teacherId = searchParams.get('teacherId')
      let filtered = date
        ? (TEACHER_ATTENDANCE.filter(ta => ta.date === date).length > 0
            ? TEACHER_ATTENDANCE.filter(ta => ta.date === date)
            : buildDemoTeacherAttendance(date))
        : TEACHER_ATTENDANCE.filter(ta => ta.date.startsWith(month))
      if (teacherId) filtered = filtered.filter(ta => ta.teacher_id === teacherId)
      return { status: 200, body: { success: true, data: { records: filtered } } }
    }
    if (path === '/api/teacher-attendance/stats') {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const month = searchParams.get('month') || currentMonth
      const records = TEACHER_ATTENDANCE.filter(ta => ta.date.startsWith(month))
      const stats = TEACHERS.map(t => {
        const tRecs = records.filter(r => r.teacher_id === t.id)
        return {
          teacher_id: t.id, teacher_name: t.name,
          present: tRecs.filter(r => r.status === 'present').length,
          late: tRecs.filter(r => r.status === 'late').length,
          absent: tRecs.filter(r => r.status === 'absent').length,
          leave: tRecs.filter(r => r.status === 'leave').length,
          substitute: tRecs.filter(r => r.status === 'substitute').length,
          attendance_rate: tRecs.length > 0 ? Math.round(tRecs.filter(r => r.status === 'present' || r.status === 'late').length / tRecs.length * 100) : 100,
        }
      })
      return { status: 200, body: { success: true, data: { stats, month } } }
    }

    // Contact Book v2 — 電子聯絡簿（分校端）
    if (path === '/api/admin/contact-book/entries') {
      const courseId = searchParams.get('courseId')
      const date = searchParams.get('date')
      let filtered = CONTACT_BOOK_ENTRIES
      if (courseId) filtered = filtered.filter(e => e.courseId === courseId)
      if (date) filtered = filtered.filter(e => e.date === date)
      // Map to backend format
      const entries = filtered.map(e => ({
        id: e.id, studentId: e.studentId, studentName: e.studentName,
        courseId: e.courseId, entryDate: e.date, status: e.status,
        groupProgress: e.groupProgress, groupHomework: e.groupHomework,
        individualNote: e.individualProgress, individualHomework: e.individualHomework,
        teacherTip: e.teacherNote, sentAt: e.sentAt, readAt: e.readAt, createdAt: e.createdAt,
        scores: e.examScores, photos: e.photos.map(p => ({ id: p.id, url: p.url, caption: p.name, sortOrder: 0 })),
        feedback: e.parentFeedback ? [{ id: 'fb-' + e.id, parentUserId: 'demo-parent', rating: e.parentFeedback.rating, comment: e.parentFeedback.comment, createdAt: e.parentFeedback.createdAt }] : [],
        aiAnalysis: e.aiAnalysis ? { id: 'ai-' + e.id, weaknessSummary: e.aiAnalysis.weakSummary, recommendedCourseName: e.aiAnalysis.recommendations[0] ?? '', recommendedCourseDesc: e.aiAnalysis.recommendations.join('；') } : null,
      }))
      const entryStudentIds = new Set(entries.map(e => e.studentId))
      const studentsWithoutEntry = STUDENTS
        .filter(s => !entryStudentIds.has(s.id))
        .slice(0, 3)
        .map(s => ({ studentId: s.id, studentName: s.name, studentGrade: s.grade }))
      return { status: 200, body: { success: true, data: { entries, studentsWithoutEntry } } }
    }
    const cbEntryMatch = path.match(/^\/api\/admin\/contact-book\/entries\/([\w-]+)$/)
    if (cbEntryMatch) {
      const entry = CONTACT_BOOK_ENTRIES.find(e => e.id === cbEntryMatch[1])
      if (entry) {
        return { status: 200, body: { success: true, data: {
          id: entry.id, studentId: entry.studentId, studentName: entry.studentName,
          courseId: entry.courseId, entryDate: entry.date, status: entry.status,
          groupProgress: entry.groupProgress, groupHomework: entry.groupHomework,
          individualNote: entry.individualProgress, individualHomework: entry.individualHomework,
          teacherTip: entry.teacherNote, sentAt: entry.sentAt, readAt: entry.readAt, createdAt: entry.createdAt,
          scores: entry.examScores,
          photos: entry.photos.map(p => ({ id: p.id, url: p.url, caption: p.name, sortOrder: 0 })),
          feedback: entry.parentFeedback ? [{ id: 'fb-1', parentUserId: 'demo-parent', rating: entry.parentFeedback.rating, comment: entry.parentFeedback.comment, createdAt: entry.parentFeedback.createdAt }] : [],
          aiAnalysis: entry.aiAnalysis ? { id: 'ai-1', weaknessSummary: entry.aiAnalysis.weakSummary, recommendedCourseName: entry.aiAnalysis.recommendations[0] ?? '', recommendedCourseDesc: entry.aiAnalysis.recommendations.join('；') } : null,
        } } }
      }
      return { status: 404, body: { success: false, error: 'not_found' } }
    }
    if (path === '/api/admin/contact-book/templates') {
      return { status: 200, body: { success: true, data: CONTACT_BOOK_TEMPLATES } }
    }
    const cbPhotoMatch = path.match(/^\/api\/admin\/contact-book\/photos\/([\w-]+)$/)
    if (cbPhotoMatch) {
      return { status: 200, body: { success: true } }
    }

    // Contact Book v2 — 家長端
    if (path === '/api/parent/contact-book') {
      const studentId = searchParams.get('studentId')
      let filtered = CONTACT_BOOK_ENTRIES.filter(e => e.status === 'sent' || e.status === 'read')
      if (studentId) filtered = filtered.filter(e => e.studentId === studentId)
      const data = filtered.map(e => ({
        id: e.id, entryDate: e.date, status: e.status, isRead: e.status === 'read',
        readAt: e.readAt, sentAt: e.sentAt, courseId: e.courseId, courseName: e.courseName,
        groupProgress: e.groupProgress, groupHomework: e.groupHomework,
        individualNote: e.individualProgress, individualHomework: e.individualHomework,
        teacherTip: e.teacherNote,
        scores: e.examScores.map(s => ({ subject: s.subject, score: String(s.score) })),
      }))
      return { status: 200, body: { success: true, data } }
    }
    const parentCbMatch = path.match(/^\/api\/parent\/contact-book\/([\w-]+)$/)
    if (parentCbMatch) {
      const entry = CONTACT_BOOK_ENTRIES.find(e => e.id === parentCbMatch[1])
      if (entry && (entry.status === 'sent' || entry.status === 'read')) {
        return { status: 200, body: { success: true, data: {
          id: entry.id, tenantId: DEMO_TENANT_1, studentId: entry.studentId, courseId: entry.courseId,
          entryDate: entry.date, status: entry.status, groupProgress: entry.groupProgress,
          groupHomework: entry.groupHomework, individualNote: entry.individualProgress,
          individualHomework: entry.individualHomework, teacherTip: entry.teacherNote,
          sentAt: entry.sentAt, readAt: entry.readAt, createdAt: entry.createdAt,
          courseName: entry.courseName, isRead: entry.status === 'read',
          scores: entry.examScores.map(s => ({ id: s.id, subject: s.subject, score: String(s.score), classAvg: String(s.classAvg), fullScore: String(s.fullScore) })),
          photos: entry.photos.map(p => ({ id: p.id, url: p.url, caption: p.name, sortOrder: 0 })),
          feedbacks: entry.parentFeedback ? [{ id: 'fb-1', parentUserId: 'demo-parent', rating: entry.parentFeedback.rating, comment: entry.parentFeedback.comment, createdAt: entry.parentFeedback.createdAt }] : [],
          aiAnalysis: entry.aiAnalysis ? { id: 'ai-1', weaknessSummary: entry.aiAnalysis.weakSummary, recommendedCourseName: entry.aiAnalysis.recommendations[0] ?? '', recommendedCourseDesc: entry.aiAnalysis.recommendations.join('；'), createdAt: entry.createdAt } : null,
        } } }
      }
      return { status: 404, body: { success: false, error: 'not_found' } }
    }

    // LIFF Contact Book (same shape as parent detail)
    const liffCbMatch = path.match(/^\/api\/line\/contact-book\/([\w-]+)$/)
    if (liffCbMatch) {
      const entry = CONTACT_BOOK_ENTRIES.find(e => e.id === liffCbMatch[1])
      if (entry && (entry.status === 'sent' || entry.status === 'read')) {
        return { status: 200, body: { success: true, data: {
          id: entry.id, tenantId: DEMO_TENANT_1, studentId: entry.studentId, courseId: entry.courseId,
          entryDate: entry.date, status: entry.status, groupProgress: entry.groupProgress,
          groupHomework: entry.groupHomework, individualNote: entry.individualProgress,
          individualHomework: entry.individualHomework, teacherTip: entry.teacherNote,
          sentAt: entry.sentAt, readAt: entry.readAt, createdAt: entry.createdAt,
          courseName: entry.courseName, isRead: entry.status === 'read',
          scores: entry.examScores.map(s => ({ id: s.id, subject: s.subject, score: String(s.score), classAvg: String(s.classAvg), fullScore: String(s.fullScore) })),
          photos: entry.photos.map(p => ({ id: p.id, url: p.url, caption: p.name, sortOrder: 0 })),
          feedbacks: entry.parentFeedback ? [{ id: 'fb-1', parentUserId: 'demo-parent', rating: entry.parentFeedback.rating, comment: entry.parentFeedback.comment, createdAt: entry.parentFeedback.createdAt }] : [],
          aiAnalysis: entry.aiAnalysis ? { id: 'ai-1', weaknessSummary: entry.aiAnalysis.weakSummary, recommendedCourseName: entry.aiAnalysis.recommendations[0] ?? '', recommendedCourseDesc: entry.aiAnalysis.recommendations.join('；'), createdAt: entry.createdAt } : null,
        } } }
      }
      return { status: 404, body: { success: false, error: 'not_found' } }
    }

    // Analytics — 網站監控（superadmin）
    if (path === '/api/admin/analytics/overview') {
      const daily = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 29 + i)
        const date = d.toISOString().split('T')[0]
        return { date, pv: 40 + Math.floor(Math.random() * 80), uv: 15 + Math.floor(Math.random() * 30) }
      })
      const todayData = daily[daily.length - 1]
      const weekData = daily.slice(-7)
      return { status: 200, body: { success: true, data: {
        today: { pv: todayData.pv, uv: todayData.uv },
        thisWeek: { pv: weekData.reduce((s, d) => s + d.pv, 0), uv: weekData.reduce((s, d) => s + d.uv, 0) },
        thisMonth: { pv: daily.reduce((s, d) => s + d.pv, 0), uv: daily.reduce((s, d) => s + d.uv, 0) },
        daily,
      } } }
    }
    if (path === '/api/admin/analytics/pages') {
      return { status: 200, body: { success: true, data: [
        { path: '/', pv: 820, uv: 310 }, { path: '/landing', pv: 540, uv: 280 },
        { path: '/login', pv: 320, uv: 190 }, { path: '/trial-signup', pv: 180, uv: 120 },
        { path: '/demo', pv: 150, uv: 95 }, { path: '/dashboard', pv: 130, uv: 45 },
        { path: '/students', pv: 95, uv: 35 }, { path: '/schedules', pv: 88, uv: 32 },
        { path: '/grades', pv: 76, uv: 28 }, { path: '/contact-book', pv: 65, uv: 24 },
      ] } }
    }
    if (path === '/api/admin/analytics/referrers') {
      return { status: 200, body: { success: true, data: [
        { referrer: '', count: 420 }, { referrer: 'google.com', count: 280 },
        { referrer: 'line.me', count: 150 }, { referrer: 'facebook.com', count: 95 },
        { referrer: 'ptt.cc', count: 45 }, { referrer: 'perplexity.ai', count: 32 },
      ] } }
    }
    if (path === '/api/admin/analytics/bots') {
      return { status: 200, body: { success: true, data: {
        today: 47, thisMonth: 1280, activeBots: 6,
        bots: [
          { botName: 'GPTBot', category: 'ai_crawler', today: 15, thisMonth: 420, lastSeen: new Date().toISOString() },
          { botName: 'ClaudeBot', category: 'ai_crawler', today: 8, thisMonth: 280, lastSeen: new Date().toISOString() },
          { botName: 'PerplexityBot', category: 'ai_crawler', today: 5, thisMonth: 150, lastSeen: new Date(Date.now() - 3600000).toISOString() },
          { botName: 'Googlebot', category: 'search_engine', today: 12, thisMonth: 320, lastSeen: new Date().toISOString() },
          { botName: 'Bingbot', category: 'search_engine', today: 4, thisMonth: 80, lastSeen: new Date(Date.now() - 7200000).toISOString() },
          { botName: 'facebookexternalhit', category: 'social', today: 3, thisMonth: 30, lastSeen: new Date(Date.now() - 86400000).toISOString() },
        ],
        distribution: [
          { botName: 'GPTBot', count: 420, percentage: 33 },
          { botName: 'Googlebot', count: 320, percentage: 25 },
          { botName: 'ClaudeBot', count: 280, percentage: 22 },
          { botName: 'PerplexityBot', count: 150, percentage: 12 },
          { botName: 'Bingbot', count: 80, percentage: 6 },
          { botName: 'facebookexternalhit', count: 30, percentage: 2 },
        ],
      } } }
    }
    if (path === '/api/admin/analytics/bots/logs') {
      const logs = Array.from({ length: 20 }, (_, i) => {
        const bots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Googlebot', 'Bingbot']
        const cats = ['ai_crawler', 'ai_crawler', 'ai_crawler', 'search_engine', 'search_engine']
        const paths = ['/', '/landing', '/login', '/trial-signup', '/demo', '/sitemap.xml', '/robots.txt', '/llms.txt']
        const bi = i % bots.length
        return {
          id: `log-${i}`, botName: bots[bi], category: cats[bi],
          path: paths[i % paths.length], ipAddress: `203.0.113.${10 + i}`,
          statusCode: i === 7 ? 404 : 200, responseTimeMs: 20 + Math.floor(Math.random() * 80),
          createdAt: new Date(Date.now() - i * 1800000).toISOString(),
        }
      })
      return { status: 200, body: { success: true, data: { logs, total: 47 } } }
    }

    // ===== 招生管理 =====
    if (path === '/api/admin/enrollment/funnel') {
      return { status: 200, body: { success: true, data: {
        stages: [
          { stage: 'inquiry', label: '諮詢', count: 28, percentage: 100 },
          { stage: 'trial', label: '試聽', count: 18, percentage: 64 },
          { stage: 'follow_up', label: '跟進中', count: 12, percentage: 43 },
          { stage: 'enrolled', label: '已報名', count: 8, percentage: 29 },
        ],
        leads: [
          { id: 'lead-1', name: '張小明', phone: '0912-111-222', source: 'LINE', status: 'trial', grade: '國中二年級', subject: '數學', created_at: '2026-02-28T10:00:00Z', follow_up_date: '2026-03-07', note: '對數學加強班有興趣' },
          { id: 'lead-2', name: '李美玲', phone: '0923-333-444', source: '電話', status: 'inquiry', grade: '國小六年級', subject: '英文', created_at: '2026-03-01T14:30:00Z', follow_up_date: null, note: '詢問暑期先修班' },
          { id: 'lead-3', name: '王大維', phone: '0934-555-666', source: '現場', status: 'enrolled', grade: '國中一年級', subject: '數學、英文', created_at: '2026-02-20T09:00:00Z', follow_up_date: null, note: '已完成報名繳費' },
          { id: 'lead-4', name: '陳小華', phone: '0945-777-888', source: 'LINE', status: 'follow_up', grade: '國中三年級', subject: '理化', created_at: '2026-02-25T16:00:00Z', follow_up_date: '2026-03-05', note: '考慮會考衝刺班' },
          { id: 'lead-5', name: '林芳如', phone: '0956-999-000', source: '網站', status: 'trial', grade: '國小五年級', subject: '國文', created_at: '2026-03-02T11:00:00Z', follow_up_date: '2026-03-08', note: '預約 3/8 試聽作文班' },
          { id: 'lead-6', name: '黃志豪', phone: '0967-111-333', source: '轉介紹', status: 'enrolled', grade: '國中二年級', subject: '英文', created_at: '2026-02-18T13:00:00Z', follow_up_date: null, note: '王大維同學推薦' },
        ],
      } } }
    }
    if (path === '/api/admin/enrollment/conversion') {
      return { status: 200, body: { success: true, data: {
        total_leads: 28,
        conversion_rate: 28.6,
        trials_scheduled: 18,
        enrolled_count: 8,
      } } }
    }
  }

  // Write operations — return success
  if (method === 'POST') {
    if (path === '/api/bot/ai-query') {
      return { status: 200, body: { answer: '您好！這是 Demo 模式，AI 功能在正式版中可用。目前補習班共有 8 位學生，3 個班級。', model: 'demo', intent: 'general_query', latencyMs: 150 } }
    }
    // rag-search and knowledge/ingest — 已移至總後台/94BOT
    // Contact Book v2 POST handlers
    if (path === '/api/admin/contact-book/entries') {
      return { status: 201, body: { success: true, data: [{ id: 'cb-demo-new', message: '已建立聯絡簿' }] } }
    }
    const cbSendMatch = path.match(/^\/api\/admin\/contact-book\/entries\/([\w-]+)\/send$/)
    if (cbSendMatch) {
      return { status: 200, body: { success: true, data: { message: '聯絡簿已發送' } } }
    }
    if (path === '/api/admin/contact-book/templates') {
      return { status: 200, body: { success: true, data: { id: 'tpl-demo', message: '範本已儲存' } } }
    }
    if (path === '/api/admin/contact-book/upload') {
      return { status: 200, body: { success: true, data: { id: 'ph-demo', url: 'https://placehold.co/400x300/e8dfd5/6b5e50?text=上傳照片', caption: 'demo-upload.jpg', sortOrder: 0 } } }
    }
    if (path === '/api/admin/contact-book/ai-analysis') {
      return { status: 200, body: { success: true, data: { weaknessSummary: '（Demo）數學科目表現低於班級平均，建議加強基礎運算與方程式練習。', recommendedCourseName: '數學加強班', recommendedCourseDesc: '每日練習 10 題基礎計算；建議參加數學加強班；考前複習重點公式' } } }
    }
    const parentFbMatch = path.match(/^\/api\/parent\/contact-book\/([\w-]+)\/feedback$/)
    if (parentFbMatch) {
      return { status: 201, body: { success: true, data: { id: 'fb-demo', message: '反饋已提交' } } }
    }
    const liffFbMatch = path.match(/^\/api\/line\/contact-book\/([\w-]+)\/feedback$/)
    if (liffFbMatch) {
      return { status: 201, body: { success: true, data: { id: 'fb-demo', message: '反饋已提交' } } }
    }

    // Billing — 安親套餐 POST
    if (path === '/api/admin/billing/daycare-packages') {
      return { status: 201, body: { success: true, data: { id: 'pkg-demo-new', message: '套餐已建立' } } }
    }

    // Makeup Slots — 補課時段 POST
    if (path === '/api/admin/makeup-slots') {
      return { status: 201, body: { success: true, data: { slot: { id: 'ms-demo-new', ...body } } } }
    }

    // Makeup Classes — batch-assign
    if (path === '/api/admin/makeup-classes/batch-assign') {
      return { status: 200, body: { success: true, data: { updated: body?.makeupClassIds?.length || 0 } } }
    }

    // Makeup Classes — notify
    const makeupNotifyMatch = path.match(/^\/api\/admin\/makeup-classes\/([\w-]+)\/notify$/)
    if (makeupNotifyMatch) {
      return { status: 200, body: { success: true, data: { message: '通知已發送（Demo）' } } }
    }

    // Enrollments — batch
    if (path === '/api/admin/enrollments/batch') {
      return { status: 200, body: { success: true, data: { enrolled: body?.studentIds?.length || 0 } } }
    }

    // Makeup Classes — 補課管理 POST/PUT/DELETE
    if (path === '/api/admin/makeup-classes') {
      return { status: 201, body: { success: true, data: { id: 'mk-demo-new', message: '補課記錄已建立' } } }
    }

    // Contact Book — AI 助寫
    if (path === '/api/admin/contact-book/ai-writing') {
      const studentName = body?.studentName || '貴子弟'
      const keywords = body?.keywords || '各科目'
      return { status: 200, body: { success: true, data: {
        text: `親愛的家長您好，${studentName}在近期的學習中展現了積極的態度，特別在${keywords}方面有明顯的進步。老師觀察到孩子上課時專注力提升，也更願意主動發問。建議在家時可以多鼓勵孩子複習當天所學，持續保持這份學習動力。相信在您的支持下，孩子一定能有更出色的表現！`,
        keywords,
      } } }
    }

    // Notifications — 通知發送
    if (path === '/api/notifications/send') {
      return { status: 200, body: { success: true, data: { message: '通知已發送（Demo模式）' } } }
    }

    // POST students/:id/binding-token
    if (path.match(/\/students\/[^/]+\/binding-token$/)) {
      const newToken = 'demo-' + Math.random().toString(36).slice(2, 10)
      const expiresIn = body?.expiresIn || '7d'
      const expiresAt = expiresIn === 'forever' ? null : new Date(Date.now() + (expiresIn === '30d' ? 30 : 7) * 86400000).toISOString()
      return { status: 200, body: { success: true, data: { token: newToken, expiresAt, createdAt: new Date().toISOString(), usedAt: null, usedByLineId: null, qrUrl: `https://94cram.com/bind/${newToken}` } } }
    }

    // POST bind/:token (public)
    if (path.match(/\/bind\/[^/]+$/)) {
      const token = path.split('/').pop()!
      const found = DEMO_BINDING_TOKENS.find(t => t.token === token)
      if (!found || found.used_at || (found.expires_at && new Date(found.expires_at) < new Date())) {
        return { status: 400, body: { success: false, reason: 'invalid_or_expired' } }
      }
      return { status: 200, body: { success: true, studentName: found.student_name } }
    }

    // Generic POST success
    return { status: 200, body: { success: true, message: 'Demo 操作成功' } }
  }

  if (method === 'PUT' || method === 'PATCH') {
    // 招生管理 — Lead status change
    if (path.match(/\/api\/admin\/enrollment\/lead\/[\w-]+\/status$/)) {
      return { status: 200, body: { success: true, data: { message: '狀態已更新' } } }
    }
    // Makeup Slots — 補課時段 PUT
    const makeupSlotPutMatch = path.match(/^\/api\/admin\/makeup-slots\/([\w-]+)$/)
    if (makeupSlotPutMatch) {
      return { status: 200, body: { success: true, data: { slot: { id: makeupSlotPutMatch[1], ...body } } } }
    }
    // Makeup Classes — 補課管理 PUT
    if (path.startsWith('/api/admin/makeup-classes')) {
      return { status: 200, body: { success: true, data: { message: '補課記錄已更新' } } }
    }
    // Billing — 價格記憶 PUT
    if (path === '/api/admin/billing/price-memory') {
      return { status: 200, body: { success: true, data: { records: DEMO_PRICE_MEMORY, message: '價格記憶已更新' } } }
    }
    // Billing — 安親套餐 PUT
    if (path === '/api/admin/billing/daycare-packages' || path.startsWith('/api/admin/billing/daycare-packages/')) {
      return { status: 200, body: { success: true, data: { message: '套餐已更新' } } }
    }
    return { status: 200, body: { success: true } }
  }

  if (method === 'DELETE') {
    // DELETE students/:id/binding-token
    if (path.match(/\/students\/[^/]+\/binding-token$/)) {
      return { status: 200, body: { success: true } }
    }

    // Makeup Slots — 補課時段 DELETE
    const makeupSlotDeleteMatch = path.match(/^\/api\/admin\/makeup-slots\/([\w-]+)$/)
    if (makeupSlotDeleteMatch) {
      return { status: 200, body: { success: true, data: { message: '已刪除' } } }
    }
    // Enrollments — batch DELETE
    if (path === '/api/admin/enrollments/batch') {
      return { status: 200, body: { success: true, data: { removed: body?.studentIds?.length || 0 } } }
    }
    // Makeup Classes — 補課管理 DELETE
    if (path.startsWith('/api/admin/makeup-classes')) {
      return { status: 200, body: { success: true, data: { message: '補課記錄已刪除' } } }
    }
    // Billing — 安親套餐 DELETE
    if (path.startsWith('/api/admin/billing/daycare-packages')) {
      return { status: 200, body: { success: true, data: { message: '套餐已刪除' } } }
    }
    return { status: 200, body: { success: true } }
  }

  return null
}

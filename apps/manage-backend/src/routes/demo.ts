import { Hono } from 'hono'

export const demoRoutes = new Hono()

// Dashboard stats
demoRoutes.get('/tenants/:id/stats', (c) => {
  return c.json({
    totalStudents: 24,
    attendanceRate: 91.2,
    avgGrade: 82.5,
    monthlyRevenue: 143000,
    weeklyAttendance: [
      { day: '週一', present: 20, absent: 2, late: 2 },
      { day: '週二', present: 18, absent: 3, late: 3 },
      { day: '週三', present: 22, absent: 1, late: 1 },
      { day: '週四', present: 19, absent: 3, late: 2 },
      { day: '週五', present: 21, absent: 2, late: 1 },
    ],
    revenueByMonth: [
      { month: '10月', revenue: 128000 },
      { month: '11月', revenue: 135000 },
      { month: '12月', revenue: 141000 },
      { month: '1月', revenue: 138000 },
      { month: '2月', revenue: 143000 },
    ],
  })
})

// Schedule
demoRoutes.get('/scheduling/week', (c) => {
  return c.json([
    { id: '1', day: 1, startHour: 16, endHour: 18, subject: '國小數學', teacher: '謝佳穎', room: 'A101', students: 8 },
    { id: '2', day: 1, startHour: 18, endHour: 20, subject: '國中英文', teacher: '林志明', room: 'A102', students: 6 },
    { id: '3', day: 2, startHour: 16, endHour: 18, subject: '高中物理', teacher: '王大偉', room: 'B201', students: 5 },
    { id: '4', day: 2, startHour: 18, endHour: 20, subject: '國小數學', teacher: '謝佳穎', room: 'A101', students: 7 },
    { id: '5', day: 3, startHour: 16, endHour: 18, subject: '國中數學', teacher: '謝佳穎', room: 'A101', students: 9 },
    { id: '6', day: 3, startHour: 18, endHour: 20, subject: '國中英文', teacher: '林志明', room: 'A102', students: 6 },
    { id: '7', day: 4, startHour: 16, endHour: 18, subject: '高中物理', teacher: '王大偉', room: 'B201', students: 4 },
    { id: '8', day: 5, startHour: 16, endHour: 18, subject: '國小數學', teacher: '謝佳穎', room: 'A101', students: 8 },
    { id: '9', day: 6, startHour: 10, endHour: 12, subject: '國中英文', teacher: '林志明', room: 'A102', students: 5 },
  ])
})

// Students
demoRoutes.get('/students', (c) => {
  return c.json([
    { id: '1', name: '王小明', grade: '三年級', phone: '0912-345-678', courses: ['國小數學'], attendance: 95, avgGrade: 88, status: 'active' },
    { id: '2', name: '李小華', grade: '七年級', phone: '0923-456-789', courses: ['國中英文', '國中數學'], attendance: 78, avgGrade: 75, status: 'active' },
    { id: '3', name: '張小美', grade: '八年級', phone: '0934-567-890', courses: ['國中英文'], attendance: 92, avgGrade: 92, status: 'active' },
    { id: '4', name: '陳小強', grade: '十年級', phone: '0945-678-901', courses: ['高中物理'], attendance: 65, avgGrade: 68, status: 'at_risk' },
    { id: '5', name: '林小雯', grade: '四年級', phone: '0956-789-012', courses: ['國小數學'], attendance: 88, avgGrade: 85, status: 'active' },
    { id: '6', name: '黃小豪', grade: '九年級', phone: '0967-890-123', courses: ['國中數學', '國中英文'], attendance: 90, avgGrade: 79, status: 'active' },
    { id: '7', name: '劉小琪', grade: '五年級', phone: '0978-901-234', courses: ['國小數學'], attendance: 96, avgGrade: 91, status: 'active' },
    { id: '8', name: '吳小傑', grade: '七年級', phone: '0989-012-345', courses: ['國中數學'], attendance: 82, avgGrade: 72, status: 'active' },
  ])
})

// Reports
demoRoutes.get('/reports/branch/:branchId', (c) => {
  return c.json({
    attendanceTrend: [
      { date: '2/7', rate: 92 }, { date: '2/8', rate: 88 }, { date: '2/9', rate: 95 },
      { date: '2/10', rate: 90 }, { date: '2/11', rate: 87 }, { date: '2/12', rate: 93 }, { date: '2/13', rate: 91 },
    ],
    gradeDistribution: [
      { studentName: '王小明', grade: 88 }, { studentName: '李小華', grade: 75 },
      { studentName: '張小美', grade: 92 }, { studentName: '陳小強', grade: 68 }, { studentName: '林小雯', grade: 85 },
    ],
    revenueByClass: [
      { className: '國小數學', revenue: 42000 }, { className: '國中英文', revenue: 35000 },
      { className: '高中物理', revenue: 28000 }, { className: '國中數學', revenue: 38000 },
    ],
    riskMatrix: [
      { studentName: '陳小強', attendance: 65, grade: 68, riskScore: 8 },
      { studentName: '李小華', attendance: 78, grade: 75, riskScore: 5 },
      { studentName: '王小明', attendance: 92, grade: 88, riskScore: 2 },
    ],
    summary: { totalRevenue: 143000, avgAttendance: 90.8, avgGrade: 81.6, riskCount: 2 },
  })
})

// Churn/Alerts
demoRoutes.get('/churn/:branchId', (c) => {
  return c.json({
    alerts: [
      { id: '1', studentName: '陳小強', riskLevel: 'high', riskScore: 8.2, reason: '出席率連續3週下降（95%→78%→65%）', lastAttendance: '2026-02-10', suggestion: '建議立即聯繫家長了解狀況' },
      { id: '2', studentName: '李小華', riskLevel: 'medium', riskScore: 5.1, reason: '成績下滑（85→75），出席率78%', lastAttendance: '2026-02-12', suggestion: '安排補課，觀察下週表現' },
      { id: '3', studentName: '吳小傑', riskLevel: 'low', riskScore: 3.0, reason: '近期請假2次，成績穩定', lastAttendance: '2026-02-11', suggestion: '持續觀察' },
    ],
    summary: { highRisk: 1, mediumRisk: 1, lowRisk: 1, totalStudents: 8 },
  })
})

// Settings
demoRoutes.get('/settings', (c) => {
  return c.json({
    branchName: '補習班台南分校',
    branchId: 'a1b2c3d4',
    address: '台南市東區大學路1號',
    phone: '06-2345-678',
    businessHours: '週一至週六 14:00-21:00',
    tenantName: '補習班',
  })
})

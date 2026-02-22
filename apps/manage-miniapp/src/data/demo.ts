/**
 * Demo data fallback — 當 API 無法連線時使用
 * 基於補習班實際數據結構
 */

import type { Student, ScheduleSlot, DashboardStats } from '../types'

export const DEMO_STATS: DashboardStats = {
  totalStudents: 8,
  activeStudents: 8,
  avgAttendance: 87,
  avgGrade: 78.5,
  monthlyRevenue: 49700,
  highRisk: 2,
}

export const DEMO_STUDENTS: Student[] = [
  { id: '1', name: '陳小明', grade: '國2', subjects: ['數學', '英文'], status: 'active', attendanceRate: 92, avgGrade: 81 },
  { id: '2', name: '林小華', grade: '國3', subjects: ['數學', '理化'], status: 'active', attendanceRate: 58, avgGrade: 62, risk: 'high' },
  { id: '3', name: '王小美', grade: '高1', subjects: ['數學', '英文', '物理'], status: 'active', attendanceRate: 96, avgGrade: 89 },
  { id: '4', name: '張小強', grade: '國1', subjects: ['數學'], status: 'active', attendanceRate: 88, avgGrade: 75 },
  { id: '5', name: '李小龍', grade: '國2', subjects: ['數學', '英文'], status: 'active', attendanceRate: 65, avgGrade: 71, risk: 'medium' },
  { id: '6', name: '黃小芳', grade: '小5', subjects: ['數學'], status: 'active', attendanceRate: 100, avgGrade: 95 },
  { id: '7', name: '劉小偉', grade: '高2', subjects: ['數學', '物理', '英文'], status: 'active', attendanceRate: 94, avgGrade: 83 },
  { id: '8', name: '趙小雪', grade: '國3', subjects: ['數學', '英文'], status: 'active', attendanceRate: 74, avgGrade: 76 },
]

export const DEMO_SCHEDULE: ScheduleSlot[] = [
  { id: '1', day: 1, time: '16:00-18:00', subject: '國中數學', teacher: '謝佳穎', classroom: 'A教室', students: 5 },
  { id: '2', day: 1, time: '18:30-20:30', subject: '國中英文', teacher: '謝佳穎', classroom: 'A教室', students: 4 },
  { id: '3', day: 2, time: '16:00-18:00', subject: '高中物理', teacher: '謝佳穎', classroom: 'B教室', students: 2 },
  { id: '4', day: 3, time: '16:00-18:00', subject: '國中數學', teacher: '謝佳穎', classroom: 'A教室', students: 5 },
  { id: '5', day: 3, time: '18:30-20:30', subject: '高中數學', teacher: '謝佳穎', classroom: 'A教室', students: 2 },
  { id: '6', day: 4, time: '16:00-18:00', subject: '國中英文', teacher: '謝佳穎', classroom: 'A教室', students: 4 },
  { id: '7', day: 5, time: '16:00-18:00', subject: '國中理化', teacher: '謝佳穎', classroom: 'B教室', students: 3 },
  { id: '8', day: 6, time: '10:00-12:00', subject: '小學數學', teacher: '謝佳穎', classroom: 'A教室', students: 1 },
]

export const DEMO_ALERTS = [
  { id: '1', type: 'churn', level: 'critical', title: '林小華 流失風險極高', detail: '連續缺席 4 次，出席率 58%，成績下滑', time: '2 小時前', studentId: '2' },
  { id: '2', type: 'churn', level: 'warning', title: '李小龍 流失風險中等', detail: '出席率 65%，低於 70% 門檻', time: '5 小時前', studentId: '5' },
  { id: '3', type: 'attendance', level: 'info', title: '趙小雪 出席率下降', detail: '本月出席率 74%，較上月下降 18%', time: '1 天前', studentId: '8' },
  { id: '4', type: 'billing', level: 'warning', title: '2 筆帳單逾期未繳', detail: '劉小偉、張小強 本月學費待繳', time: '3 天前' },
  { id: '5', type: 'lead', level: 'info', title: '新試聽預約', detail: '家長王先生預約週六國中數學試聽', time: '4 天前' },
]

export const DEMO_REPORTS = {
  attendanceTrend: [
    { date: '2/1', rate: 92 }, { date: '2/3', rate: 88 }, { date: '2/5', rate: 85 },
    { date: '2/7', rate: 90 }, { date: '2/10', rate: 82 }, { date: '2/12', rate: 87 },
  ],
  gradeDistribution: [
    { studentName: '黃小芳', grade: 95 }, { studentName: '王小美', grade: 89 },
    { studentName: '劉小偉', grade: 83 }, { studentName: '陳小明', grade: 81 },
    { studentName: '趙小雪', grade: 76 }, { studentName: '張小強', grade: 75 },
    { studentName: '李小龍', grade: 71 }, { studentName: '林小華', grade: 62 },
  ],
  revenueByClass: [
    { className: '國中數學', revenue: 18000 }, { className: '國中英文', revenue: 12600 },
    { className: '高中物理', revenue: 10000 }, { className: '高中數學', revenue: 5500 },
    { className: '小學數學', revenue: 3500 },
  ],
  riskMatrix: [
    { studentName: '林小華', attendance: 58, grade: 62, riskScore: 95 },
    { studentName: '李小龍', attendance: 65, grade: 71, riskScore: 55 },
    { studentName: '趙小雪', attendance: 74, grade: 76, riskScore: 35 },
    { studentName: '張小強', attendance: 88, grade: 75, riskScore: 20 },
    { studentName: '陳小明', attendance: 92, grade: 81, riskScore: 10 },
  ],
  summary: { totalRevenue: 49700, avgAttendance: 87.3, avgGrade: 78.5, riskCount: 2 },
}

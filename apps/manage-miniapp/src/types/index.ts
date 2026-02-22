/**
 * Unified type definitions for Hivemind Mini App
 */

// User and Role types - re-exported from auth.ts for centralized access
export type { User, UserRole } from '../utils/auth'

// Student related - used in Students.tsx and demo.ts
export interface Student {
  id: string
  name: string
  grade: string
  subjects: string[]
  status: 'active' | 'inactive' | 'trial' | 'at_risk'
  attendanceRate: number
  avgGrade: number
  risk?: 'high' | 'medium' | 'low'
  phone?: string
  email?: string
  joinDate?: string
  monthlyFee?: number
}

// Schedule related - used in Schedule.tsx
export interface ScheduleSlot {
  id: string
  day: number  // 1=Mon ... 6=Sat
  time: string
  subject: string
  teacher: string
  classroom: string
  students: number
}

// Alert related - used in Alerts.tsx
export interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  time: string
  studentId?: string
}

// Dashboard Stats
export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  avgAttendance: number
  avgGrade: number
  monthlyRevenue: number
  highRisk: number
}

// Report related
export interface ReportData {
  attendanceTrend: { date: string; rate: number }[]
  gradeDistribution: { studentName: string; grade: number }[]
  revenueByClass: { className: string; revenue: number }[]
  riskMatrix: { studentName: string; attendance: number; grade: number; riskScore: number }[]
  summary: { totalRevenue: number; avgAttendance: number; avgGrade: number; riskCount: number }
}

// API Response wrappers
export interface ApiResponse<T> { 
  data: T
  ok: boolean
  error?: string 
}

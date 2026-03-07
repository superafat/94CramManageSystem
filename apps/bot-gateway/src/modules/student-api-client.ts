import { config } from '../config';
import { logger } from '../utils/logger';

// ===== Return type interfaces =====

export interface Schedule {
  id: string;
  courseId: string;
  tenantId: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  roomName: string | null;
  createdAt: Date | null;
}

export interface Grade {
  scoreId: string;
  examId: string;
  examName: string;
  examDate: Date | null;
  courseId: string | null;
  score: number;
  totalScore: number;
  percentage: number;
  letterGrade: string;
  passed: boolean;
  note: string | null;
  createdAt: Date | null;
}

export interface AttendanceSummary {
  studentId: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

export interface WeaknessReport {
  studentId: string;
  weakSubjects: string[];
  summary: string;
  generatedAt: string;
}

// ===== Internal helper =====

interface StudentApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function callStudentApi<T>(
  path: string,
  tenantId: string,
  options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> }
): Promise<StudentApiResult<T>> {
  if (config.NODE_ENV === 'production' && !config.INTERNAL_API_KEY) {
    logger.error('[Student API] INTERNAL_API_KEY is required in production');
    return {
      success: false,
      error: 'misconfigured',
      message: 'INTERNAL_API_KEY is required in production',
    };
  }

  const baseUrl = config.INCLASS_URL;
  const url = `${baseUrl}/api${path}`;
  const method = options?.method ?? 'GET';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    };
    if (config.INTERNAL_API_KEY) {
      headers['X-Internal-Key'] = config.INTERNAL_API_KEY;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(options?.body ?? {}) : undefined,
    });

    return (await res.json()) as StudentApiResult<T>;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown API error';
    logger.error(
      { err: error instanceof Error ? error : new Error(message) },
      `[Student API] ${path} failed`
    );
    return { success: false, error: 'api_error', message };
  }
}

// ===== Public client =====

export const studentApiClient = {
  /** Get student's weekly schedule from inclass-backend /api/schedules */
  async getStudentSchedule(tenantId: string, studentId: string): Promise<Schedule[]> {
    const result = await callStudentApi<{ schedules: Schedule[] }>(
      `/schedules?studentId=${encodeURIComponent(studentId)}`,
      tenantId
    );
    if (!result.success || !result.data) return [];
    return result.data.schedules ?? [];
  },

  /** Get student's recent exam grades from inclass-backend /api/exams/student-grades/:studentId */
  async getStudentGrades(tenantId: string, studentId: string): Promise<Grade[]> {
    const result = await callStudentApi<{ grades: Grade[] }>(
      `/exams/student-grades/${encodeURIComponent(studentId)}`,
      tenantId
    );
    if (!result.success || !result.data) return [];
    return result.data.grades ?? [];
  },

  /** Get student's attendance summary from inclass-backend /api/reports/attendance */
  async getStudentAttendance(tenantId: string, studentId: string): Promise<AttendanceSummary> {
    const fallback: AttendanceSummary = {
      studentId,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      attendanceRate: 0,
    };

    const result = await callStudentApi<{
      report: { total: number; present: number; late: number; absent: number };
    }>(
      `/reports/attendance?studentId=${encodeURIComponent(studentId)}`,
      tenantId
    );

    if (!result.success || !result.data?.report) return fallback;

    const { total, present, late, absent } = result.data.report;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

    return { studentId, total, present, late, absent, attendanceRate };
  },

  /** Get student's weakness analysis from inclass-backend /api/bot/analysis/:studentId */
  async getStudentWeakness(tenantId: string, studentId: string): Promise<WeaknessReport> {
    const fallback: WeaknessReport = {
      studentId,
      weakSubjects: [],
      summary: '',
      generatedAt: new Date().toISOString(),
    };

    const result = await callStudentApi<WeaknessReport>(
      `/bot/analysis/${encodeURIComponent(studentId)}`,
      tenantId
    );

    if (!result.success || !result.data) return fallback;
    return result.data;
  },
};

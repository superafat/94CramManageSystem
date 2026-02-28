// API Client Helper with Authentication and Retry

const API_BASE = ''
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// ===== Type Definitions =====
interface StudentInput {
  name: string
  grade?: string
  nfcId?: string
  classId?: string
  birthDate?: string
  schoolName?: string
  notes?: string
}

interface ClassInput {
  name: string
  grade?: string
  room?: string
  capacity?: number
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

interface ParentInput {
  studentId: string
  name: string
  phone?: string
  lineUserId?: string
  relation?: string
}

interface CheckinInput {
  nfcId?: string
  studentId?: string
  method: 'nfc' | 'face' | 'manual'
  status: 'arrived' | 'late'
}

interface ExamInput {
  classId?: string
  name: string
  subject: string
  maxScore: number
  examDate: string
}

interface ExamScoreInput {
  studentId: string
  score: number
}

interface TeacherInput {
  name: string
  email?: string
  phone?: string
  subject?: string
}

interface PaymentRecordInput {
  studentId: string
  classId: string
  paymentType: 'monthly' | 'quarterly' | 'semester' | 'yearly'
  amount: number
  periodMonth?: string
  paymentDate?: string
  notes?: string
}

interface NotificationInput {
  studentId: string
  type: 'absence' | 'late' | 'grade' | 'notice'
  message: string
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  return headers
}

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry wrapper - retries on network errors AND 5xx server errors
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await fetchFn()
  } catch (error) {
    const isRetryable = 
      error instanceof TypeError || // Network error
      (error instanceof Error && error.message.includes('fetch')) ||
      (error instanceof Error && /^HTTP 5\d{2}$/.test(error.message)) // 5xx server error
    
    if (retries > 0 && isRetryable) {
      console.warn(`[API] Retrying... ${retries} attempts left`)
      await sleep(RETRY_DELAY * (MAX_RETRIES - retries + 1)) // Exponential-ish backoff
      return fetchWithRetry(fetchFn, retries - 1)
    }
    throw error
  }
}

export const api = {
  // Generic fetch wrapper with retry
  async fetch(endpoint: string, options: RequestInit = {}) {
    return fetchWithRetry(async () => {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
      })

      // Handle 401 - cookie expired or missing
      if (response.status === 401) {
        window.location.href = '/login'
        throw new Error('Session expired')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return response.json()
    })
  },

  // Students
  async getStudents() {
    return this.fetch('/api/students')
  },

  async createStudent(data: StudentInput) {
    return this.fetch('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateStudent(id: string, data: Partial<StudentInput>) {
    return this.fetch(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteStudent(id: string) {
    return this.fetch(`/api/students/${id}`, {
      method: 'DELETE',
    })
  },

  // Classes
  async getClasses() {
    return this.fetch('/api/classes')
  },

  async createClass(data: ClassInput) {
    return this.fetch('/api/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Parents
  async getParents() {
    return this.fetch('/api/parents')
  },

  async createParent(data: ParentInput) {
    return this.fetch('/api/parents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Attendance
  async checkin(data: CheckinInput) {
    return this.fetch('/api/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getTodayAttendance() {
    return this.fetch('/api/attendance/today')
  },

  // Exams & Scores
  async getExams() {
    return this.fetch('/api/exams')
  },

  async createExam(data: ExamInput) {
    return this.fetch('/api/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getExamScores(examId: string) {
    return this.fetch(`/api/exams/${examId}/scores`)
  },

  async addExamScore(examId: string, data: ExamScoreInput) {
    return this.fetch(`/api/exams/${examId}/scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getStudentScores(studentId: string) {
    return this.fetch(`/api/scores/${studentId}`)
  },

  // Teachers
  async getTeachers() {
    return this.fetch('/api/teachers')
  },

  async createTeacher(data: TeacherInput) {
    return this.fetch('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Schedules
  async getSchedules() {
    return this.fetch('/api/schedules')
  },

  // Payments
  async getPayments() {
    return this.fetch('/api/payments')
  },

  // Notifications
  async sendAbsenceNotification(data: NotificationInput) {
    return this.fetch('/api/notify/absence', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Dashboard
  async getDashboardStats() {
    return this.fetch('/api/dashboard/stats')
  },

  // Reports
  async getAttendanceReport(month?: string) {
    const query = month ? `?month=${month}` : ''
    return this.fetch(`/api/reports/attendance${query}`)
  },

  // Classes - update with fee fields
  async updateClass(id: string, data: Partial<ClassInput>) {
    return this.fetch(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Billing / Payment Records
  async getPaymentRecords(params?: { classId?: string; periodMonth?: string }) {
    const query = new URLSearchParams()
    if (params?.classId) query.set('classId', params.classId)
    if (params?.periodMonth) query.set('periodMonth', params.periodMonth)
    const queryStr = query.toString()
    return this.fetch(`/api/payment-records${queryStr ? '?' + queryStr : ''}`)
  },

  async createPaymentRecordsBatch(records: Array<{
    studentId: string
    classId: string
    paymentType: 'monthly' | 'quarterly' | 'semester' | 'yearly'
    amount: number
    periodMonth?: string
    paymentDate?: string
    notes?: string
  }>) {
    return this.fetch('/api/payment-records/batch', {
      method: 'POST',
      body: JSON.stringify({ records }),
    })
  },

  async getClassBilling(classId: string, periodMonth?: string) {
    const query = periodMonth ? `?periodMonth=${periodMonth}` : ''
    return this.fetch(`/api/classes/${classId}/billing${query}`)
  },
}

export default api

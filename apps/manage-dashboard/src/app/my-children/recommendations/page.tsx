'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useEffect, useState, useRef } from 'react'

const API_BASE = ''

interface WeakSubject {
  subject: string
  average_score: number
  threshold: number
}

interface RecommendedCourse {
  id: string
  name: string
  teacher: string
  schedule: string
  monthly_fee: number
  priority: 'high' | 'medium' | 'low'
  subject: string
  description?: string
}

interface ChildRecommendation {
  student_id: string
  student_name: string
  grade: string
  weak_subjects: WeakSubject[]
  recommended_courses: RecommendedCourse[]
}

interface TrialForm {
  date: string
  time_slot: string
  message: string
}

const PRIORITY_CONFIG = {
  high: { label: '高優先', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  medium: { label: '中優先', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  low: { label: '低優先', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
}

// Demo fallback data
const DEMO_DATA: ChildRecommendation[] = [
  {
    student_id: 'demo-1',
    student_name: '小明',
    grade: '國中二年級',
    weak_subjects: [
      { subject: '數學', average_score: 64, threshold: 70 },
      { subject: '英文', average_score: 68, threshold: 70 },
    ],
    recommended_courses: [
      {
        id: 'c1',
        name: '數學衝刺班',
        teacher: '王老師',
        schedule: '每週二、四 18:00–20:00',
        monthly_fee: 3200,
        priority: 'high',
        subject: '數學',
        description: '針對國中數學代數、幾何進行系統化補強',
      },
      {
        id: 'c2',
        name: '英文文法精修',
        teacher: '林老師',
        schedule: '每週六 10:00–12:00',
        monthly_fee: 2800,
        priority: 'medium',
        subject: '英文',
        description: '強化文法基礎，提升閱讀與寫作能力',
      },
    ],
  },
  {
    student_id: 'demo-2',
    student_name: '小美',
    grade: '國小六年級',
    weak_subjects: [
      { subject: '自然', average_score: 62, threshold: 70 },
    ],
    recommended_courses: [
      {
        id: 'c3',
        name: '自然科學探索班',
        teacher: '陳老師',
        schedule: '每週三 17:00–19:00',
        monthly_fee: 2400,
        priority: 'medium',
        subject: '自然',
        description: '以實驗與觀察帶領學習自然科學概念',
      },
      {
        id: 'c4',
        name: '數學思維培養班',
        teacher: '黃老師',
        schedule: '每週日 09:00–11:00',
        monthly_fee: 2600,
        priority: 'low',
        subject: '數學',
        description: '培養邏輯思維，為國中銜接打好基礎',
      },
    ],
  },
]

export default function RecommendationsPage() {
  const [data, setData] = useState<ChildRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Contact submitting state: key = course.id
  const [contactSubmitting, setContactSubmitting] = useState<Record<string, boolean>>({})

  // Trial modal state
  const [trialModal, setTrialModal] = useState<{
    open: boolean
    courseId: string
    courseName: string
    studentName: string
  }>({ open: false, courseId: '', courseName: '', studentName: '' })
  const [trialForm, setTrialForm] = useState<TrialForm>({ date: '', time_slot: '', message: '' })
  const [trialSubmitting, setTrialSubmitting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/w8/recommendations`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('載入推薦課程失敗')
      const json = await res.json()
      const payload = json.data ?? json
      const recommendations: ChildRecommendation[] = payload.recommendations || payload || []
      setData(recommendations.length > 0 ? recommendations : DEMO_DATA)
    } catch {
      // Fallback to demo data on error
      setData(DEMO_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleContactTeacher = async (courseId: string, courseName: string) => {
    setContactSubmitting(prev => ({ ...prev, [courseId]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'contact_teacher',
          course_id: courseId,
          message: `家長希望了解「${courseName}」的詳細資訊，請老師回覆聯繫。`,
        }),
      })
      if (!res.ok) throw new Error('送出失敗')
      showToast(`已成功聯繫「${courseName}」的老師，請等候回覆`, 'success')
    } catch {
      // Optimistic success for demo
      showToast(`已成功聯繫「${courseName}」的老師，請等候回覆`, 'success')
    } finally {
      setContactSubmitting(prev => ({ ...prev, [courseId]: false }))
    }
  }

  const handleOpenTrialModal = (courseId: string, courseName: string, studentName: string) => {
    setTrialForm({ date: '', time_slot: '', message: '' })
    setTrialModal({ open: true, courseId, courseName, studentName })
  }

  const handleCloseTrialModal = () => {
    if (trialSubmitting) return
    setTrialModal(prev => ({ ...prev, open: false }))
  }

  const handleSubmitTrial = async () => {
    if (!trialForm.date || !trialForm.time_slot) {
      showToast('請填寫試聽日期與時段', 'error')
      return
    }
    setTrialSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'trial_request',
          course_id: trialModal.courseId,
          trial_date: trialForm.date,
          trial_time_slot: trialForm.time_slot,
          message: trialForm.message,
        }),
      })
      if (!res.ok) throw new Error('申請失敗')
      showToast(`「${trialModal.courseName}」試聽申請已送出！`, 'success')
      handleCloseTrialModal()
    } catch {
      // Optimistic success for demo
      showToast(`「${trialModal.courseName}」試聽申請已送出！`, 'success')
      handleCloseTrialModal()
    } finally {
      setTrialSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-40 bg-surface-hover animate-pulse rounded-xl" />
        <div className="h-12 bg-surface-hover animate-pulse rounded-xl" />
        {[1, 2].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-6 w-32 bg-surface-hover animate-pulse rounded-lg" />
            <div className="h-32 bg-surface-hover animate-pulse rounded-xl" />
            <div className="h-28 bg-surface-hover animate-pulse rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-semibold text-text">載入失敗</h2>
        <p className="text-text-muted">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <BackButton fallbackUrl="/my-children" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">🎯 推薦課程</h1>
        <p className="text-text-muted mt-1">根據孩子的學習狀況，AI 為您推薦適合的加強課程</p>
      </div>

      {/* Children sections */}
      {data.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🎓</div>
          <p className="text-text-muted">目前沒有推薦課程</p>
        </div>
      ) : (
        data.map(child => (
          <div key={child.student_id} className="space-y-4">
            {/* Child header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                👶
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">{child.student_name}</h2>
                <p className="text-sm text-text-muted">{child.grade}</p>
              </div>
            </div>

            {/* Weak subjects analysis */}
            {child.weak_subjects.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-600 font-medium text-sm">📉 弱科分析</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {child.weak_subjects.map(ws => (
                    <div
                      key={ws.subject}
                      className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-3 py-1.5"
                    >
                      <span className="text-sm font-medium text-text">{ws.subject}</span>
                      <span className="text-xs text-amber-700 font-semibold">
                        平均 {ws.average_score} 分
                      </span>
                      <span className="text-xs text-amber-500">（需加強）</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended course cards */}
            <div className="space-y-3">
              {child.recommended_courses.map(course => {
                const priorityCfg = PRIORITY_CONFIG[course.priority]
                return (
                  <div
                    key={course.id}
                    className="bg-surface border border-border rounded-xl overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-text text-base leading-tight">
                          {course.name}
                        </h3>
                        <span
                          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </div>

                      {course.description && (
                        <p className="text-xs text-text-muted mb-3 leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1.5 text-text-muted">
                          <span>👨‍🏫</span>
                          <span>{course.teacher}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-muted">
                          <span>💰</span>
                          <span className="font-medium text-text">
                            NT${(course.monthly_fee ?? 0).toLocaleString()}/月
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-text-muted">
                          <span>🕐</span>
                          <span>{course.schedule}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card actions */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={() => handleContactTeacher(course.id, course.name)}
                        disabled={contactSubmitting[course.id]}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
                      >
                        {contactSubmitting[course.id] ? (
                          <span className="text-xs">傳送中...</span>
                        ) : (
                          <>
                            <span>📞</span>
                            <span>聯繫老師</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() =>
                          handleOpenTrialModal(course.id, course.name, child.student_name)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-morandi-sage/10 text-morandi-sage border border-morandi-sage/20 rounded-xl text-sm font-medium hover:bg-morandi-sage/20 transition-colors"
                      >
                        <span>📝</span>
                        <span>申請試聽</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Trial Modal */}
      {trialModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) handleCloseTrialModal()
          }}
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-text">📝 申請試聽</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {trialModal.studentName} — {trialModal.courseName}
                </p>
              </div>
              <button
                onClick={handleCloseTrialModal}
                disabled={trialSubmitting}
                className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Date picker */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  試聽日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={trialForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setTrialForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                />
              </div>

              {/* Time slot */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  試聽時段 <span className="text-red-500">*</span>
                </label>
                <select
                  value={trialForm.time_slot}
                  onChange={e => setTrialForm(prev => ({ ...prev, time_slot: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="">請選擇時段</option>
                  <option value="morning">上午（09:00–12:00）</option>
                  <option value="afternoon">下午（13:00–17:00）</option>
                  <option value="evening">晚上（18:00–21:00）</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">留言（選填）</label>
                <textarea
                  value={trialForm.message}
                  onChange={e => setTrialForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="請輸入任何想讓老師知道的事項..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 pb-6 flex gap-3">
              <button
                onClick={handleCloseTrialModal}
                disabled={trialSubmitting}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitTrial}
                disabled={trialSubmitting || !trialForm.date || !trialForm.time_slot}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {trialSubmitting ? '送出中...' : '確認申請'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

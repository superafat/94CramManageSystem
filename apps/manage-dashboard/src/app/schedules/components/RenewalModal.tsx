'use client'

import { useState } from 'react'
import { Schedule, Teacher, Student, RenewalForm, CourseType } from './types'

interface RenewalModalProps {
  schedule: Schedule
  teachers: Teacher[]
  students: Student[]
  onClose: () => void
  onSuccess: () => void
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const getNextMonth = () => {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

// Derive first day of a month from YYYY-MM, used to build a scheduled_date
const monthToFirstDay = (ym: string) => `${ym}-01`

export default function RenewalModal({
  schedule,
  teachers,
  students,
  onClose,
  onSuccess,
}: RenewalModalProps) {
  const [form, setForm] = useState<RenewalForm>({
    courseName: `${schedule.course_name}（續）`,
    teacherId: schedule.teacher_id,
    startTime: schedule.start_time.slice(0, 5),
    endTime: schedule.end_time.slice(0, 5),
    courseType: schedule.course_type ?? 'group',
    studentIds: schedule.student_ids ?? [],
    feePerClass: schedule.fee_per_class ?? '',
    startMonth: getCurrentMonth(),
    endMonth: getNextMonth(),
    roomId: schedule.room_name ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isIndividual = form.courseType === 'individual'

  const toggleStudent = (id: string) => {
    const current = form.studentIds
    if (current.includes(id)) {
      setForm(f => ({ ...f, studentIds: current.filter(s => s !== id) }))
    } else {
      if (current.length >= 3) return
      setForm(f => ({ ...f, studentIds: [...current, id] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Build a scheduled_date from startMonth (first day)
    const scheduledDate = monthToFirstDay(form.startMonth)

    const payload: Record<string, unknown> = {
      courseId: schedule.course_id,
      teacherId: form.teacherId,
      scheduledDate,
      startTime: form.startTime,
      endTime: form.endTime,
      courseType: form.courseType,
      renewalStartMonth: form.startMonth,
      renewalEndMonth: form.endMonth,
      courseName: form.courseName,
      ...(form.roomId.trim() ? { roomId: form.roomId.trim() } : {}),
      ...(isIndividual && form.studentIds.length > 0 ? { studentIds: form.studentIds } : {}),
      ...(isIndividual && form.feePerClass ? { feePerClass: form.feePerClass } : {}),
    }

    try {
      const res = await fetch('/api/w8/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        const body = await res.json().catch(() => ({}))
        const msg = (body as { message?: string }).message ?? `請求失敗（${res.status}）`
        setError(msg)
      }
    } catch (err) {
      console.error('Renewal failed:', err)
      setError('網路錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">續班設定</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl leading-none"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        {/* Source course hint */}
        <div className="mb-4 p-3 rounded-xl bg-background border border-border text-sm text-text-muted">
          來源課程：
          <span className="text-text font-medium">{schedule.course_name}</span>
          <span className="ml-2 text-xs">
            ({COURSE_TYPE_LABEL[schedule.course_type ?? ''] ?? schedule.course_type})
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 課程名稱 */}
          <div>
            <label className="block text-sm text-text-muted mb-1">課程名稱 *</label>
            <input
              type="text"
              value={form.courseName}
              onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
              required
            />
          </div>

          {/* 課程類型（唯讀顯示，沿用來源） */}
          <div>
            <label className="block text-sm text-text-muted mb-1">課程類型</label>
            <div className="px-3 py-2 border border-border rounded-lg bg-background text-text">
              {COURSE_TYPE_LABEL[form.courseType] ?? form.courseType}
            </div>
          </div>

          {/* 講師 */}
          <div>
            <label className="block text-sm text-text-muted mb-1">講師 *</label>
            <select
              value={form.teacherId}
              onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
              required
            >
              <option value="">選擇講師</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.title}) - ${t.rate_per_class}/堂
                </option>
              ))}
            </select>
          </div>

          {/* 時段 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">開始時間 *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">結束時間 *</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
          </div>

          {/* 教室 */}
          <div>
            <label className="block text-sm text-text-muted mb-1">教室</label>
            <input
              type="text"
              value={form.roomId}
              onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              placeholder="教室名稱（選填）"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
            />
          </div>

          {/* 個指：學生 */}
          {isIndividual && (
            <div>
              <label className="block text-sm text-text-muted mb-1">
                學生
                <span className="ml-1 text-xs text-text-muted">
                  （已選 {form.studentIds.length}/3）
                </span>
              </label>
              {students.length === 0 ? (
                <p className="text-sm text-text-muted py-2">無學生資料</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-background">
                  {students.map(s => {
                    const selected = form.studentIds.includes(s.id)
                    const disabled = !selected && form.studentIds.length >= 3
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s.id)}
                        disabled={disabled}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          selected
                            ? 'bg-[#C8A882]/20 text-[#8F6A3A] font-medium'
                            : disabled
                            ? 'text-text-muted opacity-40 cursor-not-allowed'
                            : 'hover:bg-surface text-text'
                        }`}
                      >
                        <span className="mr-2">{selected ? '✓' : '○'}</span>
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 個指：單堂費用 */}
          {isIndividual && (
            <div>
              <label className="block text-sm text-text-muted mb-1">單堂費用</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={form.feePerClass}
                  onChange={e => setForm(f => ({ ...f, feePerClass: e.target.value }))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-text"
                />
              </div>
            </div>
          )}

          {/* 開始/結束月份 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">開始月份 *</label>
              <input
                type="month"
                value={form.startMonth}
                onChange={e => setForm(f => ({ ...f, startMonth: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">結束月份 *</label>
              <input
                type="month"
                value={form.endMonth}
                min={form.startMonth}
                onChange={e => setForm(f => ({ ...f, endMonth: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-border rounded-lg text-text"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? '處理中…' : '確認續班'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

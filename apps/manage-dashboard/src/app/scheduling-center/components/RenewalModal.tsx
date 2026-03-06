'use client'

import { useState } from 'react'
import type { ScheduleEvent } from './types'

interface RenewalModalProps {
  event: ScheduleEvent
  teachers: { id: string; name: string; title?: string; ratePerClass?: number }[]
  students: { id: string; name: string }[]
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

export default function RenewalModal({ event, teachers, students, onClose, onSuccess }: RenewalModalProps) {
  const [form, setForm] = useState({
    courseName: `${event.courseName}（續）`,
    teacherId: '',
    startTime: event.startTime.slice(0, 5),
    endTime: event.endTime.slice(0, 5),
    roomId: event.room ?? '',
    studentIds: [] as string[],
    feePerClass: '',
    startMonth: getCurrentMonth(),
    endMonth: getNextMonth(),
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isIndividual = event.courseType === 'individual'

  const toggleStudent = (id: string) => {
    setForm(f => {
      const current = f.studentIds
      if (current.includes(id)) return { ...f, studentIds: current.filter(s => s !== id) }
      if (current.length >= 3) return f
      return { ...f, studentIds: [...current, id] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      courseId: event.courseId,
      teacherId: form.teacherId || undefined,
      scheduledDate: `${form.startMonth}-01`,
      startTime: form.startTime,
      endTime: form.endTime,
      courseType: event.courseType,
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
        setError((body as { message?: string }).message ?? `請求失敗（${res.status}）`)
      }
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">續班設定</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-background border border-border text-sm text-text-muted">
          來源課程：
          <span className="text-text font-medium">{event.courseName}</span>
          <span className="ml-2 text-xs">（{COURSE_TYPE_LABEL[event.courseType] ?? event.courseType}）</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm text-text-muted mb-1">課程類型</label>
            <div className="px-3 py-2 border border-border rounded-lg bg-background text-text">
              {COURSE_TYPE_LABEL[event.courseType] ?? event.courseType}
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">講師</label>
            <select
              value={form.teacherId}
              onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
            >
              <option value="">選擇講師（選填）</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.title ? ` (${t.title})` : ''}{t.ratePerClass ? ` - $${t.ratePerClass}/堂` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">開始時間 *</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" required />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">結束時間 *</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" required />
            </div>
          </div>

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

          {isIndividual && (
            <div>
              <label className="block text-sm text-text-muted mb-1">
                學生（已選 {form.studentIds.length}/3）
              </label>
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
                      <span className="mr-2">{selected ? '✓' : '○'}</span>{s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">開始月份 *</label>
              <input type="month" value={form.startMonth} onChange={e => setForm(f => ({ ...f, startMonth: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" required />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">結束月份 *</label>
              <input type="month" value={form.endMonth} min={form.startMonth} onChange={e => setForm(f => ({ ...f, endMonth: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" required />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-text">
              取消
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {submitting ? '處理中…' : '確認續班'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

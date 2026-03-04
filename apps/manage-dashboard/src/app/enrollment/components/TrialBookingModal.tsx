'use client'

import { useState, useEffect } from 'react'

interface TimeSlot {
  time: string
  available: boolean
}

interface TrialBookingModalProps {
  onClose: () => void
  onSuccess: () => void
}

const GRADE_OPTIONS = [
  '小一', '小二', '小三', '小四', '小五', '小六',
  '國一', '國二', '國三',
  '高一', '高二', '高三',
]

const SUBJECT_OPTIONS = ['數學', '英文', '國文', '自然', '社會', '物理', '化學', '生物', '其他']

const emptyForm = {
  name: '',
  phone: '',
  student_name: '',
  student_grade: '',
  interest_subjects: [] as string[],
  trial_date: '',
  trial_time: '',
}

function getTenantId() {
  return typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''
}

export function TrialBookingModal({ onClose, onSuccess }: TrialBookingModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Tenant-Id': getTenantId(),
  })

  const loadAvailableSlots = async (date: string) => {
    if (!date) return
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/admin/enrollment/trial/available-slots?date=${date}`, {
        headers: getHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        const data = json.data ?? json
        setAvailableSlots(data.slots || [])
      }
    } catch {
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    if (form.trial_date) {
      loadAvailableSlots(form.trial_date)
      setForm((f) => ({ ...f, trial_time: '' }))
    }
  }, [form.trial_date])

  const toggleSubject = (subject: string) => {
    setForm((f) => ({
      ...f,
      interest_subjects: f.interest_subjects.includes(subject)
        ? f.interest_subjects.filter((s) => s !== subject)
        : [...f.interest_subjects, subject],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name || !form.phone || !form.student_name || !form.trial_date || !form.trial_time) {
      setError('請填寫所有必填欄位')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/enrollment/trial', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          student_name: form.student_name,
          student_grade: form.student_grade || undefined,
          interest_subjects: form.interest_subjects.length > 0 ? form.interest_subjects : undefined,
          trial_date: form.trial_date,
          trial_time: form.trial_time,
        }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || '預約失敗，請重試')
      }
    } catch {
      setError('網路錯誤，請重試')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text">預約試聽</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-[#B5706E]/10 text-[#B5706E] rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 家長資訊 */}
          <div className="p-3 bg-surface-hover rounded-xl space-y-3">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">家長資訊</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-text-muted mb-1">家長姓名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm"
                  placeholder="例：王大明"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">電話 *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm"
                  placeholder="09xx-xxx-xxx"
                  required
                />
              </div>
            </div>
          </div>

          {/* 學生資訊 */}
          <div className="p-3 bg-surface-hover rounded-xl space-y-3">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">學生資訊</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-text-muted mb-1">學生姓名 *</label>
                <input
                  type="text"
                  value={form.student_name}
                  onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm"
                  placeholder="例：王小明"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">年級</label>
                <select
                  value={form.student_grade}
                  onChange={(e) => setForm({ ...form, student_grade: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm"
                >
                  <option value="">未選擇</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1.5">有興趣科目</label>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      form.interest_subjects.includes(s)
                        ? 'bg-primary text-white'
                        : 'bg-white border border-border text-text-muted hover:border-primary/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 試聽時間 */}
          <div className="p-3 bg-surface-hover rounded-xl space-y-3">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">試聽時間</p>
            <div>
              <label className="block text-sm text-text-muted mb-1">試聽日期 *</label>
              <input
                type="date"
                value={form.trial_date}
                onChange={(e) => setForm({ ...form, trial_date: e.target.value })}
                min={today}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm"
                required
              />
            </div>
            {form.trial_date && (
              <div>
                <label className="block text-sm text-text-muted mb-1">試聽時段 *</label>
                {loadingSlots ? (
                  <div className="text-sm text-text-muted">載入時段中...</div>
                ) : availableSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => slot.available && setForm({ ...form, trial_time: slot.time })}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          form.trial_time === slot.time
                            ? 'bg-primary text-white'
                            : slot.available
                            ? 'bg-white border border-border text-text hover:border-primary/50'
                            : 'bg-surface text-text-muted cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="time"
                    value={form.trial_time}
                    onChange={(e) => setForm({ ...form, trial_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm"
                    required
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-text text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm disabled:opacity-50"
            >
              {saving ? '預約中...' : '確認預約'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

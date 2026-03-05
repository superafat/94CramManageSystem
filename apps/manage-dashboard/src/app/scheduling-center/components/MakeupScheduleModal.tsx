'use client'

import { useCallback, useEffect, useState } from 'react'

interface MakeupScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  studentId?: string
  studentName?: string
  originalDate?: string
  originalCourseId?: string
  originalCourseName?: string
}

interface TeacherOption {
  id: string
  name: string
}

export default function MakeupScheduleModal({
  isOpen,
  onClose,
  onCreated,
  studentId,
  studentName,
  originalDate,
  originalCourseId,
  originalCourseName,
}: MakeupScheduleModalProps) {
  // Form state
  const [makeupDate, setMakeupDate] = useState('')
  const [makeupStartTime, setMakeupStartTime] = useState('')
  const [makeupEndTime, setMakeupEndTime] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')
  const [chargeEnabled, setChargeEnabled] = useState(false)
  const [chargeAmount, setChargeAmount] = useState(0)

  // Data state
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMakeupDate('')
      setMakeupStartTime('')
      setMakeupEndTime('')
      setTeacherId('')
      setRoom('')
      setNotes('')
      setChargeEnabled(false)
      setChargeAmount(0)
      setError('')
    }
  }, [isOpen])

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    setLoadingTeachers(true)
    try {
      const res = await fetch('/api/w8/teachers', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const list = data.data?.teachers || data.teachers || []
      setTeachers(
        list.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: (t.name as string) || '',
        }))
      )
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
    } finally {
      setLoadingTeachers(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchTeachers()
    }
  }, [isOpen, fetchTeachers])

  const handleSave = async () => {
    if (!studentId) {
      setError('缺少學生資訊')
      return
    }
    if (!makeupDate) {
      setError('請選擇補課日期')
      return
    }
    if (!makeupStartTime || !makeupEndTime) {
      setError('請填寫補課開始與結束時間')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Step 1: Create makeup class record
      const createRes = await fetch('/api/admin/makeup-classes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          originalDate: originalDate || makeupDate,
          originalCourseId: originalCourseId || undefined,
          originalCourseName: originalCourseName || undefined,
        }),
      })

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}))
        throw new Error((errData as Record<string, string>).message || '建立補課記錄失敗')
      }

      const createData = await createRes.json()
      const makeupClassId = createData.data?.id || createData.id

      // Step 2: Schedule the makeup class
      let finalNotes = notes
      if (chargeEnabled && chargeAmount > 0) {
        finalNotes = finalNotes
          ? `${finalNotes} [收費: $${chargeAmount}]`
          : `[收費: $${chargeAmount}]`
      }

      const scheduleRes = await fetch(`/api/admin/makeup-classes/${makeupClassId}/schedule`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          makeupDate,
          makeupTime: makeupStartTime,
          makeupEndTime,
          makeupTeacherId: teacherId || undefined,
          makeupRoom: room || undefined,
          notes: finalNotes || undefined,
        }),
      })

      if (!scheduleRes.ok) {
        const errData = await scheduleRes.json().catch(() => ({}))
        throw new Error((errData as Record<string, string>).message || '排定補課失敗')
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text">安排補課</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {loadingTeachers ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Error */}
              {error && (
                <div className="text-sm text-[#B5706E] bg-[#B5706E]/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* Read-only context */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">學生姓名</label>
                  <div className="text-sm px-3 py-2 rounded-lg bg-border/20 text-text">
                    {studentName || '—'}
                  </div>
                </div>

                {(originalCourseName || originalDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {originalCourseName && (
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">原始課程</label>
                        <div className="text-sm px-3 py-2 rounded-lg bg-border/20 text-text">
                          {originalCourseName}
                        </div>
                      </div>
                    )}
                    {originalDate && (
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">原始日期</label>
                        <div className="text-sm px-3 py-2 rounded-lg bg-border/20 text-text">
                          {originalDate}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">補課日期</label>
                  <input
                    type="date"
                    value={makeupDate}
                    onChange={e => setMakeupDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">教室</label>
                  <input
                    type="text"
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    placeholder="例：A101"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">開始時間</label>
                  <input
                    type="time"
                    value={makeupStartTime}
                    onChange={e => setMakeupStartTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">結束時間</label>
                  <input
                    type="time"
                    value={makeupEndTime}
                    onChange={e => setMakeupEndTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">授課老師</label>
                  <select
                    value={teacherId}
                    onChange={e => setTeacherId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
                  >
                    <option value="">選擇老師</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Charge toggle */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={chargeEnabled}
                    onClick={() => setChargeEnabled(!chargeEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                      chargeEnabled ? 'bg-[#C4956A]' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        chargeEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-text">是否收費</span>
                </label>

                {chargeEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">收費金額</label>
                    <input
                      type="number"
                      min={0}
                      value={chargeAmount}
                      onChange={e => setChargeAmount(Number(e.target.value))}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-[#C4956A]/40"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">備註</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="選填"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-border gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text hover:bg-border/30 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '儲存中...' : '確認安排'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

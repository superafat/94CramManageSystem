'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useIsMobile } from '@/hooks/useIsMobile'

interface EditScheduleModalProps {
  isOpen: boolean
  scheduleId: string
  courseId: string
  courseName: string
  courseType: 'group' | 'individual' | 'daycare'
  onClose: () => void
  onUpdated: () => void
}

interface TeacherOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  name: string
  grade?: string
}

interface PaymentSummary {
  studentId: string
  totalEnrollments: number
  paidEnrollments: number
}

function PaymentBadge({ summary }: { summary?: PaymentSummary }) {
  if (!summary || summary.totalEnrollments === 0) return null
  const isPaid = summary.paidEnrollments >= summary.totalEnrollments
  return isPaid
    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#A8B5A2]/20 text-[#4A6B44] font-medium shrink-0">已繳費</span>
    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#B5706E]/15 text-[#B5706E] font-medium shrink-0">未繳費</span>
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

const COURSE_TYPE_BADGE: Record<string, string> = {
  group: 'bg-[#9DAEBB]/20 text-[#5A7A8F]',
  individual: 'bg-[#C8A882]/20 text-[#8F6A3A]',
  daycare: 'bg-[#A8B5A2]/20 text-[#4A6B44]',
}

export default function EditScheduleModal({
  isOpen,
  scheduleId,
  courseId,
  courseName,
  courseType,
  onClose,
  onUpdated,
}: EditScheduleModalProps) {
  const isMobile = useIsMobile()
  const [step, setStep] = useState(1)

  // Form state
  const [scheduledDate, setScheduledDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')

  // Data state
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [paymentMap, setPaymentMap] = useState<Map<string, PaymentSummary>>(new Map())
  const [initialStudentIds, setInitialStudentIds] = useState<Set<string>>(new Set())
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [studentSearch, setStudentSearch] = useState('')

  // Loading state
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch schedule detail
  const fetchDetail = useCallback(async () => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/w8/schedules/${scheduleId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const detail = data.data || data
      setScheduledDate(detail.scheduled_date || '')
      setStartTime(detail.start_time?.slice(0, 5) || '')
      setEndTime(detail.end_time?.slice(0, 5) || '')
      setTeacherId(detail.teacher_id || '')
      setRoom(detail.room_name || detail.room || '')
      setNotes(detail.notes || '')

      const students: Array<{ id: string; name: string; grade?: string }> = detail.students || []
      const ids = new Set(students.map(s => s.id))
      setInitialStudentIds(ids)
      setSelectedStudentIds(new Set(ids))
    } catch (err) {
      console.error('Failed to fetch schedule detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [scheduleId])

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

  // Fetch all students for picker
  const fetchAllStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const [studentsRes, paymentRes] = await Promise.all([
        fetch('/api/admin/students?status=active&limit=200', { credentials: 'include' }),
        fetch('/api/admin/billing/payment-summary', { credentials: 'include' }),
      ])
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        const students = data.data?.students || data.students || []
        setAllStudents(
          students.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: (s.full_name as string) || (s.name as string) || '',
            grade: (s.grade_level as string) || (s.grade as string) || undefined,
          }))
        )
      }
      if (paymentRes.ok) {
        const data = await paymentRes.json()
        const summary: PaymentSummary[] = data.data?.summary || data.summary || []
        setPaymentMap(new Map(summary.map(s => [s.studentId, s])))
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchDetail()
      fetchTeachers()
      fetchAllStudents()
      setStudentSearch('')
      setStep(1)
    }
  }, [isOpen, fetchDetail, fetchTeachers, fetchAllStudents])

  // Filtered students for picker
  const filteredStudents = useMemo(() => {
    if (!studentSearch) return allStudents
    const q = studentSearch.toLowerCase()
    return allStudents.filter(s => s.name.toLowerCase().includes(q))
  }, [allStudents, studentSearch])

  // Selected student objects
  const rosterStudents = useMemo(() => {
    return allStudents.filter(s => selectedStudentIds.has(s.id))
  }, [allStudents, selectedStudentIds])

  // Student diff
  const { toAdd, toRemove, hasStudentChanges } = useMemo(() => {
    const toAdd: string[] = []
    const toRemove: string[] = []
    for (const id of selectedStudentIds) {
      if (!initialStudentIds.has(id)) toAdd.push(id)
    }
    for (const id of initialStudentIds) {
      if (!selectedStudentIds.has(id)) toRemove.push(id)
    }
    return { toAdd, toRemove, hasStudentChanges: toAdd.length > 0 || toRemove.length > 0 }
  }, [selectedStudentIds, initialStudentIds])

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update schedule fields
      await fetch(`/api/w8/schedules/${scheduleId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: scheduledDate || undefined,
          start_time: startTime,
          end_time: endTime,
          teacher_id: teacherId || undefined,
          room_name: room || undefined,
          notes: notes || undefined,
        }),
      })

      // Diff students: add new enrollments
      if (toAdd.length > 0) {
        await fetch('/api/admin/enrollments/batch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, studentIds: toAdd }),
        })
      }

      // Diff students: remove enrollments
      if (toRemove.length > 0) {
        await fetch('/api/admin/enrollments/batch', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, studentIds: toRemove }),
        })
      }

      onUpdated()
    } catch (err) {
      console.error('Failed to save schedule:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const isLoading = loadingDetail || loadingTeachers || loadingStudents

  // Mobile: BottomSheet with 2-step flow
  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={`編輯排課 — ${courseName}`}>
        {/* Step indicator */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-2 mb-3">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  step >= s ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
                }`}>{s}</div>
                <div className={`flex-1 h-1 rounded-full ${s < 2 ? (step > s ? 'bg-primary' : 'bg-surface-hover') : 'hidden'}`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted">{step === 1 ? '基本資訊' : '學生名單'}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : step === 1 ? (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">上課日期</label>
              <input title="上課日期" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">開始時間</label>
                <input title="開始時間" type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-border" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">結束時間</label>
                <input title="結束時間" type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-border" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">教室</label>
              <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="例：A101"
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-border" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">授課老師</label>
              <select title="授課老師" value={teacherId} onChange={e => setTeacherId(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-border bg-white">
                <option value="">選擇老師</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">備註</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="選填"
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-border" />
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 border border-border rounded-xl text-sm text-text">取消</button>
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium">下一步</button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text">
                  學生名單 <span className="text-text-muted font-normal">({selectedStudentIds.size} 人)</span>
                </p>
                {hasStudentChanges && (
                  <span className="text-xs text-[#C4956A]">
                    {toAdd.length > 0 && `+${toAdd.length}`}{toAdd.length > 0 && toRemove.length > 0 && ' / '}{toRemove.length > 0 && `-${toRemove.length}`}
                  </span>
                )}
              </div>
              <input type="text" placeholder="搜尋學生姓名..." value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-border mb-2" />
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredStudents.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-border/20 cursor-pointer">
                    <input type="checkbox" checked={selectedStudentIds.has(s.id)} onChange={() => toggleStudent(s.id)}
                      className="rounded border-border text-primary" />
                    <span className="text-sm text-text flex-1">{s.name}</span>
                    {s.grade && <span className="text-xs text-text-muted">{s.grade}</span>}
                    <PaymentBadge summary={paymentMap.get(s.id)} />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border rounded-xl text-sm text-text">上一步</button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? '儲存中...' : '完成'}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text">
                編輯排課
              </h2>
              <span className="text-sm text-text-muted">— {courseName}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${COURSE_TYPE_BADGE[courseType] ?? ''}`}>
                {COURSE_TYPE_LABEL[courseType] ?? courseType}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Schedule fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Scheduled date */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">上課日期</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Room */}
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

                {/* Start time */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">開始時間</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* End time */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">結束時間</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Teacher */}
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

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">備註</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="選填"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Student picker */}
              <div>
                <h3 className="text-sm font-semibold text-text mb-3">
                  學生名單
                  <span className="ml-1 text-xs font-normal text-text-muted">
                    ({selectedStudentIds.size} 人)
                  </span>
                  {hasStudentChanges && (
                    <span className="ml-2 text-xs font-normal text-[#C4956A]">
                      ({toAdd.length > 0 && `+${toAdd.length}`}{toAdd.length > 0 && toRemove.length > 0 && ' / '}{toRemove.length > 0 && `-${toRemove.length}`})
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left: all students */}
                  <div className="flex flex-col min-h-0">
                    <input
                      type="text"
                      placeholder="搜尋學生姓名..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredStudents.length === 0 ? (
                        <p className="text-xs text-text-muted py-4 text-center">無符合條件的學生</p>
                      ) : (
                        filteredStudents.map(s => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-border/20 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(s.id)}
                              onChange={() => toggleStudent(s.id)}
                              className="rounded border-border text-primary focus:ring-primary/40"
                            />
                            <span className="text-sm text-text flex-1">{s.name}</span>
                            {s.grade && (
                              <span className="text-xs text-text-muted">{s.grade}</span>
                            )}
                            <PaymentBadge summary={paymentMap.get(s.id)} />
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: selected */}
                  <div className="flex flex-col min-h-0">
                    <p className="text-xs font-medium text-text-muted mb-2">目前名單</p>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {rosterStudents.length === 0 ? (
                        <p className="text-xs text-text-muted py-4 text-center">尚未加入任何學生</p>
                      ) : (
                        rosterStudents.map(s => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-border/20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text">{s.name}</span>
                              {s.grade && (
                                <span className="text-xs text-text-muted">{s.grade}</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeStudent(s.id)}
                              className="text-text-muted hover:text-[#B5706E] text-sm leading-none px-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
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
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

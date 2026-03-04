'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DetailStudent } from './types'

interface RosterModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseName: string
  maxStudents?: number
  onUpdated: () => void
}

interface StudentOption {
  id: string
  name: string
  grade?: string
}

export default function RosterModal({ isOpen, onClose, courseId, courseName, maxStudents, onUpdated }: RosterModalProps) {
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch all active students
  const fetchAllStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const res = await fetch('/api/admin/students?status=active&limit=200', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const students = data.data?.students || data.students || []
      setAllStudents(
        students.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: (s.name as string) || '',
          grade: (s.grade as string) || undefined,
        }))
      )
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  // Fetch current roster for this course
  const fetchRoster = useCallback(async () => {
    setLoadingRoster(true)
    try {
      const res = await fetch(`/api/w8/courses/${courseId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const course = data.data || data
      const students: DetailStudent[] = course.students || []
      const ids = new Set(students.map((s) => s.id))
      setInitialIds(ids)
      setSelectedIds(new Set(ids))
    } catch (err) {
      console.error('Failed to fetch course roster:', err)
    } finally {
      setLoadingRoster(false)
    }
  }, [courseId])

  useEffect(() => {
    if (isOpen) {
      fetchAllStudents()
      fetchRoster()
      setSearch('')
      setGradeFilter('')
    }
  }, [isOpen, fetchAllStudents, fetchRoster])

  // Collect unique grades for filter dropdown
  const grades = useMemo(() => {
    const set = new Set<string>()
    for (const s of allStudents) {
      if (s.grade) set.add(s.grade)
    }
    return Array.from(set).sort()
  }, [allStudents])

  // Filter left-panel students
  const filteredStudents = useMemo(() => {
    let list = allStudents
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q))
    }
    if (gradeFilter) {
      list = list.filter(s => s.grade === gradeFilter)
    }
    return list
  }, [allStudents, search, gradeFilter])

  // Right panel: selected students
  const rosterStudents = useMemo(() => {
    return allStudents.filter(s => selectedIds.has(s.id))
  }, [allStudents, selectedIds])

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const removeStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Compute diff
  const { toAdd, toRemove, hasChanges } = useMemo(() => {
    const toAdd: string[] = []
    const toRemove: string[] = []
    for (const id of selectedIds) {
      if (!initialIds.has(id)) toAdd.push(id)
    }
    for (const id of initialIds) {
      if (!selectedIds.has(id)) toRemove.push(id)
    }
    return { toAdd, toRemove, hasChanges: toAdd.length > 0 || toRemove.length > 0 }
  }, [selectedIds, initialIds])

  const handleConfirm = async () => {
    if (!hasChanges) { onClose(); return }
    setSaving(true)
    try {
      if (toAdd.length > 0) {
        await fetch('/api/admin/enrollments/batch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, studentIds: toAdd }),
        })
      }
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
      console.error('Failed to update roster:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const isLoading = loadingStudents || loadingRoster

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text">
              管理名單 — {courseName}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 p-6">
              {/* Left: all students */}
              <div className="flex flex-col min-h-0">
                <h3 className="text-sm font-semibold text-text mb-2">全校學生</h3>

                {/* Filters */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="搜尋姓名..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <select
                    value={gradeFilter}
                    onChange={e => setGradeFilter(e.target.value)}
                    className="text-sm px-2 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
                  >
                    <option value="">全年級</option>
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Student list */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
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
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="rounded border-border text-primary focus:ring-primary/40"
                        />
                        <span className="text-sm text-text flex-1">{s.name}</span>
                        {s.grade && (
                          <span className="text-xs text-text-muted">{s.grade}</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Right: roster */}
              <div className="flex flex-col min-h-0">
                <h3 className="text-sm font-semibold text-text mb-2">
                  目前名單
                  <span className="ml-1 text-xs font-normal text-text-muted">
                    ({rosterStudents.length} 人)
                  </span>
                </h3>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
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
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-text-muted">
              目前 <span className="font-semibold text-text">{selectedIds.size}</span>
              {maxStudents != null && (
                <> / <span className="font-semibold text-text">{maxStudents}</span></>
              )}
              {' '}人
              {hasChanges && (
                <span className="ml-2 text-[#C4956A]">
                  ({toAdd.length > 0 && `+${toAdd.length}`}{toAdd.length > 0 && toRemove.length > 0 && ' / '}{toRemove.length > 0 && `-${toRemove.length}`})
                </span>
              )}
            </span>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text hover:bg-border/30 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !hasChanges}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '儲存中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

interface StudentOption {
  id: string
  name: string
  grade?: string
}

interface StudentPickerProps {
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  courseType?: 'group' | 'individual' | 'daycare'
  maxStudents?: number
}

export default function StudentPicker({ selectedIds, onSelectionChange, courseType, maxStudents }: StudentPickerProps) {
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/students?status=active&limit=200', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const students = data.data?.students || data.students || []
      setAllStudents(students.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: (s.full_name as string) || (s.name as string) || '',
        grade: (s.grade_level as string) || (s.grade as string) || undefined,
      })))
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const grades = useMemo(() => {
    const set = new Set<string>()
    for (const s of allStudents) { if (s.grade) set.add(s.grade) }
    return Array.from(set).sort()
  }, [allStudents])

  const filtered = useMemo(() => {
    let list = allStudents
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q))
    }
    if (gradeFilter) list = list.filter(s => s.grade === gradeFilter)
    return list
  }, [allStudents, search, gradeFilter])

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (courseType === 'individual' && next.size >= 1) {
        next.clear()
      }
      next.add(id)
    }
    onSelectionChange(next)
  }

  const selected = allStudents.filter(s => selectedIds.has(s.id))

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: all students */}
      <div className="flex flex-col min-h-0">
        <h4 className="text-sm font-semibold text-text mb-2">選擇學生</h4>
        <div className="flex gap-2 mb-2">
          <input type="text" placeholder="搜尋姓名..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg border border-border bg-white">
            <option value="">全年級</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-48 pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">無符合條件的學生</p>
          ) : filtered.map(s => (
            <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-border/20 cursor-pointer">
              <input type={courseType === 'individual' ? 'radio' : 'checkbox'}
                checked={selectedIds.has(s.id)} onChange={() => toggle(s.id)}
                className="rounded border-border text-primary focus:ring-primary/40" />
              <span className="text-sm text-text flex-1">{s.name}</span>
              {s.grade && <span className="text-xs text-text-muted">{s.grade}</span>}
            </label>
          ))}
        </div>
      </div>
      {/* Right: selected */}
      <div className="flex flex-col min-h-0">
        <h4 className="text-sm font-semibold text-text mb-2">
          已選 <span className="text-xs font-normal text-text-muted">({selected.length}{maxStudents != null ? `/${maxStudents}` : ''} 人)</span>
        </h4>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-48 pr-1">
          {selected.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">尚未選擇學生</p>
          ) : selected.map(s => (
            <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-border/20">
              <span className="text-sm text-text">{s.name}</span>
              <button onClick={() => toggle(s.id)} className="text-text-muted hover:text-[#B5706E] text-sm px-1">&times;</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

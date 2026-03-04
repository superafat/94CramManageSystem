'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Rating } from '@/components/ui/Rating'
import ToastContainer from '@/components/ui/ToastContainer'
import { useToast } from '@/hooks/useToast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Course {
  id: string
  name: string
}

interface ExamScoreInput {
  subject: string
  score: number | ''
  classAvg: number | ''
}

interface ExamScore {
  subject: string
  score: number
  classAvg: number
}

interface Photo {
  id: string
  url: string
  name: string
}

interface ParentFeedback {
  rating: number
  comment: string
  createdAt: string
}

interface AiAnalysis {
  weakSummary: string
  recommendations: string[]
}

type EntryStatus = 'draft' | 'sent' | 'read' | 'pending'

interface ContactBookEntry {
  id: string
  studentId: string
  studentName: string
  date: string
  status: EntryStatus
  groupProgress: string
  groupHomework: string
  individualProgress: string
  individualHomework: string
  teacherNote: string
  examScores: ExamScore[]
  photos: Photo[]
  parentFeedback: ParentFeedback | null
  aiAnalysis: AiAnalysis | null
}

interface Student {
  id: string
  name: string
  entry: ContactBookEntry | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function avatarColor(name: string): string {
  const colors = [
    'bg-morandi-sage/40 text-morandi-dark',
    'bg-morandi-rose/40 text-morandi-dark',
    'bg-morandi-blue/40 text-morandi-dark',
    'bg-morandi-sand/40 text-morandi-dark',
    'bg-morandi-mauve/40 text-morandi-dark',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

function statusLabel(status: EntryStatus): string {
  switch (status) {
    case 'draft':   return '草稿'
    case 'sent':    return '已發送'
    case 'read':    return '已讀'
    case 'pending': return '待處理'
  }
}

function statusVariant(status: EntryStatus): 'outline' | 'primary' | 'success' | 'warning' {
  switch (status) {
    case 'draft':   return 'outline'
    case 'sent':    return 'primary'
    case 'read':    return 'success'
    case 'pending': return 'warning'
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: string
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-text">{title}</h3>
      </div>
      {hint && <p className="text-xs text-text-muted bg-background rounded px-3 py-2">{hint}</p>}
      {children}
    </div>
  )
}

function TextArea({
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  placeholder?: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
    />
  )
}

function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-4 bg-border rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactBookPage() {
  const toast = useToast()

  // ── State ──
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [sendingEntry, setSendingEntry] = useState(false)
  const [batchCreating, setBatchCreating] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiWritingOpen, setAiWritingOpen] = useState(false)
  const [aiKeywords, setAiKeywords] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiWritingLoading, setAiWritingLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Modal states
  const [classProgressModalOpen, setClassProgressModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)

  // Entry form state (for selected student)
  const [groupProgress, setGroupProgress] = useState('')
  const [groupHomework, setGroupHomework] = useState('')
  const [individualProgress, setIndividualProgress] = useState('')
  const [individualHomework, setIndividualHomework] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [examScores, setExamScores] = useState<ExamScore[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)

  // New exam score input
  const [newExamSubject, setNewExamSubject] = useState('')
  const [newExamScore, setNewExamScore] = useState<number | ''>('')
  const [newExamClassAvg, setNewExamClassAvg] = useState<number | ''>('')

  // Class progress modal form
  const [modalGroupProgress, setModalGroupProgress] = useState('')
  const [modalGroupHomework, setModalGroupHomework] = useState('')

  // Drag state
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debounce save ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentEntryId = useRef<string | null>(null)

  // ── API helpers ──

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
      ...options,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  // ── Load courses ──

  useEffect(() => {
    setLoadingCourses(true)
    apiFetch<{ success: boolean; data: { courses: Array<{ id: string; name: string }> } }>('/api/w8/courses')
      .then((res) => {
        const list = (res.data?.courses ?? []).map((c) => ({ id: c.id, name: c.name }))
        setCourses(list)
        if (list.length > 0) {
          setSelectedCourseId(list[0].id)
        }
      })
      .catch((err: unknown) => {
        toast.error(`載入課程失敗：${err instanceof Error ? err.message : String(err)}`)
      })
      .finally(() => setLoadingCourses(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load entries when course/date changes ──

  const loadEntries = useCallback(async () => {
    if (!selectedCourseId) return
    setLoadingStudents(true)
    try {
      interface BackendEntry {
        id: string
        studentId: string
        studentName: string | null
        courseId: string
        entryDate: string
        status: EntryStatus
        groupProgress: string | null
        groupHomework: string | null
        individualNote: string | null
        individualHomework: string | null
        teacherTip: string | null
        sentAt: string | null
        readAt: string | null
        createdAt: string
        scores?: Array<{ id: string; subject: string; score: number; classAvg?: number; fullScore?: number }>
        photos?: Array<{ id: string; url: string; caption?: string; sortOrder?: number }>
        feedback?: Array<{ id: string; parentUserId: string; rating: number; comment?: string; createdAt: string }>
        aiAnalysis?: { id: string; weaknessSummary: string; recommendedCourseName?: string; recommendedCourseDesc?: string } | null
      }
      interface BackendStudent { studentId: string; studentName: string; studentGrade?: string }
      const res = await apiFetch<{ success: boolean; data: { entries: BackendEntry[]; studentsWithoutEntry: BackendStudent[] } }>(
        `/api/admin/contact-book/entries?courseId=${selectedCourseId}&date=${selectedDate}`
      )
      const { entries = [], studentsWithoutEntry = [] } = res.data ?? {}

      const mapEntry = (e: BackendEntry): Student => ({
        id: e.studentId,
        name: e.studentName ?? '',
        entry: {
          id: e.id,
          studentId: e.studentId,
          studentName: e.studentName ?? '',
          date: e.entryDate,
          status: e.status,
          groupProgress: e.groupProgress ?? '',
          groupHomework: e.groupHomework ?? '',
          individualProgress: e.individualNote ?? '',
          individualHomework: e.individualHomework ?? '',
          teacherNote: e.teacherTip ?? '',
          examScores: (e.scores ?? []).map((s) => ({ subject: s.subject, score: s.score, classAvg: s.classAvg ?? 0 })),
          photos: (e.photos ?? []).map((p) => ({ id: p.id, url: p.url, name: p.caption ?? '' })),
          parentFeedback: e.feedback?.[0] ? { rating: e.feedback[0].rating, comment: e.feedback[0].comment ?? '', createdAt: e.feedback[0].createdAt } : null,
          aiAnalysis: e.aiAnalysis ? { weakSummary: e.aiAnalysis.weaknessSummary, recommendations: e.aiAnalysis.recommendedCourseDesc ? e.aiAnalysis.recommendedCourseDesc.split('；') : [] } : null,
        },
      })

      const studentsFromEntries = entries.map((e) => mapEntry(e))
      const studentsWithout = studentsWithoutEntry
        .filter((s) => !entries.some((e) => e.studentId === s.studentId))
        .map((s) => ({ id: s.studentId, name: s.studentName, entry: null }))

      setStudents([...studentsFromEntries, ...studentsWithout])
      setSelectedStudentId(null)
      clearForm()
    } catch (err: unknown) {
      toast.error(`載入學生列表失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedCourseId, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // ── Select student ──

  function clearForm() {
    setGroupProgress('')
    setGroupHomework('')
    setIndividualProgress('')
    setIndividualHomework('')
    setTeacherNote('')
    setExamScores([])
    setPhotos([])
    setAiAnalysis(null)
    currentEntryId.current = null
  }

  function selectStudent(studentId: string) {
    setSelectedStudentId(studentId)
    setSidebarOpen(false)
    const student = students.find((s) => s.id === studentId)
    if (!student?.entry) {
      clearForm()
      return
    }
    const e = student.entry
    currentEntryId.current = e.id
    setGroupProgress(e.groupProgress)
    setGroupHomework(e.groupHomework)
    setIndividualProgress(e.individualProgress)
    setIndividualHomework(e.individualHomework)
    setTeacherNote(e.teacherNote)
    setExamScores(e.examScores)
    setPhotos(e.photos)
    setAiAnalysis(e.aiAnalysis)
  }

  // ── Auto-save (debounce 1s) ──

  const triggerAutoSave = useCallback(() => {
    if (!currentEntryId.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void saveEntry(false)
    }, 1000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Call triggerAutoSave whenever form fields change
  useEffect(() => { triggerAutoSave() }, [
    groupProgress,
    groupHomework,
    individualProgress,
    individualHomework,
    teacherNote,
    examScores,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveEntry(showToast = true): Promise<void> {
    if (!currentEntryId.current) return
    setSavingEntry(true)
    try {
      await apiFetch(`/api/admin/contact-book/entries/${currentEntryId.current}`, {
        method: 'PUT',
        body: JSON.stringify({
          groupProgress,
          groupHomework,
          individualNote: individualProgress,
          individualHomework,
          teacherTip: teacherNote,
          scores: examScores,
        }),
      })
      if (showToast) toast.success('已儲存')
    } catch (err: unknown) {
      if (showToast) toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSavingEntry(false)
    }
  }

  // ── Batch create ──

  async function batchCreate() {
    if (!selectedCourseId) return
    const studentIds = students.filter((s) => !s.entry).map((s) => s.id)
    if (studentIds.length === 0) {
      toast.warning('所有學生已有聯絡簿')
      return
    }
    setBatchCreating(true)
    try {
      await apiFetch('/api/admin/contact-book/entries', {
        method: 'POST',
        body: JSON.stringify({ courseId: selectedCourseId, entryDate: selectedDate, studentIds }),
      })
      toast.success('批次建立完成')
      await loadEntries()
    } catch (err: unknown) {
      toast.error(`批次建立失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBatchCreating(false)
    }
  }

  // ── Send entry ──

  async function sendEntry() {
    if (!currentEntryId.current) return
    setSendingEntry(true)
    try {
      await apiFetch(`/api/admin/contact-book/entries/${currentEntryId.current}/send`, {
        method: 'POST',
      })
      toast.success('已正式發送給家長')
      setSendConfirmOpen(false)
      // Update local status
      setStudents((prev) =>
        prev.map((s) =>
          s.entry?.id === currentEntryId.current
            ? { ...s, entry: s.entry ? { ...s.entry, status: 'sent' } : s.entry }
            : s
        )
      )
    } catch (err: unknown) {
      toast.error(`發送失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSendingEntry(false)
    }
  }

  // ── Class progress modal save ──

  async function saveClassProgress() {
    if (!selectedCourseId) return
    try {
      await apiFetch('/api/admin/contact-book/templates', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourseId,
          entryDate: selectedDate,
          groupProgress: modalGroupProgress,
          groupHomework: modalGroupHomework,
        }),
      })
      // Apply to all entries via batch update — send studentIds of all students
      const allStudentIds = students.map((s) => s.id)
      if (allStudentIds.length > 0) {
        await apiFetch('/api/admin/contact-book/entries', {
          method: 'POST',
          body: JSON.stringify({
            courseId: selectedCourseId,
            entryDate: selectedDate,
            studentIds: allStudentIds,
            groupProgress: modalGroupProgress,
            groupHomework: modalGroupHomework,
          }),
        })
      }
      toast.success('已套用到所有學生')
      setClassProgressModalOpen(false)
      // Update current form if student is selected
      setGroupProgress(modalGroupProgress)
      setGroupHomework(modalGroupHomework)
      await loadEntries()
    } catch (err: unknown) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── Add exam score ──

  function addExamScore() {
    if (!newExamSubject.trim() || newExamScore === '' || newExamClassAvg === '') return
    setExamScores((prev) => [
      ...prev,
      { subject: newExamSubject.trim(), score: Number(newExamScore), classAvg: Number(newExamClassAvg) },
    ])
    setNewExamSubject('')
    setNewExamScore('')
    setNewExamClassAvg('')
  }

  function removeExamScore(idx: number) {
    setExamScores((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Photo upload ──

  async function uploadPhotos(files: FileList) {
    if (photos.length + files.length > 5) {
      toast.warning('最多只能上傳 5 張照片')
      return
    }
    setUploadingPhoto(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('photo', file)
        if (currentEntryId.current) {
          formData.append('entryId', currentEntryId.current)
        }
        const res = await fetch('/api/admin/contact-book/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { success: boolean; data: { id: string; url: string; caption?: string } }
        const photo = data.data
        setPhotos((prev) => [...prev, { id: photo.id, url: photo.url, name: photo.caption ?? '' }])
      }
      toast.success('照片上傳成功')
    } catch (err: unknown) {
      toast.error(`上傳失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      await apiFetch(`/api/admin/contact-book/photos/${photoId}`, { method: 'DELETE' })
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch (err: unknown) {
      toast.error(`刪除照片失敗：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── AI Analysis ──

  async function generateAiAnalysis() {
    if (!currentEntryId.current) return
    setAiLoading(true)
    try {
      const res = await apiFetch<{ success: boolean; data: { weaknessSummary: string; recommendedCourseName?: string; recommendedCourseDesc?: string } }>('/api/admin/contact-book/ai-analysis', {
        method: 'POST',
        body: JSON.stringify({ entryId: currentEntryId.current }),
      })
      const ai = res.data
      setAiAnalysis({
        weakSummary: ai.weaknessSummary ?? '',
        recommendations: ai.recommendedCourseDesc ? ai.recommendedCourseDesc.split('；') : [],
      })
    } catch (err: unknown) {
      toast.error(`AI 分析失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setAiLoading(false)
    }
  }

  // ── AI Writing ──

  async function generateAiWriting() {
    if (!aiKeywords.trim()) return
    setAiWritingLoading(true)
    setAiResult('')
    try {
      const res = await apiFetch<{ success: boolean; data: { text: string } }>('/api/admin/contact-book/ai-writing', {
        method: 'POST',
        body: JSON.stringify({ keywords: aiKeywords, studentName: selectedStudent?.name ?? '' }),
      })
      setAiResult(res.data.text)
    } catch (err: unknown) {
      // Demo 模式或 API 尚未實作時，回傳預設文字
      const fallback = `${selectedStudent?.name ?? '同學'}近期表現：${aiKeywords}。老師會持續關注並給予適當的指導，請家長在家也多多鼓勵孩子，讓我們一起幫助孩子成長進步！`
      setAiResult(fallback)
      void err // suppress unused
    } finally {
      setAiWritingLoading(false)
    }
  }

  // ── Drag & Drop ──

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      void uploadPhotos(e.dataTransfer.files)
    }
  }

  // ── Computed ──

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-screen bg-background relative">
      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} position="top-right" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 lg:z-auto
          w-80 bg-surface border-r border-border flex flex-col
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">電子聯絡簿</h2>
            <button
              className="lg:hidden text-text-muted hover:text-text"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Course selector */}
          <div>
            <label className="block text-xs text-text-muted mb-1">課程</label>
            {loadingCourses ? (
              <div className="h-9 bg-border/40 rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {courses.length === 0 && <option value="">尚無課程</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date selector */}
          <div>
            <label className="block text-xs text-text-muted mb-1">日期</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Class progress modal button */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              setModalGroupProgress(groupProgress)
              setModalGroupHomework(groupHomework)
              setClassProgressModalOpen(true)
            }}
          >
            📋 班級進度設定
          </Button>
        </div>

        {/* Student search */}
        <div className="px-4 py-3 border-b border-border">
          <input
            type="text"
            placeholder="搜尋學生姓名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loadingStudents ? (
            <div className="px-4 py-3 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-border/40 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-border/40 rounded animate-pulse w-2/3" />
                    <div className="h-2 bg-border/40 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              {students.length === 0 ? '尚無學生記錄，請先批次建立' : '找不到符合的學生'}
            </div>
          ) : (
            filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s.id)}
                className={`
                  w-full text-left px-4 py-3 flex items-center gap-3
                  transition-colors hover:bg-surface-hover
                  ${selectedStudentId === s.id ? 'bg-primary/10 border-l-2 border-primary' : ''}
                `}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColor(s.name)}`}>
                  {s.name.charAt(0)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-text truncate">{s.name}</span>
                    {s.entry && (
                      <Badge variant={statusVariant(s.entry.status)} size="sm">
                        {statusLabel(s.entry.status)}
                      </Badge>
                    )}
                  </div>
                  {s.entry?.parentFeedback && (
                    <Rating
                      value={s.entry.parentFeedback.rating}
                      readOnly
                      size="sm"
                      className="mt-0.5"
                    />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Batch create button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            disabled={batchCreating || !selectedCourseId}
            onClick={() => void batchCreate()}
          >
            {batchCreating ? '建立中...' : '📝 批次建立今日聯絡簿'}
          </Button>
        </div>
      </aside>

      {/* ── Right Main Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            ☰
          </button>
          <span className="text-sm font-medium text-text">
            {selectedStudent ? selectedStudent.name : '選取學生'}
          </span>
        </div>

        {/* Empty state */}
        {!selectedStudent && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-5xl">📋</div>
              <p className="text-text-muted text-sm">請從左側選取學生以編輯聯絡簿</p>
            </div>
          </div>
        )}

        {/* Entry form */}
        {selectedStudent && (
          <div className="flex-1 p-4 md:p-6 space-y-4 max-w-3xl mx-auto w-full pb-10">

            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-text">{selectedStudent.name}</h1>
                <p className="text-sm text-text-muted">{selectedDate}</p>
                {savingEntry && <span className="text-xs text-text-muted">儲存中...</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewModalOpen(true)}
                >
                  👁 預覽家長版
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={sendingEntry || !selectedStudent.entry}
                  onClick={() => setSendConfirmOpen(true)}
                >
                  {sendingEntry ? '發送中...' : '🚀 正式發送'}
                </Button>
              </div>
            </div>

            {/* Section 1: 全班集體進度 & 作業 */}
            <SectionCard
              icon="📈"
              title="全班集體進度 & 作業"
              hint="所有學生聯絡簿將預設帶入此內容"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">今日團體課程進度</label>
                  <TextArea
                    placeholder="今天上課到哪裡..."
                    value={groupProgress}
                    onChange={setGroupProgress}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">全體共同作業</label>
                  <TextArea
                    placeholder="回家作業、複習範圍..."
                    value={groupHomework}
                    onChange={setGroupHomework}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 2: 個別指導與加強 */}
            <SectionCard icon="🎯" title="個別指導與加強">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">個別學習說明</label>
                  <TextArea
                    placeholder={`針對 ${selectedStudent.name} 的個別進度說明...`}
                    value={individualProgress}
                    onChange={setIndividualProgress}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">個別專屬作業</label>
                  <TextArea
                    placeholder="針對個人弱點的補強作業..."
                    value={individualHomework}
                    onChange={setIndividualHomework}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void generateAiAnalysis()}
                  disabled={aiLoading}
                >
                  {aiLoading ? '分析中...' : '🤖 載入歷史弱點建議'}
                </Button>
              </div>
            </SectionCard>

            {/* Section 3: 考試成績 */}
            <SectionCard
              icon="📊"
              title="今日考試成績錄入"
              hint="填寫完成後將同步更新至成績管理中心"
            >
              {/* Existing scores */}
              {examScores.length > 0 && (
                <div className="space-y-2 mb-3">
                  {examScores.map((sc, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-text flex-1">{sc.subject}</span>
                      <span className="text-primary font-semibold">{sc.score} 分</span>
                      <span className="text-text-muted text-xs">均 {sc.classAvg}</span>
                      <button
                        className="text-text-muted hover:text-red-500 ml-1"
                        onClick={() => removeExamScore(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add score row */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="科目"
                  value={newExamSubject}
                  onChange={(e) => setNewExamSubject(e.target.value)}
                  className="flex-1 min-w-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number"
                  placeholder="分數"
                  value={newExamScore}
                  onChange={(e) => setNewExamScore(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number"
                  placeholder="班平均"
                  value={newExamClassAvg}
                  onChange={(e) => setNewExamClassAvg(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={addExamScore}
                  disabled={!newExamSubject.trim() || newExamScore === '' || newExamClassAvg === ''}
                  className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center text-lg font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  +
                </button>
              </div>
            </SectionCard>

            {/* Section 4: 親師通訊小叮嚀 */}
            <SectionCard icon="💡" title="親師通訊小叮嚀">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">老師小叮嚀</span>
                <button
                  type="button"
                  onClick={() => { setAiWritingOpen(!aiWritingOpen); setAiResult('') }}
                  className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg px-3 py-1 text-sm transition-colors"
                >
                  ✨ AI 助寫
                </button>
              </div>
              {aiWritingOpen && (
                <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiKeywords}
                      onChange={(e) => setAiKeywords(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void generateAiWriting() }}
                      placeholder="輸入關鍵字，如：數學進步 作業遲交 態度積極"
                      className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                    />
                    <button
                      type="button"
                      onClick={() => void generateAiWriting()}
                      disabled={!aiKeywords.trim() || aiWritingLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
                    >
                      {aiWritingLoading && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      )}
                      生成
                    </button>
                  </div>
                  {aiResult && (
                    <div className="space-y-2">
                      <p className="text-sm text-text whitespace-pre-wrap rounded-lg bg-white border border-purple-100 p-3">{aiResult}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherNote((prev) => prev ? `${prev}\n\n${aiResult}` : aiResult)
                            setAiWritingOpen(false)
                            setAiKeywords('')
                            setAiResult('')
                            toast.success('已採用 AI 建議文字')
                          }}
                          className="rounded-lg bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90 transition-colors"
                        >
                          採用
                        </button>
                        <button
                          type="button"
                          onClick={() => void generateAiWriting()}
                          disabled={aiWritingLoading}
                          className="rounded-lg border border-purple-200 bg-white px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 disabled:opacity-40 transition-colors"
                        >
                          重新生成
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <TextArea
                placeholder="想對家長說的話..."
                value={teacherNote}
                onChange={setTeacherNote}
                rows={4}
              />
            </SectionCard>

            {/* Section 5: 今日學習剪影 */}
            <SectionCard icon="📸" title="今日學習剪影">
              {/* Upload area */}
              {photos.length < 5 && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                    ${isDragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-surface-hover'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        void uploadPhotos(e.target.files)
                      }
                    }}
                  />
                  {uploadingPhoto ? (
                    <div className="flex items-center justify-center gap-2 text-text-muted">
                      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-sm">上傳中...</span>
                    </div>
                  ) : (
                    <div className="text-text-muted space-y-1">
                      <div className="text-3xl">📁</div>
                      <p className="text-sm">拖曳或點擊上傳照片</p>
                      <p className="text-xs">最多 5 張（剩餘 {5 - photos.length} 張）</p>
                    </div>
                  )}
                </div>
              )}

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-border/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => void deletePhoto(photo.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Section 6: AI 智能分析建議 */}
            <SectionCard icon="🤖" title="AI 智能分析建議">
              {!aiAnalysis && !aiLoading && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void generateAiAnalysis()}
                >
                  生成 AI 分析
                </Button>
              )}
              {aiLoading && (
                <div className="space-y-2">
                  <SkeletonLines count={4} />
                </div>
              )}
              {aiAnalysis && !aiLoading && (
                <div className="space-y-3">
                  <div className="bg-morandi-sage/10 rounded-lg px-4 py-3">
                    <p className="text-sm font-medium text-morandi-sage mb-1">弱點摘要</p>
                    <p className="text-sm text-text">{aiAnalysis.weakSummary}</p>
                  </div>
                  {aiAnalysis.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-2">推薦加強項目</p>
                      <ul className="space-y-1">
                        {aiAnalysis.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-text flex items-start gap-2">
                            <span className="text-morandi-gold mt-0.5">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const combined = [aiAnalysis.weakSummary, ...aiAnalysis.recommendations].join('\n')
                      setTeacherNote((prev) => prev ? `${prev}\n\n${combined}` : combined)
                      toast.success('已加入聯絡簿推薦項目')
                    }}
                  >
                    加入聯絡簿推薦項目
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Section 7: 最新家長反饋 */}
            {selectedStudent.entry?.parentFeedback && (
              <SectionCard icon="💬" title="最新家長反饋">
                <div className="bg-background rounded-lg px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Rating
                      value={selectedStudent.entry.parentFeedback.rating}
                      readOnly
                      size="sm"
                    />
                    <span className="text-xs text-text-muted">
                      {new Date(selectedStudent.entry.parentFeedback.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  {selectedStudent.entry.parentFeedback.comment && (
                    <p className="text-sm text-text">{selectedStudent.entry.parentFeedback.comment}</p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Manual save button */}
            <div className="flex justify-end pb-4">
              <Button
                variant="primary"
                size="sm"
                disabled={savingEntry}
                onClick={() => void saveEntry(true)}
              >
                {savingEntry ? '儲存中...' : '💾 手動儲存'}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Class Progress Modal ── */}
      <Modal
        isOpen={classProgressModalOpen}
        onClose={() => setClassProgressModalOpen(false)}
        title="班級進度設定"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">設定後將套用到所有學生的聯絡簿</p>
          <div>
            <label className="block text-sm font-medium text-text mb-1">今日團體課程進度</label>
            <textarea
              rows={4}
              value={modalGroupProgress}
              onChange={(e) => setModalGroupProgress(e.target.value)}
              placeholder="今天全班上課到哪裡..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">全體共同作業</label>
            <textarea
              rows={4}
              value={modalGroupHomework}
              onChange={(e) => setModalGroupHomework(e.target.value)}
              placeholder="全體回家作業、複習範圍..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setClassProgressModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={() => void saveClassProgress()}>
              儲存並套用到所有學生
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Preview Modal (Parent view) ── */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={`家長版預覽 — ${selectedStudent?.name ?? ''}`}
        size="xl"
      >
        {selectedStudent && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Header card */}
            <div className="bg-gradient-to-br from-morandi-sage/20 to-morandi-blue/20 rounded-xl p-4 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-2 ${avatarColor(selectedStudent.name)}`}>
                {selectedStudent.name.charAt(0)}
              </div>
              <h3 className="font-bold text-text text-lg">{selectedStudent.name}</h3>
              <p className="text-text-muted text-sm">{selectedDate} 學習日報</p>
            </div>

            {/* Exam scores */}
            {examScores.length > 0 && (
              <div className="bg-surface rounded-xl p-4">
                <h4 className="font-semibold text-text mb-3">📊 今日學習成就</h4>
                <div className="grid grid-cols-2 gap-2">
                  {examScores.map((sc, i) => (
                    <div key={i} className="bg-background rounded-lg p-3 text-center">
                      <p className="text-xs text-text-muted">{sc.subject}</p>
                      <p className="text-2xl font-bold text-primary">{sc.score}</p>
                      <p className="text-xs text-text-muted">班級平均 {sc.classAvg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {(groupProgress || individualProgress) && (
              <div className="bg-surface rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-text">📈 今日課表與進度</h4>
                {groupProgress && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">全班課程進度</p>
                    <p className="text-sm text-text whitespace-pre-wrap">{groupProgress}</p>
                  </div>
                )}
                {individualProgress && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">個別學習說明</p>
                    <p className="text-sm text-text whitespace-pre-wrap">{individualProgress}</p>
                  </div>
                )}
              </div>
            )}

            {/* Homework */}
            {(groupHomework || individualHomework) && (
              <div className="bg-surface rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-text">📝 今日作業</h4>
                {groupHomework && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">共同作業</p>
                    <p className="text-sm text-text whitespace-pre-wrap">{groupHomework}</p>
                  </div>
                )}
                {individualHomework && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">個別作業</p>
                    <p className="text-sm text-text whitespace-pre-wrap">{individualHomework}</p>
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="bg-surface rounded-xl p-4">
                <h4 className="font-semibold text-text mb-3">📸 學習剪影</h4>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="rounded-lg overflow-hidden aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher note */}
            {teacherNote && (
              <div className="bg-morandi-gold/10 rounded-xl p-4">
                <h4 className="font-semibold text-morandi-gold mb-2">💡 老師的小叮嚀</h4>
                <p className="text-sm text-text whitespace-pre-wrap">{teacherNote}</p>
              </div>
            )}

            {/* AI recommendations */}
            {aiAnalysis && (
              <div className="bg-morandi-sage/10 rounded-xl p-4">
                <h4 className="font-semibold text-morandi-sage mb-2">🤖 AI 學習建議</h4>
                <p className="text-sm text-text mb-2">{aiAnalysis.weakSummary}</p>
                {aiAnalysis.recommendations.length > 0 && (
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-text flex items-start gap-2">
                        <span className="text-morandi-sage">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Send Confirm Modal ── */}
      <Modal
        isOpen={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        title="確認發送"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            確定要正式發送 <strong>{selectedStudent?.name}</strong> 的聯絡簿給家長嗎？發送後家長即可查看。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSendConfirmOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={sendingEntry}
              onClick={() => void sendEntry()}
            >
              {sendingEntry ? '發送中...' : '確認發送'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

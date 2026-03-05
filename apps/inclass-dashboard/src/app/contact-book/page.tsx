'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthHeaders } from '@/lib/api'

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

function avatarBg(name: string): string {
  const colors = ['#B8C5B4', '#C4A8A0', '#A0B4C4', '#C8BCA0', '#B4A0C0']
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

function statusColor(status: EntryStatus): { bg: string; color: string } {
  switch (status) {
    case 'draft':   return { bg: '#E0E0E0', color: '#555' }
    case 'sent':    return { bg: '#A0B4C4', color: 'white' }
    case 'read':    return { bg: '#8FA895', color: 'white' }
    case 'pending': return { bg: '#C4956A', color: 'white' }
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
    <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', margin: 0 }}>{title}</h3>
      </div>
      {hint && (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--background)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
          {hint}
        </p>
      )}
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
      style={{
        width: '100%',
        borderRadius: '8px',
        border: '2px solid var(--border)',
        background: 'var(--background)',
        padding: '8px 12px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        resize: 'none',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}

function ModalOverlay({
  isOpen,
  onClose,
  title,
  wide,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  if (!isOpen) return null
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(74, 74, 74, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', borderRadius: '16px', padding: '24px',
          maxWidth: wide ? '700px' : '500px', width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '2px solid var(--border)',
          position: 'relative',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: '#B85C5C', border: 'none',
            width: '32px', height: '32px', borderRadius: '50%',
            color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          x
        </button>
        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px', margin: '0 0 16px' }}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: `${size}px`, color: i <= value ? '#C4956A' : '#D0D0D0' }}>
          {i <= value ? '\u2605' : '\u2606'}
        </span>
      ))}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactBookPage() {
  // Toast
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success')
  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(''), 3000)
  }

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
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options?.headers ?? {}) },
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
        showToast(`載入課程失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
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
        `/api/contact-book/entries?courseId=${selectedCourseId}&date=${selectedDate}`
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
          aiAnalysis: e.aiAnalysis ? { weakSummary: e.aiAnalysis.weaknessSummary, recommendations: e.aiAnalysis.recommendedCourseDesc ? e.aiAnalysis.recommendedCourseDesc.split('\uFF1B') : [] } : null,
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
      showToast(`載入學生列表失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
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

  async function saveEntry(showToastMsg = true): Promise<void> {
    if (!currentEntryId.current) return
    setSavingEntry(true)
    try {
      await apiFetch(`/api/contact-book/entries/${currentEntryId.current}`, {
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
      if (showToastMsg) showToast('已儲存', 'success')
    } catch (err: unknown) {
      if (showToastMsg) showToast(`儲存失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setSavingEntry(false)
    }
  }

  // ── Batch create ──

  async function batchCreate() {
    if (!selectedCourseId) return
    const studentIds = students.filter((s) => !s.entry).map((s) => s.id)
    if (studentIds.length === 0) {
      showToast('所有學生已有聯絡簿', 'warning')
      return
    }
    setBatchCreating(true)
    try {
      await apiFetch('/api/contact-book/entries', {
        method: 'POST',
        body: JSON.stringify({ courseId: selectedCourseId, entryDate: selectedDate, studentIds }),
      })
      showToast('批次建立完成', 'success')
      await loadEntries()
    } catch (err: unknown) {
      showToast(`批次建立失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setBatchCreating(false)
    }
  }

  // ── Send entry ──

  async function sendEntry() {
    if (!currentEntryId.current) return
    setSendingEntry(true)
    try {
      await apiFetch(`/api/contact-book/entries/${currentEntryId.current}/send`, {
        method: 'POST',
      })
      showToast('已正式發送給家長', 'success')
      setSendConfirmOpen(false)
      // Update local status
      setStudents((prev) =>
        prev.map((s) =>
          s.entry?.id === currentEntryId.current
            ? { ...s, entry: s.entry ? { ...s.entry, status: 'sent' as EntryStatus } : s.entry }
            : s
        )
      )
    } catch (err: unknown) {
      showToast(`發送失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setSendingEntry(false)
    }
  }

  // ── Class progress modal save ──

  async function saveClassProgress() {
    if (!selectedCourseId) return
    try {
      await apiFetch('/api/contact-book/templates', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourseId,
          entryDate: selectedDate,
          groupProgress: modalGroupProgress,
          groupHomework: modalGroupHomework,
        }),
      })
      // Apply to all entries via batch update
      const allStudentIds = students.map((s) => s.id)
      if (allStudentIds.length > 0) {
        await apiFetch('/api/contact-book/entries', {
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
      showToast('已套用到所有學生', 'success')
      setClassProgressModalOpen(false)
      setGroupProgress(modalGroupProgress)
      setGroupHomework(modalGroupHomework)
      await loadEntries()
    } catch (err: unknown) {
      showToast(`儲存失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
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
      showToast('最多只能上傳 5 張照片', 'warning')
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
        const res = await fetch('/api/contact-book/upload', {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders(),
          body: formData,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { success: boolean; data: { id: string; url: string; caption?: string } }
        const photo = data.data
        setPhotos((prev) => [...prev, { id: photo.id, url: photo.url, name: photo.caption ?? '' }])
      }
      showToast('照片上傳成功', 'success')
    } catch (err: unknown) {
      showToast(`上傳失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      await apiFetch(`/api/contact-book/photos/${photoId}`, { method: 'DELETE' })
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch (err: unknown) {
      showToast(`刪除照片失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  // ── AI Analysis ──

  async function generateAiAnalysis() {
    if (!currentEntryId.current) return
    setAiLoading(true)
    try {
      const res = await apiFetch<{ success: boolean; data: { weaknessSummary: string; recommendedCourseName?: string; recommendedCourseDesc?: string } }>('/api/contact-book/ai-analysis', {
        method: 'POST',
        body: JSON.stringify({ entryId: currentEntryId.current }),
      })
      const ai = res.data
      setAiAnalysis({
        weakSummary: ai.weaknessSummary ?? '',
        recommendations: ai.recommendedCourseDesc ? ai.recommendedCourseDesc.split('\uFF1B') : [],
      })
    } catch (err: unknown) {
      showToast(`AI 分析失敗：${err instanceof Error ? err.message : String(err)}`, 'error')
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
      const res = await apiFetch<{ success: boolean; data: { text: string } }>('/api/contact-book/ai-writing', {
        method: 'POST',
        body: JSON.stringify({ keywords: aiKeywords, studentName: selectedStudent?.name ?? '' }),
      })
      setAiResult(res.data.text)
    } catch (err: unknown) {
      const fallback = `${selectedStudent?.name ?? '同學'}近期表現：${aiKeywords}。老師會持續關注並給予適當的指導，請家長在家也多多鼓勵孩子，讓我們一起幫助孩子成長進步！`
      setAiResult(fallback)
      void err
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

  // ── Print ──

  function handlePrint() {
    if (!selectedStudent) return
    const courseName = courses.find((c) => c.id === selectedCourseId)?.name ?? ''

    const scoreRows = examScores
      .map(
        (sc) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #e8e4df">${sc.subject}</td><td style="padding:8px 12px;border-bottom:1px solid #e8e4df;text-align:center;font-weight:600;color:#6B8CAE">${sc.score}</td><td style="padding:8px 12px;border-bottom:1px solid #e8e4df;text-align:center;color:#999">${sc.classAvg}</td></tr>`
      )
      .join('')

    const photoImgs = photos
      .map(
        (p) =>
          `<img src="${p.url}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e8e4df" />`
      )
      .join('')

    const aiHtml = aiAnalysis
      ? `<div style="background:#f0f4f1;border-radius:12px;padding:16px;margin-top:12px">
          <h3 style="margin:0 0 8px;font-size:14px;color:#7B9E89">AI 學習建議</h3>
          <p style="margin:0 0 8px;font-size:13px;color:#333">${aiAnalysis.weakSummary}</p>
          ${aiAnalysis.recommendations.length > 0 ? `<ul style="margin:0;padding-left:18px">${aiAnalysis.recommendations.map((r) => `<li style="font-size:13px;color:#333;margin-bottom:4px">${r}</li>`).join('')}</ul>` : ''}
        </div>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${selectedStudent.name} — 聯絡簿 ${selectedDate}</title>
<style>
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  body { font-family: "Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif; margin:0; padding:0; background:#fff; color:#333; }
  .page { max-width:680px; margin:0 auto; padding:32px 24px; }
  .header { text-align:center; padding:24px; background:linear-gradient(135deg,#e8f0e4,#dde8f0); border-radius:16px; margin-bottom:24px; }
  .avatar { width:64px; height:64px; border-radius:50%; background:#9DAEBB; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; margin-bottom:8px; }
  .student-name { font-size:22px; font-weight:700; margin:4px 0 0; }
  .sub-info { font-size:13px; color:#888; margin-top:4px; }
  .section { background:#fafaf8; border:1px solid #e8e4df; border-radius:12px; padding:16px; margin-bottom:16px; }
  .section h3 { font-size:14px; font-weight:600; margin:0 0 10px; color:#555; }
  .section p, .section li { font-size:13px; line-height:1.7; }
  .label { font-size:11px; color:#999; margin-bottom:4px; }
  table { width:100%; border-collapse:collapse; }
  th { padding:8px 12px; text-align:left; font-size:12px; color:#888; border-bottom:2px solid #e8e4df; }
  .tip-box { background:#fdf6ed; border-radius:12px; padding:16px; border-left:4px solid #C4956A; }
  .tip-box h3 { color:#C4956A; }
  .footer { text-align:center; margin-top:32px; padding-top:16px; border-top:1px solid #e8e4df; font-size:11px; color:#bbb; }
  .print-btn { display:block; margin:0 auto 24px; padding:12px 32px; font-size:16px; font-weight:600; background:#6B8CAE; color:#fff; border:none; border-radius:12px; cursor:pointer; }
  .print-btn:hover { background:#5a7a9e; }
</style>
</head>
<body>
<div class="page">
  <button class="print-btn no-print" onclick="window.print()">列印此頁</button>

  <div class="header">
    <div class="avatar">${selectedStudent.name.charAt(0)}</div>
    <p class="student-name">${selectedStudent.name}</p>
    <p class="sub-info">${selectedDate} 學習日報${courseName ? ` \u30FB ${courseName}` : ''}</p>
  </div>

  ${examScores.length > 0 ? `
  <div class="section">
    <h3>今日考試成績</h3>
    <table>
      <thead><tr><th>科目</th><th style="text-align:center">成績</th><th style="text-align:center">班級平均</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>
  </div>` : ''}

  ${groupProgress || individualProgress ? `
  <div class="section">
    <h3>今日課程進度</h3>
    ${groupProgress ? `<div><p class="label">全班課程進度</p><p style="white-space:pre-wrap">${groupProgress}</p></div>` : ''}
    ${individualProgress ? `<div style="margin-top:10px"><p class="label">個別學習說明</p><p style="white-space:pre-wrap">${individualProgress}</p></div>` : ''}
  </div>` : ''}

  ${groupHomework || individualHomework ? `
  <div class="section">
    <h3>今日作業</h3>
    ${groupHomework ? `<div><p class="label">共同作業</p><p style="white-space:pre-wrap">${groupHomework}</p></div>` : ''}
    ${individualHomework ? `<div style="margin-top:10px"><p class="label">個別作業</p><p style="white-space:pre-wrap">${individualHomework}</p></div>` : ''}
  </div>` : ''}

  ${photos.length > 0 ? `
  <div class="section">
    <h3>學習剪影</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${photoImgs}</div>
  </div>` : ''}

  ${teacherNote ? `
  <div class="tip-box">
    <h3>老師的小叮嚀</h3>
    <p style="white-space:pre-wrap">${teacherNote}</p>
  </div>` : ''}

  ${aiHtml}

  <div class="footer">94 補習班管理系統 — 電子聯絡簿</div>
</div>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  // ── Computed ──

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Button style helper ──
  const btnStyle = (variant: 'primary' | 'secondary' | 'accent', disabled = false): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }
    switch (variant) {
      case 'primary':
        return { ...base, background: 'var(--accent)', color: 'white' }
      case 'secondary':
        return { ...base, background: 'var(--border)', color: 'var(--text-primary)' }
      case 'accent':
        return { ...base, background: 'var(--primary)', color: 'white' }
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid var(--border)',
    fontSize: '14px',
    background: 'var(--background)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', position: 'relative' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 2000,
          padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold',
          color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          background: toastType === 'success' ? '#8FA895' : toastType === 'error' ? '#B85C5C' : '#C4956A',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 20 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ── */}
      <aside
        style={{
          position: sidebarOpen ? 'fixed' : undefined,
          top: 0, left: 0, bottom: 0, zIndex: sidebarOpen ? 30 : undefined,
          width: '320px', minWidth: '320px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.3s',
          boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.1)' : undefined,
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>電子聯絡簿</h2>
            <button
              style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-secondary)', cursor: 'pointer', display: sidebarOpen ? 'block' : 'none' }}
              onClick={() => setSidebarOpen(false)}
            >
              x
            </button>
          </div>

          {/* Course selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>課程</label>
            {loadingCourses ? (
              <div style={{ height: '36px', background: 'var(--border)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {courses.length === 0 && <option value="">尚無課程</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>日期</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Class progress modal button */}
          <button
            style={btnStyle('secondary')}
            onClick={() => {
              setModalGroupProgress(groupProgress)
              setModalGroupHomework(groupHomework)
              setClassProgressModalOpen(true)
            }}
          >
            班級進度設定
          </button>
        </div>

        {/* Student search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="搜尋學生姓名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Student list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loadingStudents ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>載入中...</div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {students.length === 0 ? '尚無學生記錄，請先批次建立' : '找不到符合的學生'}
            </div>
          ) : (
            filteredStudents.map((s) => {
              const isSelected = selectedStudentId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => selectStudent(s.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: isSelected ? 'rgba(107,140,174,0.1)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    border: 'none', borderBottom: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: avatarBg(s.name), color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 600, flexShrink: 0,
                  }}>
                    {s.name.charAt(0)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </span>
                      {s.entry && (() => {
                        const sc = statusColor(s.entry.status)
                        return (
                          <span style={{
                            padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold',
                            background: sc.bg, color: sc.color, whiteSpace: 'nowrap',
                          }}>
                            {statusLabel(s.entry.status)}
                          </span>
                        )
                      })()}
                    </div>
                    {s.entry?.parentFeedback && (
                      <div style={{ marginTop: '2px' }}>
                        <StarRating value={s.entry.parentFeedback.rating} size={12} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Batch create button */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button
            style={{ ...btnStyle('primary', batchCreating || !selectedCourseId), width: '100%' }}
            disabled={batchCreating || !selectedCourseId}
            onClick={() => void batchCreate()}
          >
            {batchCreating ? '建立中...' : '批次建立今日聯絡簿'}
          </button>
        </div>
      </aside>

      {/* ── Right Main Area ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>

        {/* Mobile top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
          >
            &#9776;
          </button>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {selectedStudent ? selectedStudent.name : '選取學生'}
          </span>
        </div>

        {/* Empty state */}
        {!selectedStudent && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#128203;</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>請從左側選取學生以編輯聯絡簿</p>
            </div>
          </div>
        )}

        {/* Entry form */}
        {selectedStudent && (
          <div style={{ flex: 1, padding: '16px', maxWidth: '768px', margin: '0 auto', width: '100%', paddingBottom: '80px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{selectedStudent.name}</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{selectedDate}</p>
                {savingEntry && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>儲存中...</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button style={btnStyle('secondary')} onClick={handlePrint}>
                  列印
                </button>
                <button style={btnStyle('secondary')} onClick={() => setPreviewModalOpen(true)}>
                  預覽家長版
                </button>
                <button
                  style={btnStyle('primary', sendingEntry || !selectedStudent.entry)}
                  disabled={sendingEntry || !selectedStudent.entry}
                  onClick={() => setSendConfirmOpen(true)}
                >
                  {sendingEntry ? '發送中...' : '正式發送'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Section 1: 全班集體進度 & 作業 */}
              <SectionCard
                icon="&#128200;"
                title="全班集體進度 & 作業"
                hint="所有學生聯絡簿將預設帶入此內容"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>今日團體課程進度</label>
                    <TextArea placeholder="今天上課到哪裡..." value={groupProgress} onChange={setGroupProgress} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>全體共同作業</label>
                    <TextArea placeholder="回家作業、複習範圍..." value={groupHomework} onChange={setGroupHomework} />
                  </div>
                </div>
              </SectionCard>

              {/* Section 2: 個別指導與加強 */}
              <SectionCard icon="&#127919;" title="個別指導與加強">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>個別學習說明</label>
                    <TextArea
                      placeholder={`針對 ${selectedStudent.name} 的個別進度說明...`}
                      value={individualProgress}
                      onChange={setIndividualProgress}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>個別專屬作業</label>
                    <TextArea placeholder="針對個人弱點的補強作業..." value={individualHomework} onChange={setIndividualHomework} />
                  </div>
                  <button
                    style={btnStyle('secondary', aiLoading)}
                    disabled={aiLoading}
                    onClick={() => void generateAiAnalysis()}
                  >
                    {aiLoading ? '分析中...' : '載入歷史弱點建議'}
                  </button>
                </div>
              </SectionCard>

              {/* Section 3: 考試成績 */}
              <SectionCard
                icon="&#128202;"
                title="今日考試成績錄入"
                hint="填寫完成後將同步更新至成績管理中心"
              >
                {/* Existing scores */}
                {examScores.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {examScores.map((sc, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--background)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px',
                      }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{sc.subject}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{sc.score} 分</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>均 {sc.classAvg}</span>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', marginLeft: '4px' }}
                          onClick={() => removeExamScore(i)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add score row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="科目"
                    value={newExamSubject}
                    onChange={(e) => setNewExamSubject(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: '80px' }}
                  />
                  <input
                    type="number"
                    placeholder="分數"
                    value={newExamScore}
                    onChange={(e) => setNewExamScore(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ ...inputStyle, width: '80px', flex: 'none' }}
                  />
                  <input
                    type="number"
                    placeholder="班平均"
                    value={newExamClassAvg}
                    onChange={(e) => setNewExamClassAvg(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ ...inputStyle, width: '96px', flex: 'none' }}
                  />
                  <button
                    onClick={addExamScore}
                    disabled={!newExamSubject.trim() || newExamScore === '' || newExamClassAvg === ''}
                    style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: 'var(--primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 'bold', border: 'none',
                      cursor: (!newExamSubject.trim() || newExamScore === '' || newExamClassAvg === '') ? 'not-allowed' : 'pointer',
                      opacity: (!newExamSubject.trim() || newExamScore === '' || newExamClassAvg === '') ? 0.4 : 1,
                    }}
                  >
                    +
                  </button>
                </div>
              </SectionCard>

              {/* Section 4: 親師通訊小叮嚀 */}
              <SectionCard icon="&#128161;" title="親師通訊小叮嚀">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>老師小叮嚀</span>
                  <button
                    type="button"
                    onClick={() => { setAiWritingOpen(!aiWritingOpen); setAiResult('') }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: '#F3E8FF', color: '#7C3AED',
                      borderRadius: '8px', padding: '4px 12px', fontSize: '14px',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    AI 助寫
                  </button>
                </div>
                {aiWritingOpen && (
                  <div style={{
                    marginBottom: '12px', borderRadius: '8px',
                    border: '1px solid #DDD6FE', background: '#FAF5FF',
                    padding: '12px',
                  }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: aiResult ? '12px' : 0 }}>
                      <input
                        type="text"
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void generateAiWriting() }}
                        placeholder="輸入關鍵字，如：數學進步 作業遲交 態度積極"
                        style={{ ...inputStyle, flex: 1, border: '1px solid #DDD6FE', background: 'white' }}
                      />
                      <button
                        type="button"
                        onClick={() => void generateAiWriting()}
                        disabled={!aiKeywords.trim() || aiWritingLoading}
                        style={{
                          ...btnStyle('accent', !aiKeywords.trim() || aiWritingLoading),
                          background: '#7C3AED', padding: '8px 12px',
                        }}
                      >
                        {aiWritingLoading ? '...' : '生成'}
                      </button>
                    </div>
                    {aiResult && (
                      <div>
                        <p style={{
                          fontSize: '14px', color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap', borderRadius: '8px',
                          background: 'white', border: '1px solid #EDE9FE', padding: '12px',
                          marginBottom: '8px',
                        }}>
                          {aiResult}
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTeacherNote((prev) => prev ? `${prev}\n\n${aiResult}` : aiResult)
                              setAiWritingOpen(false)
                              setAiKeywords('')
                              setAiResult('')
                              showToast('已採用 AI 建議文字', 'success')
                            }}
                            style={{ ...btnStyle('accent'), background: 'var(--primary)' }}
                          >
                            採用
                          </button>
                          <button
                            type="button"
                            onClick={() => void generateAiWriting()}
                            disabled={aiWritingLoading}
                            style={{
                              padding: '6px 12px', borderRadius: '8px',
                              border: '1px solid #DDD6FE', background: 'white',
                              fontSize: '14px', color: '#7C3AED', cursor: 'pointer',
                              opacity: aiWritingLoading ? 0.4 : 1,
                            }}
                          >
                            重新生成
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <TextArea placeholder="想對家長說的話..." value={teacherNote} onChange={setTeacherNote} rows={4} />
              </SectionCard>

              {/* Section 5: 今日學習剪影 */}
              <SectionCard icon="&#128248;" title="今日學習剪影">
                {/* Upload area */}
                {photos.length < 5 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '12px', padding: '24px', textAlign: 'center',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                      background: isDragOver ? 'rgba(107,140,174,0.05)' : 'transparent',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          void uploadPhotos(e.target.files)
                        }
                      }}
                    />
                    {uploadingPhoto ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>上傳中...</div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '30px', marginBottom: '4px' }}>&#128193;</div>
                        <p style={{ fontSize: '14px', margin: '4px 0' }}>拖曳或點擊上傳照片</p>
                        <p style={{ fontSize: '12px', margin: 0 }}>最多 5 張（剩餘 {5 - photos.length} 張）</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Photo grid */}
                {photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                    {photos.map((photo) => (
                      <div key={photo.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: '#E8E4DF' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => void deletePhoto(photo.id)}
                          style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)', color: 'white',
                            fontSize: '12px', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Section 6: AI 智能分析建議 */}
              <SectionCard icon="&#129302;" title="AI 智能分析建議">
                {!aiAnalysis && !aiLoading && (
                  <button style={btnStyle('secondary')} onClick={() => void generateAiAnalysis()}>
                    生成 AI 分析
                  </button>
                )}
                {aiLoading && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>分析中...</div>
                )}
                {aiAnalysis && !aiLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#E8F0E4', borderRadius: '8px', padding: '12px 16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#7B9E89', marginBottom: '4px' }}>弱點摘要</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{aiAnalysis.weakSummary}</p>
                    </div>
                    {aiAnalysis.recommendations.length > 0 && (
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>推薦加強項目</p>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {aiAnalysis.recommendations.map((r, i) => (
                            <li key={i} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                      style={btnStyle('secondary')}
                      onClick={() => {
                        const combined = [aiAnalysis.weakSummary, ...aiAnalysis.recommendations].join('\n')
                        setTeacherNote((prev) => prev ? `${prev}\n\n${combined}` : combined)
                        showToast('已加入聯絡簿推薦項目', 'success')
                      }}
                    >
                      加入聯絡簿推薦項目
                    </button>
                  </div>
                )}
              </SectionCard>

              {/* Section 7: 最新家長反饋 */}
              {selectedStudent.entry?.parentFeedback && (
                <SectionCard icon="&#128172;" title="最新家長反饋">
                  <div style={{ background: 'var(--background)', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <StarRating value={selectedStudent.entry.parentFeedback.rating} size={16} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(selectedStudent.entry.parentFeedback.createdAt).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                    {selectedStudent.entry.parentFeedback.comment && (
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{selectedStudent.entry.parentFeedback.comment}</p>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Manual save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '16px' }}>
                <button
                  style={btnStyle('primary', savingEntry)}
                  disabled={savingEntry}
                  onClick={() => void saveEntry(true)}
                >
                  {savingEntry ? '儲存中...' : '手動儲存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Class Progress Modal ── */}
      <ModalOverlay
        isOpen={classProgressModalOpen}
        onClose={() => setClassProgressModalOpen(false)}
        title="班級進度設定"
        wide
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>設定後將套用到所有學生的聯絡簿</p>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>今日團體課程進度</label>
            <textarea
              rows={4}
              value={modalGroupProgress}
              onChange={(e) => setModalGroupProgress(e.target.value)}
              placeholder="今天全班上課到哪裡..."
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>全體共同作業</label>
            <textarea
              rows={4}
              value={modalGroupHomework}
              onChange={(e) => setModalGroupHomework(e.target.value)}
              placeholder="全體回家作業、複習範圍..."
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button style={btnStyle('secondary')} onClick={() => setClassProgressModalOpen(false)}>
              取消
            </button>
            <button style={btnStyle('primary')} onClick={() => void saveClassProgress()}>
              儲存並套用到所有學生
            </button>
          </div>
        </div>
      </ModalOverlay>

      {/* ── Preview Modal (Parent view) ── */}
      <ModalOverlay
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={`家長版預覽 — ${selectedStudent?.name ?? ''}`}
        wide
      >
        {selectedStudent && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Header card */}
            <div style={{
              background: 'linear-gradient(135deg, #E8F0E4, #DDE8F0)',
              borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 'bold', background: avatarBg(selectedStudent.name), color: 'white',
              }}>
                {selectedStudent.name.charAt(0)}
              </div>
              <h3 style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 4px' }}>{selectedStudent.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{selectedDate} 學習日報</p>
            </div>

            {/* Exam scores */}
            {examScores.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>今日學習成就</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {examScores.map((sc, i) => (
                    <div key={i} style={{ background: 'var(--background)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{sc.subject}</p>
                      <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', margin: '0 0 4px' }}>{sc.score}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>班級平均 {sc.classAvg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {(groupProgress || individualProgress) && (
              <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>今日課表與進度</h4>
                {groupProgress && (
                  <div style={{ marginBottom: individualProgress ? '12px' : 0 }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>全班課程進度</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{groupProgress}</p>
                  </div>
                )}
                {individualProgress && (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>個別學習說明</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{individualProgress}</p>
                  </div>
                )}
              </div>
            )}

            {/* Homework */}
            {(groupHomework || individualHomework) && (
              <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>今日作業</h4>
                {groupHomework && (
                  <div style={{ marginBottom: individualHomework ? '12px' : 0 }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>共同作業</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{groupHomework}</p>
                  </div>
                )}
                {individualHomework && (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>個別作業</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{individualHomework}</p>
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>學習剪影</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {photos.map((photo) => (
                    <div key={photo.id} style={{ borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher note */}
            {teacherNote && (
              <div style={{ background: '#FDF6ED', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: '#C4956A', marginBottom: '8px', fontSize: '15px' }}>老師的小叮嚀</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{teacherNote}</p>
              </div>
            )}

            {/* AI recommendations */}
            {aiAnalysis && (
              <div style={{ background: '#E8F0E4', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontWeight: 600, color: '#7B9E89', marginBottom: '8px', fontSize: '15px' }}>AI 學習建議</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>{aiAnalysis.weakSummary}</p>
                {aiAnalysis.recommendations.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {aiAnalysis.recommendations.map((r, i) => (
                      <li key={i} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </ModalOverlay>

      {/* ── Send Confirm Modal ── */}
      <ModalOverlay
        isOpen={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        title="確認發送"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
            確定要正式發送 <strong>{selectedStudent?.name}</strong> 的聯絡簿給家長嗎？發送後家長即可查看。
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button style={btnStyle('secondary')} onClick={() => setSendConfirmOpen(false)}>
              取消
            </button>
            <button
              style={btnStyle('primary', sendingEntry)}
              disabled={sendingEntry}
              onClick={() => void sendEntry()}
            >
              {sendingEntry ? '發送中...' : '確認發送'}
            </button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  )
}

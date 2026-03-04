'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Rating } from '@/components/ui/Rating'
import ToastContainer from '@/components/ui/ToastContainer'
import { useToast } from '@/hooks/useToast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudentOption {
  id: string
  name: string
}

interface ScoreSummary {
  subject: string
  score: number
}

interface ContactBookEntry {
  id: string
  entryDate: string
  status: string
  isRead: boolean
  readAt: string | null
  sentAt: string | null
  courseId: string
  courseName: string
  groupProgress: string | null
  groupHomework: string | null
  individualNote: string | null
  individualHomework: string | null
  teacherTip: string | null
  scores: ScoreSummary[]
}

interface ScoreDetail {
  id: string
  subject: string
  score: number
  classAvg: number | null
  fullScore: number
}

interface Photo {
  id: string
  url: string
  caption: string | null
  sortOrder: number
}

interface Feedback {
  id: string
  parentUserId: string
  rating: number
  comment: string | null
  createdAt: string
}

interface AiAnalysis {
  id: string
  weaknessSummary: string
  recommendedCourseName: string | null
  recommendedCourseDesc: string | null
  createdAt: string
}

interface ContactBookDetail extends ContactBookEntry {
  scores: ScoreDetail[]
  photos: Photo[]
  feedbacks: Feedback[]
  aiAnalysis: AiAnalysis | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-border p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-surface-hover rounded-lg" />
            <div className="h-5 w-14 bg-surface-hover rounded-full" />
          </div>
          <div className="h-4 w-40 bg-surface-hover rounded-lg" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-surface-hover rounded-full" />
            <div className="h-6 w-16 bg-surface-hover rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score color helper
// ---------------------------------------------------------------------------

function scoreColor(score: number, fullScore: number): string {
  const pct = fullScore > 0 ? score / fullScore : 0
  if (pct >= 0.9) return 'text-emerald-600'
  if (pct >= 0.7) return 'text-morandi-sage'
  if (pct >= 0.6) return 'text-morandi-gold'
  return 'text-morandi-rose'
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-muted uppercase tracking-wide">
        <span>{icon}</span>
        {title}
      </h3>
      <div>{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail Modal content
// ---------------------------------------------------------------------------

interface DetailContentProps {
  entry: ContactBookDetail
  onFeedbackSubmit: (entryId: string, rating: number, comment: string) => Promise<void>
}

function DetailContent({ entry, onFeedbackSubmit }: DetailContentProps) {
  const myFeedback = entry.feedbacks[0] ?? null
  const [rating, setRating] = useState<number>(myFeedback?.rating ?? 0)
  const [comment, setComment] = useState<string>(myFeedback?.comment ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)

  const handleSubmitFeedback = async () => {
    if (rating === 0) return
    setSubmitting(true)
    try {
      await onFeedbackSubmit(entry.id, rating, comment)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {/* Header info */}
      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
        <span>上課日期：{entry.entryDate.slice(0, 10)}</span>
        {entry.readAt && <span>已讀：{new Date(entry.readAt).toLocaleString('zh-TW')}</span>}
        {entry.sentAt && <span>送出：{new Date(entry.sentAt).toLocaleString('zh-TW')}</span>}
      </div>

      {/* Group progress */}
      {(entry.groupProgress || entry.groupHomework) && (
        <Section title="全班進度" icon="📋">
          {entry.groupProgress && (
            <p className="text-text whitespace-pre-wrap leading-relaxed">{entry.groupProgress}</p>
          )}
          {entry.groupHomework && (
            <div className="mt-2 p-3 bg-morandi-blue/10 rounded-xl border border-morandi-blue/20">
              <span className="font-medium text-text-muted text-xs">全班作業：</span>
              <p className="text-text mt-0.5 whitespace-pre-wrap">{entry.groupHomework}</p>
            </div>
          )}
        </Section>
      )}

      {/* Individual */}
      {(entry.individualNote || entry.individualHomework) && (
        <Section title="個別輔導" icon="👤">
          {entry.individualNote && (
            <p className="text-text whitespace-pre-wrap leading-relaxed">{entry.individualNote}</p>
          )}
          {entry.individualHomework && (
            <div className="mt-2 p-3 bg-morandi-sage/10 rounded-xl border border-morandi-sage/20">
              <span className="font-medium text-text-muted text-xs">個別作業：</span>
              <p className="text-text mt-0.5 whitespace-pre-wrap">{entry.individualHomework}</p>
            </div>
          )}
        </Section>
      )}

      {/* Scores */}
      {entry.scores.length > 0 && (
        <Section title="考試成績" icon="📊">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-text-muted font-medium">科目</th>
                  <th className="py-2 text-right text-text-muted font-medium">分數</th>
                  <th className="py-2 text-right text-text-muted font-medium">班級平均</th>
                  <th className="py-2 text-right text-text-muted font-medium">滿分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entry.scores.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 text-text">{s.subject}</td>
                    <td className={`py-2 text-right font-bold ${scoreColor(s.score, s.fullScore)}`}>
                      {s.score}
                    </td>
                    <td className="py-2 text-right text-text-muted">
                      {s.classAvg != null ? s.classAvg.toFixed(1) : '—'}
                    </td>
                    <td className="py-2 text-right text-text-muted">{s.fullScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Teacher tip */}
      {entry.teacherTip && (
        <Section title="老師叮嚀" icon="📌">
          <div className="p-3 bg-morandi-gold/10 border-l-4 border-morandi-gold rounded-r-xl">
            <p className="text-text whitespace-pre-wrap leading-relaxed">{entry.teacherTip}</p>
          </div>
        </Section>
      )}

      {/* Photos */}
      {entry.photos.length > 0 && (
        <Section title="課堂照片" icon="🖼️">
          <div className="grid grid-cols-3 gap-2">
            {entry.photos
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo)}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? '課堂照片'}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
          </div>
        </Section>
      )}

      {/* AI Analysis */}
      {entry.aiAnalysis && (
        <Section title="AI 學習分析" icon="🤖">
          <div className="space-y-3">
            <div className="p-3 bg-surface-hover rounded-xl">
              <p className="text-xs font-medium text-text-muted mb-1">弱點摘要</p>
              <p className="text-text whitespace-pre-wrap">{entry.aiAnalysis.weaknessSummary}</p>
            </div>
            {(entry.aiAnalysis.recommendedCourseName || entry.aiAnalysis.recommendedCourseDesc) && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs font-medium text-primary mb-1">推薦課程</p>
                {entry.aiAnalysis.recommendedCourseName && (
                  <p className="font-semibold text-text">{entry.aiAnalysis.recommendedCourseName}</p>
                )}
                {entry.aiAnalysis.recommendedCourseDesc && (
                  <p className="text-text-muted mt-0.5">{entry.aiAnalysis.recommendedCourseDesc}</p>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Feedback */}
      <Section title="我的回饋" icon="💬">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-xs">評分：</span>
            <Rating value={rating} onChange={setRating} size="md" />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="留下您的留言（選填）"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-text-muted"
          />
          <button
            onClick={handleSubmitFeedback}
            disabled={rating === 0 || submitting}
            className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中…' : myFeedback ? '更新回饋' : '提交回饋'}
          </button>
        </div>
      </Section>

      {/* Photo lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption ?? '照片'}
              className="w-full rounded-2xl"
            />
            {lightboxPhoto.caption && (
              <p className="text-white text-center text-sm mt-2">{lightboxPhoto.caption}</p>
            )}
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-text flex items-center justify-center text-lg shadow"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ContactBookPage() {
  const { toasts, removeToast, success, error: toastError } = useToast()

  // Students
  const [students, setStudents] = useState<StudentOption[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')

  // List
  const [entries, setEntries] = useState<ContactBookEntry[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Detail modal
  const [detailEntry, setDetailEntry] = useState<ContactBookDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Load students
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/students?limit=100', { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        const list: Array<{ id: string; name: string }> = json.data?.students ?? json.students ?? []
        setStudents(list.map((s) => ({ id: s.id, name: s.name })))
        if (list.length > 0) setSelectedStudentId(list[0].id)
      } catch {
        // silent – student list failure is non-critical
      }
    }
    load()
  }, [])

  // ---------------------------------------------------------------------------
  // Load contact book list
  // ---------------------------------------------------------------------------

  const loadList = useCallback(async (studentId: string, newOffset: number, append: boolean) => {
    if (!studentId) return
    if (append) setLoadingMore(true)
    else { setListLoading(true); setListError(null) }

    try {
      const res = await fetch(
        `/api/parent/contact-book?studentId=${studentId}&limit=${PAGE_SIZE}&offset=${newOffset}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      const data: ContactBookEntry[] = json.data ?? []
      if (append) {
        setEntries((prev) => [...prev, ...data])
      } else {
        setEntries(data)
      }
      setOffset(newOffset + data.length)
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      setListError(err instanceof Error ? err.message : '載入聯絡簿失敗')
    } finally {
      setListLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedStudentId) return
    setOffset(0)
    setEntries([])
    loadList(selectedStudentId, 0, false)
  }, [selectedStudentId, loadList])

  // ---------------------------------------------------------------------------
  // Open detail
  // ---------------------------------------------------------------------------

  const openDetail = async (entryId: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailEntry(null)
    try {
      const res = await fetch(`/api/parent/contact-book/${entryId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('載入詳細資料失敗')
      const json = await res.json()
      setDetailEntry(json.data)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '載入失敗')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Submit feedback
  // ---------------------------------------------------------------------------

  const handleFeedbackSubmit = async (entryId: string, rating: number, comment: string) => {
    try {
      const res = await fetch(`/api/parent/contact-book/${entryId}/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      })
      if (!res.ok) throw new Error('提交回饋失敗')
      success('回饋已送出！')
      // Refresh detail to show updated feedback
      const detailRes = await fetch(`/api/parent/contact-book/${entryId}`, { credentials: 'include' })
      if (detailRes.ok) {
        const json = await detailRes.json()
        setDetailEntry(json.data)
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : '提交失敗，請稍後再試')
      throw err
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 pb-12">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-center" />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text">電子聯絡簿</h1>
        <p className="text-text-muted mt-1 text-sm">查看孩子的上課紀錄與老師回饋</p>
      </div>

      {/* Student selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="student-select" className="text-sm font-medium text-text-muted whitespace-nowrap">
          選擇學生
        </label>
        <select
          id="student-select"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {students.length === 0 && (
            <option value="">載入中…</option>
          )}
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* List area */}
      {listLoading ? (
        <ListSkeleton />
      ) : listError ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-text font-semibold">載入失敗</p>
          <p className="text-text-muted text-sm">{listError}</p>
          <button
            onClick={() => loadList(selectedStudentId, 0, false)}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            重試
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <div className="text-6xl">📖</div>
          <p className="text-text font-semibold">尚無聯絡簿紀錄</p>
          <p className="text-text-muted text-sm">老師送出聯絡簿後將在此顯示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => openDetail(entry.id)}
              className="w-full text-left bg-surface rounded-2xl border border-border p-4 space-y-2.5 hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-muted">{entry.entryDate.slice(0, 10)}</span>
                <Badge variant={entry.isRead ? 'success' : 'warning'} size="sm">
                  {entry.isRead ? '已讀' : '未讀'}
                </Badge>
              </div>

              {/* Course name */}
              <p className="font-semibold text-text leading-snug">{entry.courseName}</p>

              {/* Score chips */}
              {entry.scores.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.scores.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-hover border border-border text-xs text-text"
                    >
                      <span className="text-text-muted">{s.subject}</span>
                      <span className="font-semibold text-primary">{s.score}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Sent time */}
              {entry.sentAt && (
                <p className="text-xs text-text-muted">
                  {new Date(entry.sentAt).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
              )}
            </button>
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => loadList(selectedStudentId, offset, true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-2xl border border-border bg-surface text-sm text-text-muted hover:text-text hover:border-primary/30 transition-colors disabled:opacity-50"
            >
              {loadingMore ? '載入中…' : '載入更多'}
            </button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detailEntry ? `${detailEntry.courseName}｜${detailEntry.entryDate.slice(0, 10)}` : '聯絡簿詳情'}
        size="xl"
      >
        {detailLoading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-hover rounded-xl animate-pulse" />
            ))}
          </div>
        ) : detailEntry ? (
          <div className="max-h-[70vh] overflow-y-auto -mx-6 px-6">
            <DetailContent entry={detailEntry} onFeedbackSubmit={handleFeedbackSubmit} />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

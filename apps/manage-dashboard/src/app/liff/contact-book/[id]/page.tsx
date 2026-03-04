'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useToastContext } from '@/components/ui/ToastProvider'
import { Spinner } from '@/components/ui/Spinner'
import { Rating } from '@/components/ui/Rating'

// LIFF type declarations (loaded via CDN)
declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>
      isLoggedIn: () => boolean
      login: () => void
      getAccessToken: () => string | null
    }
  }
}

interface ScoreItem {
  id: string
  subject: string
  score: number
  classAvg: number
  fullScore: number
}

interface PhotoItem {
  id: string
  url: string
  caption: string | null
  sortOrder: number
}

interface FeedbackItem {
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

interface ContactBookEntry {
  id: string
  tenantId: string
  studentId: string
  courseId: string
  entryDate: string
  status: string
  groupProgress: string | null
  groupHomework: string | null
  individualNote: string | null
  individualHomework: string | null
  teacherTip: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
  courseName: string
  isRead: boolean
  scores: ScoreItem[]
  photos: PhotoItem[]
  feedbacks: FeedbackItem[]
  aiAnalysis: AiAnalysis | null
}

type PageState = 'loading' | 'error' | 'ready'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

function ScoreColor({ score, classAvg, fullScore }: { score: number; classAvg: number; fullScore: number }) {
  const ratio = score / fullScore
  let colorClass = 'text-green-600'
  if (ratio < 0.6) colorClass = 'text-red-500'
  else if (ratio < 0.75) colorClass = 'text-yellow-600'

  const aboveAvg = score >= classAvg

  return (
    <span className={`font-bold ${colorClass}`}>
      {score}
      {aboveAvg ? (
        <span className="ml-1 text-xs text-green-500">▲</span>
      ) : (
        <span className="ml-1 text-xs text-red-400">▼</span>
      )}
    </span>
  )
}

function PhotoModal({ url, caption, onClose }: { url: string; caption: string | null; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-3xl leading-none"
        onClick={onClose}
        aria-label="關閉"
      >
        ×
      </button>
      <img
        src={url}
        alt={caption ?? '課堂照片'}
        className="max-w-full max-h-[80vh] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {caption && (
        <p className="mt-3 text-white text-sm text-center">{caption}</p>
      )}
    </div>
  )
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${className}`}>
      <h3 className="text-base font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function TextBlock({ label, content }: { label: string; content: string | null }) {
  if (!content) return null
  return (
    <div className="mb-2 last:mb-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

export default function ContactBookLiffPage() {
  const params = useParams()
  const entryId = params.id as string
  const toast = useToastContext()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [entry, setEntry] = useState<ContactBookEntry | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Feedback state
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState<FeedbackItem | null>(null)

  // Photo modal
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)

  // Load LIFF SDK and initialize
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? ''

    function loadLiff() {
      return new Promise<void>((resolve, reject) => {
        if (window.liff) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = 'https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js'
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('LIFF SDK 載入失敗'))
        document.head.appendChild(script)
      })
    }

    async function initLiff() {
      try {
        await loadLiff()
        await window.liff.init({ liffId })
        if (!window.liff.isLoggedIn()) {
          window.liff.login()
          return
        }
        const token = window.liff.getAccessToken()
        setAccessToken(token)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'LIFF 初始化失敗')
        setPageState('error')
      }
    }

    initLiff()
  }, [])

  // Fetch entry data once we have accessToken
  const fetchEntry = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/line/contact-book/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message ?? '載入失敗')
      }
      const body = await res.json() as { success: boolean; data: ContactBookEntry }
      const data = body.data
      setEntry(data)

      // Pre-fill feedback if parent already submitted one
      if (data.feedbacks.length > 0) {
        const fb = data.feedbacks[0]
        setExistingFeedback(fb)
        setRating(fb.rating)
        setComment(fb.comment ?? '')
      }

      setPageState('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '載入失敗')
      setPageState('error')
    }
  }, [entryId])

  useEffect(() => {
    if (accessToken) {
      fetchEntry(accessToken)
    }
  }, [accessToken, fetchEntry])

  const handleSubmitFeedback = async () => {
    if (!accessToken || rating === 0) {
      toast.warning('請先選擇星級評分')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/line/contact-book/${entryId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message ?? '提交失敗')
      }
      toast.success(existingFeedback ? '回饋已更新' : '回饋已送出，謝謝您！')
      setExistingFeedback({ id: '', parentUserId: '', rating, comment: comment.trim() || null, createdAt: new Date().toISOString() })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading screen
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Spinner size="lg" color="border-blue-400" />
        <p className="text-gray-400 text-sm">載入中...</p>
      </div>
    )
  }

  // Error screen
  if (pageState === 'error' || !entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center gap-4">
        <div className="text-5xl">😔</div>
        <h2 className="text-lg font-semibold text-gray-700">無法載入聯絡簿</h2>
        <p className="text-sm text-gray-400">{errorMsg || '請關閉後重新開啟連結'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-48">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">{entry.courseName}</h1>
        <p className="mt-1 text-sm text-gray-400">{formatDate(entry.entryDate)}</p>
        {entry.isRead && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
            已讀
          </span>
        )}
      </div>

      {/* Content cards */}
      <div className="px-4 pt-4 space-y-4">

        {/* Group progress + homework */}
        {(entry.groupProgress || entry.groupHomework) && (
          <Card title="📚 全班進度">
            <TextBlock label="課程進度" content={entry.groupProgress} />
            <TextBlock label="全班作業" content={entry.groupHomework} />
          </Card>
        )}

        {/* Individual note + homework */}
        {(entry.individualNote || entry.individualHomework) && (
          <Card title="📝 個別輔導">
            <TextBlock label="輔導重點" content={entry.individualNote} />
            <TextBlock label="個別作業" content={entry.individualHomework} />
          </Card>
        )}

        {/* Scores */}
        {entry.scores.length > 0 && (
          <Card title="📊 考試成績">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 font-medium">科目</th>
                    <th className="text-right py-2 font-medium">得分</th>
                    <th className="text-right py-2 font-medium">班平均</th>
                    <th className="text-right py-2 font-medium">滿分</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.scores.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-gray-700">{s.subject}</td>
                      <td className="py-2.5 text-right">
                        <ScoreColor score={s.score} classAvg={s.classAvg} fullScore={s.fullScore} />
                      </td>
                      <td className="py-2.5 text-right text-gray-400">{s.classAvg}</td>
                      <td className="py-2.5 text-right text-gray-400">{s.fullScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Teacher tip */}
        {entry.teacherTip && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="text-base font-semibold text-amber-700 mb-2">💡 老師叮嚀</h3>
            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{entry.teacherTip}</p>
          </div>
        )}

        {/* Photos */}
        {entry.photos.length > 0 && (
          <Card title="📷 課堂照片">
            <div className="grid grid-cols-3 gap-2">
              {entry.photos
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                    aria-label={photo.caption ?? '查看照片'}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption ?? '課堂照片'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
            </div>
          </Card>
        )}

        {/* AI Analysis */}
        {entry.aiAnalysis && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="text-base font-semibold text-blue-700 mb-2">🤖 AI 學習分析</h3>
            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap mb-3">
              {entry.aiAnalysis.weaknessSummary}
            </p>
            {entry.aiAnalysis.recommendedCourseName && (
              <div className="bg-white/70 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">推薦加強課程</p>
                <p className="text-sm font-medium text-blue-800">{entry.aiAnalysis.recommendedCourseName}</p>
                {entry.aiAnalysis.recommendedCourseDesc && (
                  <p className="text-xs text-blue-600 mt-1">{entry.aiAnalysis.recommendedCourseDesc}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom feedback area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 pt-3 pb-safe">
        <div className="pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            {existingFeedback ? '更新回饋' : '送出回饋'}
          </p>

          {/* Star rating */}
          <div className="flex items-center gap-2 mb-3">
            <Rating
              value={rating}
              onChange={setRating}
              size="lg"
              color="text-yellow-400"
              emptyColor="text-gray-200"
            />
            {rating > 0 && (
              <span className="text-sm text-gray-500">
                {['', '有待加強', '還可以', '不錯喔', '很滿意', '非常棒！'][rating]}
              </span>
            )}
          </div>

          {/* Comment input */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="留言給老師（選填）..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[60px]"
            rows={2}
          />

          {/* Submit button */}
          <button
            onClick={handleSubmitFeedback}
            disabled={submitting || rating === 0}
            className="mt-2 w-full min-h-12 rounded-xl bg-blue-500 text-white font-semibold text-sm
              disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
              active:bg-blue-600 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" color="border-white" />
                送出中...
              </span>
            ) : existingFeedback ? (
              '更新回饋'
            ) : (
              '提交回饋'
            )}
          </button>
        </div>
      </div>

      {/* Photo modal */}
      {selectedPhoto && (
        <PhotoModal
          url={selectedPhoto.url}
          caption={selectedPhoto.caption}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  )
}

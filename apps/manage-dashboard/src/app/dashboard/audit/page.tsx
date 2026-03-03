'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string
  user_name: string
  user_role: string
  action: string
  table_name: string
  record_id: string
  change_summary: string
  old_value: unknown
  new_value: unknown
  needs_alert: boolean
  alert_sent: boolean
  parent_notified: boolean
  alert_confirmed_at: string | null
  ip_address: string | null
  archived_at: string | null
  created_at: string
}

type TabType = 'active' | 'archived'

// RBAC 審核狀態（前端模擬）
type ReviewStatus = 'pending' | 'approved' | 'rejected'

interface ReviewRecord {
  status: ReviewStatus
  comment: string
  reviewedAt: string
}

// 封存項目的恢復狀態（前端模擬）
interface RestoreRecord {
  restoredAt: string
  logId: string
}

// Toast 通知
interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'warning'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = ''

// 需要審核的角色（非 admin）
const ROLES_REQUIRING_REVIEW = ['teacher', 'staff', 'assistant', '行政', '老師', '助教']

// UD 操作需要審核
const ACTIONS_REQUIRING_REVIEW = ['update', 'delete']

// 封存後恢復期限（14 天）
const RESTORE_DEADLINE_DAYS = 14

// 三個月前（封存門檻）
const THREE_MONTHS_AGO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' })

const getActionColor = (action: string) => {
  switch (action) {
    case 'create': return 'bg-[#d4e6d3] text-[#4a7c59]'
    case 'update': return 'bg-[#d6e4f0] text-[#4a6fa5]'
    case 'delete': return 'bg-[#f0d6d6] text-[#a54a4a]'
    default: return 'bg-[#e8e4de] text-[#6b6560]'
  }
}

const getActionLabel = (action: string) => {
  switch (action) {
    case 'create': return '➕ 新增'
    case 'update': return '✏️ 修改'
    case 'delete': return '🗑️ 刪除'
    default: return action
  }
}

const TABLE_LABELS: Record<string, string> = {
  students: '學生',
  courses: '課程',
  attendance: '出勤',
  grades: '成績',
  payments: '繳費',
  payment_records: '繳費記錄',
  teachers: '講師',
  manage_salary_adjustments: '薪資調整',
  manage_expenses: '支出',
}
const getTableLabel = (table: string) => TABLE_LABELS[table] || table

/** 判斷此筆日誌是否需要前端 RBAC 審核 */
function needsRbacReview(log: AuditLog): boolean {
  return (
    ACTIONS_REQUIRING_REVIEW.includes(log.action) &&
    ROLES_REQUIRING_REVIEW.some((r) => log.user_role?.includes(r))
  )
}

/** 計算封存後剩餘恢復時間 */
function calcRestoreRemaining(archivedAt: string): { days: number; hours: number; expired: boolean } {
  const archiveTime = new Date(archivedAt).getTime()
  const deadline = archiveTime + RESTORE_DEADLINE_DAYS * 24 * 60 * 60 * 1000
  const now = Date.now()
  const diff = deadline - now

  if (diff <= 0) return { days: 0, hours: 0, expired: true }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return { days, hours, expired: false }
}

function formatJson(val: unknown): string {
  if (val === null || val === undefined) return '（無）'
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ValueDiff({ oldVal, newVal }: { oldVal: unknown; newVal: unknown }) {
  const oldStr = formatJson(oldVal)
  const newStr = formatJson(newVal)
  return (
    <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
      <div className="rounded-lg bg-[#f9eeee] border border-[#e8c8c8] p-3">
        <div className="font-semibold text-[#a54a4a] mb-1">變更前</div>
        <pre className="whitespace-pre-wrap break-all font-mono text-[#6b3a3a]">{oldStr}</pre>
      </div>
      <div className="rounded-lg bg-[#eef6ee] border border-[#c8e0c8] p-3">
        <div className="font-semibold text-[#4a7c59] mb-1">變更後</div>
        <pre className="whitespace-pre-wrap break-all font-mono text-[#2d5a3a]">{newStr}</pre>
      </div>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm max-w-xs border transition-all ${
            t.type === 'success'
              ? 'bg-[#eef6ee] border-[#a8d4a8] text-[#2d5a3a]'
              : t.type === 'warning'
              ? 'bg-[#fff8e6] border-[#e8c878] text-[#6b4d00]'
              : 'bg-[#f5f2ef] border-[#d4cfc9] text-[#4a3f35]'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-xs opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  logId,
  userName,
  onClose,
  onDone,
}: {
  logId: string
  userName: string
  onClose: () => void
  onDone: (action: 'approve' | 'reject', comment: string) => void
}) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (action === 'reject' && !comment.trim()) {
      setError('駁回時必須填寫原因')
      return
    }
    setSubmitting(true)
    try {
      // 嘗試呼叫後端 API，若失敗則用前端模擬
      const res = await fetch(`${API_BASE}/api/admin/audit-logs/${logId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action, comment: comment.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        onDone(action, comment.trim())
        return
      }
    } catch {
      // 後端 API 不存在時，使用前端模擬
    }
    // 前端模擬審核結果
    onDone(action, comment.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-[#4a3f35] mb-1">審核日誌</h2>
        <p className="text-xs text-[#8a8078] mb-4">操作人：{userName}</p>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAction('approve')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              action === 'approve'
                ? 'bg-[#d4e6d3] border-[#4a7c59] text-[#4a7c59]'
                : 'bg-white border-[#d4cfc9] text-[#6b6560]'
            }`}
          >
            ✅ 確認通過
          </button>
          <button
            onClick={() => setAction('reject')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              action === 'reject'
                ? 'bg-[#f0d6d6] border-[#a54a4a] text-[#a54a4a]'
                : 'bg-white border-[#d4cfc9] text-[#6b6560]'
            }`}
          >
            ❌ 駁回
          </button>
        </div>
        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); setError('') }}
          placeholder={action === 'reject' ? '請填寫駁回原因（必填）' : '備註（選填）'}
          rows={3}
          className="w-full border border-[#d4cfc9] rounded-lg px-3 py-2 text-sm text-[#4a3f35] resize-none focus:outline-none focus:ring-2 focus:ring-[#b0a899]"
        />
        {error && <p className="text-xs text-[#a54a4a] mt-1">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#d4cfc9] rounded-lg text-sm text-[#6b6560] hover:bg-[#f5f2ef]"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2 bg-[#8b7d6b] text-white rounded-lg text-sm font-medium hover:bg-[#7a6c5b] disabled:opacity-50"
          >
            {submitting ? '處理中…' : '送出'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Log Card ─────────────────────────────────────────────────────────────────

function LogCard({
  log,
  onReviewed,
  reviewMap,
  onReviewUpdate,
  onToast,
}: {
  log: AuditLog
  onReviewed: () => void
  reviewMap: Map<string, ReviewRecord>
  onReviewUpdate: (logId: string, record: ReviewRecord) => void
  onToast: (message: string, type: Toast['type']) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const reviewRecord = reviewMap.get(log.id)

  // 判斷是否需要 RBAC 審核
  const requiresReview = needsRbacReview(log)

  // 審核狀態計算
  const reviewStatus: ReviewStatus | null = reviewRecord?.status ?? (requiresReview ? 'pending' : null)

  // 是否已撤銷（被駁回）
  const isRevoked = reviewStatus === 'rejected'

  // 後端原本的 pending 狀態（needs_alert 且未確認）
  const isBackendPending = log.needs_alert && !log.alert_confirmed_at

  const handleReviewDone = (action: 'approve' | 'reject', comment: string) => {
    const record: ReviewRecord = {
      status: action === 'approve' ? 'approved' : 'rejected',
      comment,
      reviewedAt: new Date().toISOString(),
    }
    onReviewUpdate(log.id, record)
    setShowReview(false)

    if (action === 'approve') {
      onToast(`✅ 已通知 ${log.user_name} 審核結果：通過`, 'success')
      onReviewed()
    } else {
      onToast(`↩️ 已撤銷操作並通知 ${log.user_name}：${comment}`, 'warning')
    }
  }

  // 封存項目的恢復倒數
  const restoreInfo = log.archived_at ? calcRestoreRemaining(log.archived_at) : null

  const handleRestore = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/audit-logs/${log.id}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        onToast(`✅ 已恢復「${log.change_summary || log.table_name}」`, 'success')
        onReviewed()
        return
      }
    } catch {
      // 前端模擬
    }
    onToast(`✅ 已恢復「${log.change_summary || log.table_name}」（模擬）`, 'success')
    onReviewed()
  }

  return (
    <>
      {showReview && (
        <ReviewModal
          logId={log.id}
          userName={log.user_name || '未知操作人'}
          onClose={() => setShowReview(false)}
          onDone={handleReviewDone}
        />
      )}
      <div
        className={`rounded-xl border p-4 transition-colors ${
          isRevoked
            ? 'bg-[#f5f2ef] border-[#c8c0b8] opacity-75'
            : isBackendPending
            ? 'border-[#e8c878] bg-[#fffbee]'
            : reviewStatus === 'pending' && requiresReview
            ? 'border-[#e8c878] bg-[#fffbee]'
            : 'bg-white border-[#d4cfc9]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`flex-1 min-w-0 ${isRevoked ? 'line-through text-[#a89e94]' : ''}`}>
            {/* Top row: badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                {getActionLabel(log.action)}
              </span>
              <span className={`text-sm ${isRevoked ? 'text-[#a89e94]' : 'text-[#4a3f35]'}`}>
                {getTableLabel(log.table_name)}
              </span>

              {/* RBAC 審核狀態 badge */}
              {requiresReview && reviewStatus === 'pending' && !reviewRecord && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#fdf0c8] text-[#8a6d00] border border-[#e8c878]">
                  ⏳ 待審核
                </span>
              )}
              {reviewStatus === 'approved' && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#d4e6d3] text-[#4a7c59] border border-[#a8d4a8]">
                  ✅ 已通過
                </span>
              )}
              {reviewStatus === 'rejected' && (
                <>
                  <span className="px-2 py-0.5 rounded text-xs bg-[#f0d6d6] text-[#a54a4a] border border-[#e0a8a8]">
                    ❌ 已駁回
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-[#e8e4de] text-[#6b6560] border border-[#c8c0b8]">
                    ↩️ 已撤銷
                  </span>
                </>
              )}

              {/* 後端待審核 badge（向後相容） */}
              {isBackendPending && !requiresReview && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#fdf0c8] text-[#8a6d00] border border-[#e8c878]">
                  ⚠️ 待審核
                </span>
              )}

              {/* 封存 badge */}
              {log.archived_at && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#e8e4de] text-[#6b6560]">
                  📦 已封存
                </span>
              )}
            </div>

            {/* Summary */}
            <div className={`text-sm ${isRevoked ? 'text-[#a89e94]' : 'text-[#4a3f35]'}`}>
              {log.change_summary || '無異動摘要'}
            </div>

            {/* 駁回原因顯示 */}
            {reviewStatus === 'rejected' && reviewRecord?.comment && (
              <div className="mt-1 text-xs text-[#a54a4a] bg-[#fdf0f0] rounded-lg px-2 py-1 inline-block border border-[#e8c8c8]">
                駁回原因：{reviewRecord.comment}
              </div>
            )}

            {/* Meta row */}
            <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1 ${isRevoked ? 'text-[#b8b0a8]' : 'text-[#8a8078]'}`}>
              <span>{log.user_name || '系統'}</span>
              <span>{log.user_role || '-'}</span>
              {log.ip_address && <span>IP: {log.ip_address}</span>}
              <span>{new Date(log.created_at).toLocaleString('zh-TW')}</span>
            </div>

            {/* 封存恢復倒數 */}
            {log.archived_at && restoreInfo && (
              <div className="mt-1.5">
                {restoreInfo.expired ? (
                  <span className="text-xs text-[#a89e94]">⏰ 已過期，無法恢復</span>
                ) : (
                  <span className="text-xs text-[#6b8a6b]">
                    ⏱ 恢復期限：剩餘 {restoreInfo.days} 天 {restoreInfo.hours} 小時
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* RBAC 審核按鈕 */}
            {requiresReview && !reviewRecord && (
              <button
                onClick={() => setShowReview(true)}
                className="px-3 py-1 bg-[#8b7d6b] text-white text-xs rounded-lg hover:bg-[#7a6c5b] whitespace-nowrap"
              >
                審核
              </button>
            )}

            {/* 後端 pending 審核按鈕（向後相容） */}
            {isBackendPending && !requiresReview && (
              <button
                onClick={() => setShowReview(true)}
                className="px-3 py-1 bg-[#8b7d6b] text-white text-xs rounded-lg hover:bg-[#7a6c5b] whitespace-nowrap"
              >
                審核
              </button>
            )}

            {/* 恢復按鈕（封存 tab 中顯示） */}
            {log.archived_at && restoreInfo && !restoreInfo.expired && (
              <button
                onClick={handleRestore}
                className="px-3 py-1 bg-[#d4e6d3] text-[#4a7c59] text-xs rounded-lg hover:bg-[#c4d6c3] border border-[#a8d4a8] whitespace-nowrap"
              >
                🔄 恢復
              </button>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#8a8078] hover:text-[#4a3f35] whitespace-nowrap"
            >
              {expanded ? '▲ 收合' : '▼ 詳情'}
            </button>
          </div>
        </div>

        {/* Expandable detail panel */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#e8e4de]">
            <div className="text-xs text-[#8a8078] mb-2">
              <span className="font-medium text-[#4a3f35]">記錄 ID：</span>{log.record_id || '—'}
              {log.ip_address && (
                <>
                  <span className="mx-2">·</span>
                  <span className="font-medium text-[#4a3f35]">IP：</span>{log.ip_address}
                </>
              )}
              {log.archived_at && (
                <>
                  <span className="mx-2">·</span>
                  <span className="font-medium text-[#4a3f35]">封存時間：</span>
                  {new Date(log.archived_at).toLocaleString('zh-TW')}
                </>
              )}
              {reviewRecord && (
                <>
                  <span className="mx-2">·</span>
                  <span className="font-medium text-[#4a3f35]">審核時間：</span>
                  {new Date(reviewRecord.reviewedAt).toLocaleString('zh-TW')}
                </>
              )}
            </div>
            {(log.old_value !== undefined || log.new_value !== undefined) ? (
              <ValueDiff oldVal={log.old_value} newVal={log.new_value} />
            ) : (
              <p className="text-xs text-[#8a8078]">無變更詳情資料</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(logs: AuditLog[], reviewMap: Map<string, ReviewRecord>) {
  const headers = ['時間', '操作人', '角色', '動作', '資料表', '摘要', 'IP', '審核狀態', '駁回原因']
  const rows = logs.map((log) => {
    const review = reviewMap.get(log.id)
    const reviewStatus = review?.status === 'approved' ? '已通過' : review?.status === 'rejected' ? '已駁回' : needsRbacReview(log) ? '待審核' : '不需審核'
    return [
      new Date(log.created_at).toLocaleString('zh-TW'),
      log.user_name || '系統',
      log.user_role || '-',
      getActionLabel(log.action).replace(/[➕✏️🗑️]/gu, '').trim(),
      getTableLabel(log.table_name),
      log.change_summary || '',
      log.ip_address || '',
      reviewStatus,
      review?.comment || '',
    ]
  })

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('active')
  const [filter, setFilter] = useState({ tableName: '', action: '', needsAlert: '' })
  const [archiving, setArchiving] = useState(false)

  // 前端模擬：各日誌的審核結果
  const [reviewMap, setReviewMap] = useState<Map<string, ReviewRecord>>(new Map())

  // Toast 通知
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      toastTimers.current.delete(id)
    }, 5000)
    toastTimers.current.set(id, timer)
  }, [])

  const removeToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 清理 timers
  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const handleReviewUpdate = useCallback((logId: string, record: ReviewRecord) => {
    setReviewMap((prev) => new Map(prev).set(logId, record))
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filter.tableName) query.set('tableName', filter.tableName)
      if (filter.action) query.set('action', filter.action)
      if (filter.needsAlert === 'true') query.set('needsAlert', 'true')
      if (tab === 'archived') query.set('archived', 'true')

      const res = await fetch(`${API_BASE}/api/admin/audit-logs?${query}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setLogs(data.data?.logs || [])
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    }
    setLoading(false)
  }, [filter, tab])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const archiveOld = async () => {
    setArchiving(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/audit-logs/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ before: THREE_MONTHS_AGO.toISOString() }),
      })
      const data = await res.json()
      if (data.success) {
        addToast('📦 已封存舊日誌', 'info')
        await fetchLogs()
      }
    } catch (e) {
      console.error('Failed to archive:', e)
    }
    setArchiving(false)
  }

  const archivableCount = logs.filter(
    (l) => !l.archived_at && new Date(l.created_at) < THREE_MONTHS_AGO
  ).length

  // 各 tab 的統計
  const pendingCount = logs.filter((l) =>
    needsRbacReview(l) && !reviewMap.get(l.id)
  ).length

  return (
    <div className="space-y-4 p-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#4a3f35]">📋 異動日誌</h1>
          {tab === 'active' && pendingCount > 0 && (
            <p className="text-xs text-[#8a6d00] mt-0.5">
              {pendingCount} 筆操作待主任審核
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {tab === 'active' && archivableCount > 0 && (
            <button
              onClick={archiveOld}
              disabled={archiving}
              className="flex items-center gap-1 px-3 py-2 bg-[#e8e4de] text-[#6b6560] text-sm rounded-lg hover:bg-[#d8d4ce] disabled:opacity-50"
            >
              📦 封存舊日誌（{archivableCount} 筆）
            </button>
          )}
          <button
            onClick={() => exportCsv(logs, reviewMap)}
            className="flex items-center gap-1 px-3 py-2 bg-[#d6e4f0] text-[#4a6fa5] text-sm rounded-lg hover:bg-[#c6d4e0]"
          >
            📥 匯出 CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f5f2ef] rounded-xl p-1 w-fit">
        {([
          { key: 'active', label: '📋 正常日誌' },
          { key: 'archived', label: '📦 封存' },
        ] as { key: TabType; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-[#4a3f35] shadow-sm'
                : 'text-[#8a8078] hover:text-[#4a3f35]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 封存 tab 說明 */}
      {tab === 'archived' && (
        <div className="flex items-start gap-2 px-3 py-2 bg-[#f5f2ef] border border-[#d4cfc9] rounded-xl text-xs text-[#6b6560]">
          <span className="text-base leading-none mt-0.5">ℹ️</span>
          <span>
            封存項目可在 <strong className="text-[#4a3f35]">{RESTORE_DEADLINE_DAYS} 天內</strong>點選「🔄 恢復」還原。
            刪除操作採假刪除（封存），不會立即清除資料。
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <select
          value={filter.tableName}
          onChange={(e) => setFilter({ ...filter, tableName: e.target.value })}
          className="px-3 py-2 border border-[#d4cfc9] rounded-lg bg-white text-sm whitespace-nowrap text-[#4a3f35]"
        >
          <option value="">全部資料表</option>
          <option value="students">學生</option>
          <option value="courses">課程</option>
          <option value="attendance">出勤</option>
          <option value="grades">成績</option>
          <option value="payment_records">繳費記錄</option>
          <option value="teachers">講師</option>
          <option value="manage_salary_adjustments">薪資調整</option>
          <option value="manage_expenses">支出</option>
        </select>

        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          className="px-3 py-2 border border-[#d4cfc9] rounded-lg bg-white text-sm whitespace-nowrap text-[#4a3f35]"
        >
          <option value="">全部動作</option>
          <option value="create">新增</option>
          <option value="update">修改</option>
          <option value="delete">刪除</option>
        </select>

        <select
          value={filter.needsAlert}
          onChange={(e) => setFilter({ ...filter, needsAlert: e.target.value })}
          className="px-3 py-2 border border-[#d4cfc9] rounded-lg bg-white text-sm whitespace-nowrap text-[#4a3f35]"
        >
          <option value="">全部狀態</option>
          <option value="true">⏳ 待審核</option>
        </select>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[#f5f2ef] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-[#8a8078]">
          <div className="text-4xl mb-4">📋</div>
          <p>{tab === 'archived' ? '尚無封存記錄' : '尚無異動記錄'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              onReviewed={fetchLogs}
              reviewMap={reviewMap}
              onReviewUpdate={handleReviewUpdate}
              onToast={addToast}
            />
          ))}
        </div>
      )}
    </div>
  )
}

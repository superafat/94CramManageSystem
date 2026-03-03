'use client'

import { useState, useEffect, useCallback } from 'react'

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

const API_BASE = ''

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

// Three-months-ago threshold
const THREE_MONTHS_AGO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

function formatJson(val: unknown): string {
  if (val === null || val === undefined) return '（無）'
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

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

function ReviewModal({
  logId,
  onClose,
  onDone,
}: {
  logId: string
  onClose: () => void
  onDone: () => void
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
      const res = await fetch(`${API_BASE}/api/admin/audit-logs/${logId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action, comment: comment.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        onDone()
      } else {
        setError(data.message || '操作失敗')
      }
    } catch {
      setError('網路錯誤，請重試')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-[#4a3f35] mb-4">審核日誌</h2>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAction('approve')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              action === 'approve'
                ? 'bg-[#d4e6d3] border-[#4a7c59] text-[#4a7c59]'
                : 'bg-white border-[#d4cfc9] text-[#6b6560]'
            }`}
          >
            ✅ 確認
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

function LogCard({ log, onReviewed }: { log: AuditLog; onReviewed: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const isPending = log.needs_alert && !log.alert_confirmed_at

  return (
    <>
      {showReview && (
        <ReviewModal
          logId={log.id}
          onClose={() => setShowReview(false)}
          onDone={() => { setShowReview(false); onReviewed() }}
        />
      )}
      <div
        className={`bg-white rounded-xl border p-4 transition-colors ${
          isPending ? 'border-[#e8c878] bg-[#fffbee]' : 'border-[#d4cfc9]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Top row: badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                {getActionLabel(log.action)}
              </span>
              <span className="text-sm text-[#4a3f35]">{getTableLabel(log.table_name)}</span>
              {isPending && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#fdf0c8] text-[#8a6d00] border border-[#e8c878]">
                  ⚠️ 待審核
                </span>
              )}
              {log.archived_at && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#e8e4de] text-[#6b6560]">
                  📦 已封存
                </span>
              )}
            </div>

            {/* Summary */}
            <div className="text-sm text-[#4a3f35]">{log.change_summary || '無異動摘要'}</div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#8a8078] mt-1">
              <span>{log.user_name || '系統'}</span>
              <span>{log.user_role || '-'}</span>
              {log.ip_address && <span>IP: {log.ip_address}</span>}
              <span>{new Date(log.created_at).toLocaleString('zh-TW')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isPending && (
              <button
                onClick={() => setShowReview(true)}
                className="px-3 py-1 bg-[#8b7d6b] text-white text-xs rounded-lg hover:bg-[#7a6c5b] whitespace-nowrap"
              >
                審核
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

function exportCsv(logs: AuditLog[]) {
  const headers = ['時間', '操作人', '角色', '動作', '資料表', '摘要', 'IP']
  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString('zh-TW'),
    log.user_name || '系統',
    log.user_role || '-',
    getActionLabel(log.action).replace(/[➕✏️🗑️]/gu, '').trim(),
    getTableLabel(log.table_name),
    log.change_summary || '',
    log.ip_address || '',
  ])

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csvContent =
    '\uFEFF' + // BOM for Excel UTF-8
    [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('active')
  const [filter, setFilter] = useState({ tableName: '', action: '', needsAlert: '' })
  const [archiving, setArchiving] = useState(false)

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

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-[#4a3f35]">📋 異動日誌</h1>
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
            onClick={() => exportCsv(logs)}
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
          { key: 'archived', label: '📦 已封存' },
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
          <option value="true">⚠️ 待審核</option>
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
            <LogCard key={log.id} log={log} onReviewed={fetchLogs} />
          ))}
        </div>
      )}
    </div>
  )
}

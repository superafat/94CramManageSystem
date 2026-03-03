'use client'

import { useState, useEffect } from 'react'

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
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ tableName: '', action: '', needsAlert: '' })

  const API_BASE = ''

  const getAuthHeaders = () => {
    return { 'Content-Type': 'application/json' }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filter.tableName) query.set('tableName', filter.tableName)
      if (filter.action) query.set('action', filter.action)
      if (filter.needsAlert === 'true') query.set('needsAlert', 'true')

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
  }

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const confirmAlert = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/admin/alerts/${id}/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      fetchLogs()
    } catch (e) {
      console.error('Failed to confirm:', e)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700'
      case 'update': return 'bg-blue-100 text-blue-700'
      case 'delete': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
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
    return labels[table] || table
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">📋 異動日誌</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <select
          value={filter.tableName}
          onChange={(e) => setFilter({ ...filter, tableName: e.target.value })}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm whitespace-nowrap"
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
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm whitespace-nowrap"
        >
          <option value="">全部動作</option>
          <option value="create">新增</option>
          <option value="update">修改</option>
          <option value="delete">刪除</option>
        </select>

        <select
          value={filter.needsAlert}
          onChange={(e) => setFilter({ ...filter, needsAlert: e.target.value })}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm whitespace-nowrap"
        >
          <option value="">全部狀態</option>
          <option value="true">⚠️ 待處理</option>
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <div className="text-4xl mb-4">📋</div>
          <p>尚無異動記錄</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`bg-white rounded-xl border p-4 ${
                log.needs_alert && !log.alert_confirmed_at ? 'border-red-300 bg-red-50' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action === 'create' ? '➕ 新增' : log.action === 'update' ? '✏️ 修改' : log.action === 'delete' ? '🗑️ 刪除' : log.action}
                    </span>
                    <span className="text-sm text-text">{getTableLabel(log.table_name)}</span>
                    {log.needs_alert && !log.alert_confirmed_at && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">⚠️ 警示</span>
                    )}
                  </div>
                  <div className="text-sm text-text">{log.change_summary || '無異動摘要'}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {log.user_name || '系統'} · {log.user_role || '-'} · {new Date(log.created_at).toLocaleString('zh-TW')}
                  </div>
                </div>
                {log.needs_alert && !log.alert_confirmed_at && (
                  <button
                    onClick={() => confirmAlert(log.id)}
                    className="px-3 py-1 bg-primary text-white text-sm rounded-lg"
                  >
                    確認
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

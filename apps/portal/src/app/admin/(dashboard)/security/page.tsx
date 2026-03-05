'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface FailedLoginLog {
  id: string
  user_name: string
  user_email: string
  tenant_name: string
  ip_address: string
  created_at: string
  details: string | null
}

interface FailedLoginsResponse {
  data: {
    logs: FailedLoginLog[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface BlockedIpsResponse {
  data: {
    blockedIps: string[]
    message: string
  }
}

// ---------- 子元件 ----------

function Spinner() {
  return (
    <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-700 mb-4">{children}</h2>
}

function LoadingSection() {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-8 flex items-center justify-center">
      <Spinner />
    </div>
  )
}

function ErrorSection({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
      <p className="text-red-500 mb-3 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: '#8FA895' }}
      >
        重新載入
      </button>
    </div>
  )
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const DAYS_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
]

// ---------- 主頁面 ----------

export default function SecurityPage() {
  // 失敗登入
  const [logs, setLogs] = useState<FailedLoginLog[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [days, setDays] = useState(7)
  const [page, setPage] = useState(1)

  // 封鎖 IP
  const [blockedIps, setBlockedIps] = useState<BlockedIpsResponse['data'] | null>(null)
  const [blockedLoading, setBlockedLoading] = useState(true)
  const [blockedError, setBlockedError] = useState<string | null>(null)

  // ---------- 載入 ----------

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      setLogsError(null)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        days: String(days),
      })
      const res = await platformFetch<FailedLoginsResponse>(`/security/failed-logins?${params}`)
      setLogs(res.data.logs)
      setPagination(res.data.pagination)
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLogsLoading(false)
    }
  }, [page, days])

  const fetchBlockedIps = useCallback(async () => {
    try {
      setBlockedLoading(true)
      setBlockedError(null)
      const res = await platformFetch<BlockedIpsResponse>('/security/blocked-ips')
      setBlockedIps(res.data)
    } catch (err) {
      setBlockedError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setBlockedLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchBlockedIps()
  }, [fetchBlockedIps])

  function handleDaysChange(newDays: number) {
    setDays(newDays)
    setPage(1)
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">安全監控</h1>

      {/* ===== 失敗登入紀錄 ===== */}
      <section>
        <SectionTitle>失敗登入紀錄</SectionTitle>

        {/* 工具列 */}
        <div className="flex items-center gap-2 mb-4">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDaysChange(opt.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                days === opt.value
                  ? { backgroundColor: '#8FA895', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#6B7280', border: '1px solid #D1D5DB' }
              }
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-500">共 {pagination.total} 筆</span>
        </div>

        {logsLoading ? (
          <LoadingSection />
        ) : logsError ? (
          <ErrorSection message={logsError} onRetry={fetchLogs} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">此期間無失敗登入紀錄</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">使用者</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">補習班</th>
                      <th className="px-4 py-3 font-medium">IP 位址</th>
                      <th className="px-4 py-3 font-medium">時間</th>
                      <th className="px-4 py-3 font-medium">詳情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-800 font-medium">{log.user_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{log.user_email || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{log.tenant_name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.ip_address}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={log.details ?? ''}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分頁 */}
            {!logsLoading && !logsError && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>
                  第 {pagination.page} 頁 / 共 {pagination.totalPages} 頁
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 封鎖 IP ===== */}
      <section>
        <SectionTitle>封鎖 IP 清單</SectionTitle>
        {blockedLoading ? (
          <LoadingSection />
        ) : blockedError ? (
          <ErrorSection message={blockedError} onRetry={fetchBlockedIps} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm p-6">
            {blockedIps && blockedIps.blockedIps.length > 0 ? (
              <div className="space-y-2">
                {blockedIps.blockedIps.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between px-4 py-2 rounded-lg bg-red-50"
                  >
                    <span className="font-mono text-sm text-red-700">{ip}</span>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                    >
                      已封鎖
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-500">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#E5E7EB', color: '#6B7280' }}
                >
                  提示
                </span>
                <p className="text-sm">
                  {blockedIps?.message ?? '尚未建立 IP 封鎖功能'}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'
import { formatDate } from '@/lib/format'

// ---------- 型別 ----------

interface Trial {
  id: string
  tenant_id: string
  name: string
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'none'
  plan: string
  created_at: string
  trial_start_at: string | null
  trial_end_at: string | null
}

interface TrialsResponse {
  success: boolean
  data: Trial[]
}

// ---------- 常數 ----------

const STATUS_LABELS: Record<string, string> = {
  pending: '待審核',
  approved: '已通過',
  rejected: '已駁回',
  expired: '已過期',
  none: '無',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#D97706' },
  approved: { bg: '#D1FAE5', text: '#059669' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  expired: { bg: '#E5E7EB', text: '#6B7280' },
  none: { bg: '#E5E7EB', text: '#6B7280' },
}

const PLAN_LABELS: Record<string, string> = {
  free: '免費版',
  basic: '基本版',
  pro: '專業版',
  enterprise: '企業版',
}

// ---------- 子元件 ----------

function StatusTag({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.none
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger,
  loading,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message?: string
  confirmLabel: string
  danger?: boolean
  loading?: boolean
  children?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
        {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
        {children}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: danger ? '#B5706E' : '#8FA895' }}
          >
            {loading ? '處理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- 主頁面 ----------

export default function TrialsPage() {
  // 列表狀態
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog 狀態
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showRevoke, setShowRevoke] = useState(false)
  const [actionTarget, setActionTarget] = useState<Trial | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ---------- 載入資料 ----------

  const fetchTrials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<TrialsResponse>('/trials')
      setTrials(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrials()
  }, [fetchTrials])

  // ---------- 通過 ----------

  function openApprove(trial: Trial) {
    setActionTarget(trial)
    setShowApprove(true)
  }

  async function handleApprove() {
    if (!actionTarget) return
    try {
      setActionLoading(true)
      await platformFetch(`/trials/${actionTarget.tenant_id}/approve`, {
        method: 'POST',
      })
      setShowApprove(false)
      fetchTrials()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 駁回 ----------

  function openReject(trial: Trial) {
    setActionTarget(trial)
    setRejectNotes('')
    setShowReject(true)
  }

  async function handleReject() {
    if (!actionTarget || !rejectNotes.trim()) return
    try {
      setActionLoading(true)
      await platformFetch(`/trials/${actionTarget.tenant_id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes: rejectNotes }),
      })
      setShowReject(false)
      fetchTrials()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 撤銷 ----------

  function openRevoke(trial: Trial) {
    setActionTarget(trial)
    setShowRevoke(true)
  }

  async function handleRevoke() {
    if (!actionTarget) return
    try {
      setActionLoading(true)
      await platformFetch(`/trials/${actionTarget.tenant_id}/revoke`, {
        method: 'POST',
      })
      setShowRevoke(false)
      fetchTrials()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }


  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">試用管理</h1>

      {/* ===== 表格 ===== */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-2">載入中...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchTrials}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#8FA895' }}
            >
              重新載入
            </button>
          </div>
        ) : trials.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            尚無資料
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">補習班名稱</th>
                  <th className="px-4 py-3 font-medium">試用狀態</th>
                  <th className="px-4 py-3 font-medium">方案</th>
                  <th className="px-4 py-3 font-medium">申請日期</th>
                  <th className="px-4 py-3 font-medium">試用起始</th>
                  <th className="px-4 py-3 font-medium">試用到期</th>
                  <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trials.map((trial) => (
                  <tr
                    key={trial.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {trial.name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusTag status={trial.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {PLAN_LABELS[trial.plan] ?? trial.plan}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(trial.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(trial.trial_start_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(trial.trial_end_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {trial.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApprove(trial)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                              style={{ backgroundColor: '#8FA895' }}
                            >
                              通過
                            </button>
                            <button
                              onClick={() => openReject(trial)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                              style={{ backgroundColor: '#B5706E' }}
                            >
                              駁回
                            </button>
                          </>
                        )}
                        {trial.status === 'approved' && (
                          <button
                            onClick={() => openRevoke(trial)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                            style={{ backgroundColor: '#B5706E' }}
                          >
                            撤銷
                          </button>
                        )}
                        {trial.status !== 'pending' &&
                          trial.status !== 'approved' && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== 通過確認 Dialog ===== */}
      <ConfirmDialog
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={handleApprove}
        title="通過試用申請"
        message={`確定通過「${actionTarget?.name ?? ''}」的試用申請嗎？將開通 30 天專業版試用。`}
        confirmLabel="確定通過"
        loading={actionLoading}
      />

      {/* ===== 駁回 Dialog ===== */}
      <ConfirmDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={handleReject}
        title="駁回試用申請"
        confirmLabel="確定駁回"
        danger
        loading={actionLoading}
      >
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            備註
          </label>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-none"
            placeholder="請填寫駁回備註..."
          />
        </div>
      </ConfirmDialog>

      {/* ===== 撤銷確認 Dialog ===== */}
      <ConfirmDialog
        open={showRevoke}
        onClose={() => setShowRevoke(false)}
        onConfirm={handleRevoke}
        title="撤銷試用資格"
        message={`確定撤銷「${actionTarget?.name ?? ''}」的試用資格嗎？方案將降回免費版。`}
        confirmLabel="確定撤銷"
        danger
        loading={actionLoading}
      />
    </div>
  )
}

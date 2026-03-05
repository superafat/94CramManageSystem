'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'
import { formatDate } from '@/lib/format'

// ---------- 型別 ----------

interface Account {
  id: string
  name: string
  email: string
  role: string
  tenant_name: string
  branch_name: string
  created_at: string
}

interface AccountsResponse {
  success: boolean
  data: Account[]
}

// ---------- 常數 ----------

type StatusTab = 'pending' | 'approved' | 'rejected'

const TAB_OPTIONS: { value: StatusTab; label: string }[] = [
  { value: 'pending', label: '待審核' },
  { value: 'approved', label: '已通過' },
  { value: 'rejected', label: '已駁回' },
]

const ROLE_LABELS: Record<string, string> = {
  superadmin: '超級管理員',
  admin: '管理員',
  staff: '職員',
  manager: '主管',
  teacher: '老師',
  parent: '家長',
  student: '學生',
}

// ---------- 子元件 ----------

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

export default function AccountsPage() {
  // 列表狀態
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab 狀態
  const [activeTab, setActiveTab] = useState<StatusTab>('pending')

  // Dialog 狀態
  const [showReject, setShowReject] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Account | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ---------- 載入資料 ----------

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<AccountsResponse>(
        `/accounts?status=${activeTab}`
      )
      setAccounts(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // ---------- 通過 ----------

  async function handleApprove(account: Account) {
    try {
      setActionLoading(true)
      await platformFetch(`/accounts/${account.id}/approve`, {
        method: 'POST',
      })
      fetchAccounts()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 駁回 ----------

  function openReject(account: Account) {
    setRejectTarget(account)
    setRejectReason('')
    setShowReject(true)
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    try {
      setActionLoading(true)
      await platformFetch(`/accounts/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      })
      setShowReject(false)
      fetchAccounts()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">帳號審核</h1>

      {/* ===== Tab 切換 ===== */}
      <div className="flex gap-0">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              tab.value === TAB_OPTIONS[0].value ? 'rounded-l-lg' : ''
            } ${
              tab.value === TAB_OPTIONS[TAB_OPTIONS.length - 1].value
                ? 'rounded-r-lg'
                : ''
            } ${
              activeTab === tab.value
                ? 'text-white'
                : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
            style={
              activeTab === tab.value
                ? { backgroundColor: '#8FA895' }
                : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              onClick={fetchAccounts}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#8FA895' }}
            >
              重新載入
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            尚無資料
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">所屬補習班</th>
                  <th className="px-4 py-3 font-medium">分校</th>
                  <th className="px-4 py-3 font-medium">申請日期</th>
                  {activeTab === 'pending' && (
                    <th className="px-4 py-3 font-medium text-center">操作</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {acc.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{acc.email}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {ROLE_LABELS[acc.role] ?? acc.role}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {acc.tenant_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {acc.branch_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(acc.created_at)}
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(acc)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                            style={{ backgroundColor: '#8FA895' }}
                          >
                            通過
                          </button>
                          <button
                            onClick={() => openReject(acc)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                            style={{ backgroundColor: '#B5706E' }}
                          >
                            駁回
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== 駁回 Dialog ===== */}
      <ConfirmDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={handleReject}
        title="駁回帳號申請"
        confirmLabel="確定駁回"
        danger
        loading={actionLoading}
      >
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            駁回原因
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-none"
            placeholder="請填寫駁回原因..."
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}

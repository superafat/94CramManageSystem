'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { platformFetch } from '@/lib/api'
import { formatNTD, formatDate } from '@/lib/format'

// ---------- 型別 ----------

interface TenantDetail {
  id: string
  name: string
  slug: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'trial'
  adminName: string
  createdAt: string
  studentCount: number
  userCount: number
  aiUsage: number
  conversationCount: number
}

interface TenantDetailResponse {
  success: boolean
  data: TenantDetail
}

interface Payment {
  id: string
  amount: number
  paidAt: string
  method: string
  invoiceNumber: string
  note: string
}

interface PaymentsResponse {
  success: boolean
  data: {
    payments: Payment[]
  }
}

// ---------- 常數 ----------

const PLAN_LABELS: Record<string, string> = {
  free: '免費版',
  basic: '基本版',
  pro: '專業版',
  enterprise: '企業版',
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  free: { bg: '#E5E7EB', text: '#6B7280' },
  basic: { bg: '#DBEAFE', text: '#2563EB' },
  pro: { bg: '#D1FAE5', text: '#059669' },
  enterprise: { bg: '#FEF3C7', text: '#D97706' },
}

const STATUS_LABELS: Record<string, string> = {
  active: '使用中',
  suspended: '已停用',
  trial: '試用中',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#D1FAE5', text: '#059669' },
  suspended: { bg: '#FEE2E2', text: '#DC2626' },
  trial: { bg: '#DBEAFE', text: '#2563EB' },
}

// ---------- 工具 ----------


// ---------- 子元件 ----------

function PlanTag({ plan }: { plan: string }) {
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS.free
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {PLAN_LABELS[plan] ?? plan}
    </span>
  )
}

function StatusTag({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.active
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
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

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ---------- 骨架屏 ----------

function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-16 rounded bg-gray-200 animate-pulse" />
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm animate-pulse">
            <div className="h-4 w-20 rounded bg-gray-200 mb-3" />
            <div className="h-8 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm animate-pulse">
        <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- 主頁面 ----------

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // Dialog 狀態
  const [showEdit, setShowEdit] = useState(false)
  const [showSuspend, setShowSuspend] = useState(false)
  const [showRemind, setShowRemind] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  // 編輯表單
  const [editForm, setEditForm] = useState({ name: '', slug: '', plan: '' })

  // ---------- 載入資料 ----------

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<TenantDetailResponse>(`/tenants/${tenantId}`)
      setTenant(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const fetchPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true)
      const res = await platformFetch<PaymentsResponse>(
        `/finance/payments?tenantId=${tenantId}`
      )
      setPayments(res.data.payments)
    } catch {
      // 付款紀錄載入失敗不阻斷頁面
    } finally {
      setPaymentsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchTenant()
    fetchPayments()
  }, [fetchTenant, fetchPayments])

  // ---------- 操作 ----------

  function openEdit() {
    if (!tenant) return
    setEditForm({ name: tenant.name, slug: tenant.slug, plan: tenant.plan })
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!tenant) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${tenant.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      setShowEdit(false)
      fetchTenant()
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggleStatus() {
    if (!tenant) return
    if (tenant.status === 'suspended') {
      try {
        setActionLoading(true)
        await platformFetch(`/tenants/${tenant.id}/activate`, { method: 'POST' })
        fetchTenant()
      } catch (err) {
        alert(err instanceof Error ? err.message : '啟用失敗')
      } finally {
        setActionLoading(false)
      }
    } else {
      setSuspendReason('')
      setShowSuspend(true)
    }
  }

  async function handleSuspend() {
    if (!tenant || !suspendReason.trim()) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${tenant.id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: suspendReason }),
      })
      setShowSuspend(false)
      fetchTenant()
    } catch (err) {
      alert(err instanceof Error ? err.message : '停用失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemind() {
    if (!tenant) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${tenant.id}/remind`, { method: 'POST' })
      setShowRemind(false)
      fetchTenant()
    } catch (err) {
      alert(err instanceof Error ? err.message : '催繳失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 渲染 ----------

  if (loading) return <SkeletonDetail />

  if (error || !tenant) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/admin/tenants')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; 返回列表
        </button>
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
          <p className="text-red-500 mb-4">{error ?? '資料載入失敗'}</p>
          <button
            onClick={fetchTenant}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#8FA895' }}
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ===== 上方標題列 ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/tenants')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; 返回列表
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{tenant.name}</h1>
          <StatusTag status={tenant.status} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#8FA895' }}
          >
            編輯
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={actionLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{
              backgroundColor: tenant.status === 'suspended' ? '#8FA895' : '#B5706E',
            }}
          >
            {tenant.status === 'suspended' ? '啟用' : '停用'}
          </button>
          <button
            onClick={() => setShowRemind(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            催繳
          </button>
        </div>
      </div>

      {/* ===== 基本資訊卡片 ===== */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">基本資訊</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">名稱</span>
            <p className="text-gray-800 font-medium mt-0.5">{tenant.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Slug</span>
            <p className="text-gray-800 font-medium mt-0.5">{tenant.slug}</p>
          </div>
          <div>
            <span className="text-gray-500">方案</span>
            <div className="mt-0.5"><PlanTag plan={tenant.plan} /></div>
          </div>
          <div>
            <span className="text-gray-500">狀態</span>
            <div className="mt-0.5"><StatusTag status={tenant.status} /></div>
          </div>
          <div>
            <span className="text-gray-500">管理員</span>
            <p className="text-gray-800 font-medium mt-0.5">{tenant.adminName}</p>
          </div>
          <div>
            <span className="text-gray-500">建立日期</span>
            <p className="text-gray-800 font-medium mt-0.5">{formatDate(tenant.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* ===== 統計卡片 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="學生數" value={tenant.studentCount} />
        <StatCard label="使用者數" value={tenant.userCount} />
        <StatCard label="AI 用量" value={tenant.aiUsage} />
        <StatCard label="對話數" value={tenant.conversationCount} />
      </div>

      {/* ===== 付款紀錄 ===== */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">付款紀錄</h2>
        {paymentsLoading ? (
          <div className="py-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-2">載入中...</p>
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">尚無付款紀錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">金額</th>
                  <th className="px-4 py-3 font-medium">付款日期</th>
                  <th className="px-4 py-3 font-medium">方式</th>
                  <th className="px-4 py-3 font-medium">發票號碼</th>
                  <th className="px-4 py-3 font-medium">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {formatNTD(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(p.paidAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{p.method}</td>
                    <td className="px-4 py-3 text-gray-700">{p.invoiceNumber || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== 編輯 Modal ===== */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="編輯補習班">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">補習班名稱</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={editForm.slug}
              onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">方案</label>
            <select
              value={editForm.plan}
              onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            >
              <option value="free">免費版</option>
              <option value="basic">基本版</option>
              <option value="pro">專業版</option>
              <option value="enterprise">企業版</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowEdit(false)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleEdit}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#8FA895' }}
            >
              {actionLoading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== 停用確認 Dialog ===== */}
      <ConfirmDialog
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        onConfirm={handleSuspend}
        title="停用補習班"
        confirmLabel="確定停用"
        danger
        loading={actionLoading}
      >
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">停用原因</label>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-none"
            placeholder="請填寫停用原因..."
          />
        </div>
      </ConfirmDialog>

      {/* ===== 催繳確認 Dialog ===== */}
      <ConfirmDialog
        open={showRemind}
        onClose={() => setShowRemind(false)}
        onConfirm={handleRemind}
        title="發送催繳通知"
        message="確定要發送催繳通知嗎？催繳 3 次以上會自動停用該補習班。"
        confirmLabel="確定催繳"
        loading={actionLoading}
      />
    </div>
  )
}

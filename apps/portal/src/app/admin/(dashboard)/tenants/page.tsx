'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { platformFetch } from '@/lib/api'
import { formatDate } from '@/lib/format'

// ---------- 型別 ----------

interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'trial'
  studentCount: number
  userCount: number
  adminName: string
  createdAt: string
}

interface TenantsResponse {
  success: boolean
  data: {
    tenants: Tenant[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface CreateTenantPayload {
  name: string
  contactName: string
  contactEmail: string
  address: string
  phone: string
  plan: string
  franchiseFee?: number
}

interface EditTenantPayload {
  name: string
  slug: string
  plan: string
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

// ---------- 操作選單 ----------

function ActionMenu({
  tenant,
  onEdit,
  onToggleStatus,
  onRemind,
  onDelete,
}: {
  tenant: Tenant
  onEdit: () => void
  onToggleStatus: () => void
  onRemind: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 rounded text-sm text-gray-500 hover:bg-gray-100"
      >
        操作 ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-white border rounded-lg shadow-lg py-1 w-28">
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              編輯
            </button>
            <button
              onClick={() => { setOpen(false); onToggleStatus() }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {tenant.status === 'suspended' ? '啟用' : '停用'}
            </button>
            <button
              onClick={() => { setOpen(false); onRemind() }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              催繳
            </button>
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              刪除
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------- 主頁面 ----------

export default function TenantsPage() {
  const router = useRouter()

  // 列表狀態
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 篩選
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modal 狀態
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showSuspend, setShowSuspend] = useState(false)
  const [showRemind, setShowRemind] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [actionTarget, setActionTarget] = useState<Tenant | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // 新增表單
  const [createForm, setCreateForm] = useState<CreateTenantPayload>({
    name: '',
    contactName: '',
    contactEmail: '',
    address: '',
    phone: '',
    plan: 'free',
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})

  // 編輯表單
  const [editForm, setEditForm] = useState<EditTenantPayload>({
    name: '',
    slug: '',
    plan: '',
  })

  // 停用原因
  const [suspendReason, setSuspendReason] = useState('')

  // ---------- 載入資料 ----------

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (planFilter) params.set('plan', planFilter)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '10')

      const res = await platformFetch<TenantsResponse>(`/tenants?${params.toString()}`)
      setTenants(res.data.tenants)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [search, planFilter, statusFilter, page])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // 搜尋 debounce
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // ---------- 新增 ----------

  function validateCreate(): boolean {
    const errors: Record<string, string> = {}
    if (!createForm.name.trim()) errors.name = '必填'
    if (!createForm.contactName.trim()) errors.contactName = '必填'
    if (!createForm.contactEmail.trim()) {
      errors.contactEmail = '必填'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.contactEmail)) {
      errors.contactEmail = '請輸入正確的 Email 格式'
    }
    if (!createForm.address.trim()) errors.address = '必填'
    if (!createForm.phone.trim()) errors.phone = '必填'
    setCreateErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreate() {
    if (!validateCreate()) return
    try {
      setActionLoading(true)
      await platformFetch('/tenants', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      setShowCreate(false)
      setCreateForm({ name: '', contactName: '', contactEmail: '', address: '', phone: '', plan: 'free' })
      setCreateErrors({})
      fetchTenants()
    } catch (err) {
      setCreateErrors({ _general: err instanceof Error ? err.message : '建立失敗' })
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 編輯 ----------

  function openEdit(tenant: Tenant) {
    setEditForm({ name: tenant.name, slug: tenant.slug, plan: tenant.plan })
    setActionTarget(tenant)
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!actionTarget) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${actionTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      setShowEdit(false)
      fetchTenants()
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 停用 / 啟用 ----------

  function openToggleStatus(tenant: Tenant) {
    setActionTarget(tenant)
    setSuspendReason('')
    if (tenant.status === 'suspended') {
      handleActivate(tenant)
    } else {
      setShowSuspend(true)
    }
  }

  async function handleActivate(tenant: Tenant) {
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${tenant.id}/activate`, { method: 'POST' })
      fetchTenants()
    } catch (err) {
      alert(err instanceof Error ? err.message : '啟用失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSuspend() {
    if (!actionTarget || !suspendReason.trim()) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${actionTarget.id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: suspendReason }),
      })
      setShowSuspend(false)
      fetchTenants()
    } catch (err) {
      alert(err instanceof Error ? err.message : '停用失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 催繳 ----------

  function openRemind(tenant: Tenant) {
    setActionTarget(tenant)
    setShowRemind(true)
  }

  async function handleRemind() {
    if (!actionTarget) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${actionTarget.id}/remind`, { method: 'POST' })
      setShowRemind(false)
      fetchTenants()
    } catch (err) {
      alert(err instanceof Error ? err.message : '催繳失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 刪除 ----------

  function openDelete(tenant: Tenant) {
    setActionTarget(tenant)
    setShowDelete(true)
  }

  async function handleDelete() {
    if (!actionTarget) return
    try {
      setActionLoading(true)
      await platformFetch(`/tenants/${actionTarget.id}`, { method: 'DELETE' })
      setShowDelete(false)
      fetchTenants()
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">補習班管理</h1>

      {/* ===== 工具列 ===== */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜尋補習班名稱..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] bg-white"
        />
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
        >
          <option value="">全部方案</option>
          <option value="free">免費版</option>
          <option value="basic">基本版</option>
          <option value="pro">專業版</option>
          <option value="enterprise">企業版</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
        >
          <option value="">全部狀態</option>
          <option value="active">使用中</option>
          <option value="suspended">已停用</option>
        </select>
        <button
          onClick={() => {
            setShowCreate(true)
            setCreateForm({ name: '', contactName: '', contactEmail: '', address: '', phone: '', plan: 'free' })
            setCreateErrors({})
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: '#8FA895' }}
        >
          新增補習班
        </button>
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
              onClick={fetchTenants}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#8FA895' }}
            >
              重新載入
            </button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            尚無資料
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">名稱</th>
                  <th className="px-4 py-3 font-medium">方案</th>
                  <th className="px-4 py-3 font-medium">狀態</th>
                  <th className="px-4 py-3 font-medium text-right">學生數</th>
                  <th className="px-4 py-3 font-medium text-right">使用者數</th>
                  <th className="px-4 py-3 font-medium">管理員</th>
                  <th className="px-4 py-3 font-medium">建立日期</th>
                  <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/tenants/${t.id}`)}
                        className="text-gray-800 font-medium hover:underline"
                      >
                        {t.name}
                      </button>
                    </td>
                    <td className="px-4 py-3"><PlanTag plan={t.plan} /></td>
                    <td className="px-4 py-3"><StatusTag status={t.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-700">{t.studentCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{t.userCount}</td>
                    <td className="px-4 py-3 text-gray-700">{t.adminName}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <ActionMenu
                        tenant={t}
                        onEdit={() => openEdit(t)}
                        onToggleStatus={() => openToggleStatus(t)}
                        onRemind={() => openRemind(t)}
                        onDelete={() => openDelete(t)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分頁 */}
        {!loading && !error && totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              共 {total} 筆，第 {page} 頁 / 共 {totalPages} 頁
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 新增 Modal ===== */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新增補習班">
        <div className="space-y-3">
          {createErrors._general && (
            <p className="text-sm text-red-500">{createErrors._general}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">補習班名稱 *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
            {createErrors.name && <p className="text-xs text-red-500 mt-1">{createErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡人姓名 *</label>
            <input
              type="text"
              value={createForm.contactName}
              onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
            {createErrors.contactName && <p className="text-xs text-red-500 mt-1">{createErrors.contactName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡人 Email *</label>
            <input
              type="email"
              value={createForm.contactEmail}
              onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
            {createErrors.contactEmail && <p className="text-xs text-red-500 mt-1">{createErrors.contactEmail}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址 *</label>
            <input
              type="text"
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
            {createErrors.address && <p className="text-xs text-red-500 mt-1">{createErrors.address}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話 *</label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
            {createErrors.phone && <p className="text-xs text-red-500 mt-1">{createErrors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">方案</label>
            <select
              value={createForm.plan}
              onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            >
              <option value="free">免費版</option>
              <option value="basic">基本版</option>
              <option value="pro">專業版</option>
              <option value="enterprise">企業版</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">加盟費（選填）</label>
            <input
              type="number"
              value={createForm.franchiseFee ?? ''}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  franchiseFee: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
              placeholder="0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#8FA895' }}
            >
              {actionLoading ? '建立中...' : '建立'}
            </button>
          </div>
        </div>
      </Modal>

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

      {/* ===== 刪除確認 Dialog ===== */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="刪除補習班"
        message={`確定要刪除「${actionTarget?.name ?? ''}」嗎？此操作無法還原。`}
        confirmLabel="確定刪除"
        danger
        loading={actionLoading}
      />
    </div>
  )
}

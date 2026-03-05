'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface Cost {
  id: string
  category: string
  subcategory: string | null
  amount: number
  date: string
  description: string | null
  is_recurring: boolean
}

interface CostsResponse {
  success: boolean
  data: {
    data: Cost[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface CostForm {
  category: string
  subcategory: string
  amount: string
  date: string
  description: string
  isRecurring: boolean
}

// ---------- 常數 ----------

const CATEGORY_LABELS: Record<string, string> = {
  infra: '基礎設施',
  ai: 'AI 服務',
  domain: '網域',
  labor: '人力',
  other: '其他',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  infra: { bg: '#DBEAFE', text: '#2563EB' },
  ai: { bg: '#EDE9FE', text: '#7C3AED' },
  domain: { bg: '#FEF3C7', text: '#D97706' },
  labor: { bg: '#D1FAE5', text: '#059669' },
  other: { bg: '#E5E7EB', text: '#6B7280' },
}

// ---------- 工具函式 ----------

function formatNTD(value: number): string {
  return `NT$ ${value.toLocaleString('zh-TW')}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyForm(): CostForm {
  return {
    category: 'infra',
    subcategory: '',
    amount: '',
    date: todayStr(),
    description: '',
    isRecurring: false,
  }
}

// ---------- 子元件 ----------

function CategoryTag({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {CATEGORY_LABELS[category] ?? category}
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
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
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading?: boolean
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
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
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
            style={{ backgroundColor: '#B5706E' }}
          >
            {loading ? '刪除中...' : '確定刪除'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ---------- 主頁面 ----------

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 篩選
  const [categoryFilter, setCategoryFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editTarget, setEditTarget] = useState<Cost | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Cost | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<CostForm>(emptyForm())

  // ---------- 載入 ----------

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (categoryFilter) params.set('category', categoryFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await platformFetch<CostsResponse>(`/finance/costs?${params.toString()}`)
      setCosts(res.data.data)
      setPagination({
        page: res.data.pagination.page,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [page, categoryFilter, startDate, endDate])

  useEffect(() => {
    fetchCosts()
  }, [fetchCosts])

  // ---------- 驗證 ----------

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.category) errors.category = '請選擇類別'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errors.amount = '請輸入有效金額'
    if (!form.date) errors.date = '請選擇日期'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ---------- 新增 ----------

  async function handleCreate() {
    if (!validateForm()) return
    try {
      setActionLoading(true)
      await platformFetch('/finance/costs', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          subcategory: form.subcategory || undefined,
          amount: Number(form.amount),
          date: form.date,
          description: form.description || undefined,
          isRecurring: form.isRecurring,
        }),
      })
      setShowCreate(false)
      setForm(emptyForm())
      setFormErrors({})
      fetchCosts()
    } catch (err) {
      setFormErrors({ _general: err instanceof Error ? err.message : '新增失敗' })
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 編輯 ----------

  function openEdit(cost: Cost) {
    setEditTarget(cost)
    setForm({
      category: cost.category,
      subcategory: cost.subcategory ?? '',
      amount: String(cost.amount),
      date: formatDate(cost.date),
      description: cost.description ?? '',
      isRecurring: cost.is_recurring,
    })
    setFormErrors({})
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!editTarget || !validateForm()) return
    try {
      setActionLoading(true)
      await platformFetch(`/finance/costs/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          category: form.category,
          subcategory: form.subcategory || undefined,
          amount: Number(form.amount),
          date: form.date,
          description: form.description || undefined,
          isRecurring: form.isRecurring,
        }),
      })
      setShowEdit(false)
      fetchCosts()
    } catch (err) {
      setFormErrors({ _general: err instanceof Error ? err.message : '更新失敗' })
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 刪除 ----------

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      setActionLoading(true)
      await platformFetch(`/finance/costs/${deleteTarget.id}`, { method: 'DELETE' })
      setShowDelete(false)
      fetchCosts()
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 表單 ----------

  function CostFormFields() {
    return (
      <div className="space-y-3">
        {formErrors._general && (
          <p className="text-sm text-red-500">{formErrors._general}</p>
        )}
        <FormField label="類別" required error={formErrors.category}>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="子類別">
          <input
            type="text"
            value={form.subcategory}
            onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            placeholder="選填"
          />
        </FormField>
        <FormField label="金額（元）" required error={formErrors.amount}>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            placeholder="0"
          />
        </FormField>
        <FormField label="日期" required error={formErrors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </FormField>
        <FormField label="描述">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-none"
          />
        </FormField>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isRecurring"
            checked={form.isRecurring}
            onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label htmlFor="isRecurring" className="text-sm text-gray-700">固定支出（每月重複）</label>
        </div>
      </div>
    )
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">支出管理</h1>

      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
        >
          <option value="">全部類別</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>開始日期</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>結束日期</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </div>
        <button
          onClick={() => { setCategoryFilter(''); setStartDate(''); setEndDate(''); setPage(1) }}
          className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-300 hover:bg-gray-50"
        >
          清除篩選
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { setForm(emptyForm()); setFormErrors({}); setShowCreate(true) }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#8FA895' }}
        >
          新增支出
        </button>
      </div>

      {/* 表格 */}
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
              onClick={fetchCosts}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#8FA895' }}
            >
              重新載入
            </button>
          </div>
        ) : costs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">尚無支出紀錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">類別</th>
                  <th className="px-4 py-3 font-medium">子類別</th>
                  <th className="px-4 py-3 font-medium text-right">金額</th>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">描述</th>
                  <th className="px-4 py-3 font-medium text-center">固定支出</th>
                  <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costs.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <CategoryTag category={c.category} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.subcategory ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{formatNTD(c.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.date)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{c.description ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {c.is_recurring ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#D1FAE5', color: '#059669' }}
                        >
                          是
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">否</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-2 py-1 text-xs rounded text-gray-600 border border-gray-300 hover:bg-gray-50"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(c); setShowDelete(true) }}
                          className="px-2 py-1 text-xs rounded text-red-600 border border-red-200 hover:bg-red-50"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分頁 */}
        {!loading && !error && pagination.totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>共 {pagination.total} 筆，第 {pagination.page} 頁 / 共 {pagination.totalPages} 頁</span>
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

      {/* 新增 Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新增支出紀錄">
        <CostFormFields />
        <div className="flex justify-end gap-3 mt-4">
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
            {actionLoading ? '新增中...' : '新增'}
          </button>
        </div>
      </Modal>

      {/* 編輯 Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="編輯支出紀錄">
        <CostFormFields />
        <div className="flex justify-end gap-3 mt-4">
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
      </Modal>

      {/* 刪除確認 */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="刪除支出紀錄"
        message="確定要刪除這筆支出紀錄嗎？此操作無法還原。"
        loading={actionLoading}
      />
    </div>
  )
}

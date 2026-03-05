'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'
import { formatNTD, formatDate } from '@/lib/format'

// ---------- 型別 ----------

interface Payment {
  id: string
  tenantId: string
  amount: number
  paidAt: string
  method: 'transfer' | 'cash' | 'other'
  invoiceNo: string | null
  periodStart: string | null
  periodEnd: string | null
  notes: string | null
  tenantName: string
}

interface PaymentsResponse {
  success: boolean
  data: Payment[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface TenantOption {
  id: string
  name: string
}

interface TenantsResponse {
  success: boolean
  data: TenantOption[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface PaymentForm {
  tenantId: string
  amount: string
  paidAt: string
  method: 'transfer' | 'cash' | 'other'
  invoiceNo: string
  periodStart: string
  periodEnd: string
  notes: string
}

// ---------- 常數 ----------

const METHOD_LABELS: Record<string, string> = {
  transfer: '轉帳',
  cash: '現金',
  other: '其他',
}

// ---------- 工具函式 ----------


function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyForm(): PaymentForm {
  return {
    tenantId: '',
    amount: '',
    paidAt: todayStr(),
    method: 'transfer',
    invoiceNo: '',
    periodStart: '',
    periodEnd: '',
    notes: '',
  }
}

// ---------- Modal ----------

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

// ---------- 表單欄位 ----------

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

export default function SubscriptionsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 篩選
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 補習班選項（用於表單）
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([])

  // Modal 狀態
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editTarget, setEditTarget] = useState<Payment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 表單
  const [form, setForm] = useState<PaymentForm>(emptyForm())

  // ---------- 載入補習班選項 ----------

  useEffect(() => {
    platformFetch<TenantsResponse>('/tenants?limit=200')
      .then((res) => setTenantOptions(res.data))
      .catch(() => {})
  }, [])

  // ---------- 載入收款紀錄 ----------

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await platformFetch<PaymentsResponse>(`/finance/payments?${params.toString()}`)
      setPayments(res.data)
      setPagination({
        page: res.meta.pagination.page,
        total: res.meta.pagination.total,
        totalPages: res.meta.pagination.totalPages,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [page, startDate, endDate])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // ---------- 驗證 ----------

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.tenantId) errors.tenantId = '請選擇補習班'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errors.amount = '請輸入有效金額'
    if (!form.paidAt) errors.paidAt = '請選擇付款日期'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ---------- 新增 ----------

  async function handleCreate() {
    if (!validateForm()) return
    try {
      setActionLoading(true)
      await platformFetch('/finance/payments', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: form.tenantId,
          amount: Number(form.amount),
          paidAt: form.paidAt,
          method: form.method,
          invoiceNo: form.invoiceNo || undefined,
          periodStart: form.periodStart || undefined,
          periodEnd: form.periodEnd || undefined,
          notes: form.notes || undefined,
        }),
      })
      setShowCreate(false)
      setForm(emptyForm())
      setFormErrors({})
      fetchPayments()
    } catch (err) {
      setFormErrors({ _general: err instanceof Error ? err.message : '新增失敗' })
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 編輯 ----------

  function openEdit(payment: Payment) {
    setEditTarget(payment)
    setForm({
      tenantId: payment.tenantId,
      amount: String(payment.amount),
      paidAt: formatDate(payment.paidAt),
      method: payment.method,
      invoiceNo: payment.invoiceNo ?? '',
      periodStart: payment.periodStart ? formatDate(payment.periodStart) : '',
      periodEnd: payment.periodEnd ? formatDate(payment.periodEnd) : '',
      notes: payment.notes ?? '',
    })
    setFormErrors({})
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!editTarget || !validateForm()) return
    try {
      setActionLoading(true)
      await platformFetch(`/finance/payments/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          tenantId: form.tenantId,
          amount: Number(form.amount),
          paidAt: form.paidAt,
          method: form.method,
          invoiceNo: form.invoiceNo || undefined,
          periodStart: form.periodStart || undefined,
          periodEnd: form.periodEnd || undefined,
          notes: form.notes || undefined,
        }),
      })
      setShowEdit(false)
      fetchPayments()
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
      await platformFetch(`/finance/payments/${deleteTarget.id}`, { method: 'DELETE' })
      setShowDelete(false)
      fetchPayments()
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 表單共用 ----------

  function PaymentFormFields() {
    return (
      <div className="space-y-3">
        {formErrors._general && (
          <p className="text-sm text-red-500">{formErrors._general}</p>
        )}
        <FormField label="補習班" required error={formErrors.tenantId}>
          <select
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          >
            <option value="">請選擇</option>
            {tenantOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
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
        <FormField label="付款日期" required error={formErrors.paidAt}>
          <input
            type="date"
            value={form.paidAt}
            onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </FormField>
        <FormField label="付款方式" required>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as PaymentForm['method'] })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          >
            <option value="transfer">轉帳</option>
            <option value="cash">現金</option>
            <option value="other">其他</option>
          </select>
        </FormField>
        <FormField label="發票號碼">
          <input
            type="text"
            value={form.invoiceNo}
            onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="計費開始">
            <input
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
          </FormField>
          <FormField label="計費結束">
            <input
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
          </FormField>
        </div>
        <FormField label="備註">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-none"
          />
        </FormField>
      </div>
    )
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">收款紀錄</h1>

      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3">
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
          onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
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
          新增收款
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
              onClick={fetchPayments}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#8FA895' }}
            >
              重新載入
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">尚無收款紀錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">補習班</th>
                  <th className="px-4 py-3 font-medium text-right">金額</th>
                  <th className="px-4 py-3 font-medium">付款日期</th>
                  <th className="px-4 py-3 font-medium">付款方式</th>
                  <th className="px-4 py-3 font-medium">發票號碼</th>
                  <th className="px-4 py-3 font-medium">計費期間</th>
                  <th className="px-4 py-3 font-medium">備註</th>
                  <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.tenantName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNTD(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.paidAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-gray-500">{p.invoiceNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {p.periodStart && p.periodEnd
                        ? `${formatDate(p.periodStart)} ~ ${formatDate(p.periodEnd)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{p.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-2 py-1 text-xs rounded text-gray-600 border border-gray-300 hover:bg-gray-50"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(p); setShowDelete(true) }}
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新增收款紀錄">
        <PaymentFormFields />
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
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="編輯收款紀錄">
        <PaymentFormFields />
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
        title="刪除收款紀錄"
        message={`確定要刪除「${deleteTarget?.tenantName ?? ''}」的這筆收款紀錄嗎？此操作無法還原。`}
        loading={actionLoading}
      />
    </div>
  )
}

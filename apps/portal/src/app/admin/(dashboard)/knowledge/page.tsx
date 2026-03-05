'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface KnowledgeItem {
  id: string
  title: string
  content: string
  category: string | null
  tenantId: string | null
  createdAt: string
  updatedAt: string
}

interface KnowledgeResponse {
  data: KnowledgeItem[]
}

interface FormState {
  title: string
  content: string
  category: string
  tenantId: string
  scope: 'global' | 'tenant'
}

// ---------- 子元件 ----------

function Spinner() {
  return (
    <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  category: '',
  tenantId: '',
  scope: 'global',
}

// ---------- 主頁面 ----------

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 篩選
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Modal
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [target, setTarget] = useState<KnowledgeItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [actionLoading, setActionLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ---------- 載入 ----------

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<KnowledgeResponse>('/knowledge/')
      setItems(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ---------- 篩選後資料 ----------

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[]

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = !categoryFilter || item.category === categoryFilter
    return matchSearch && matchCategory
  })

  // ---------- 新增 ----------

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowCreate(true)
  }

  async function handleCreate() {
    if (!form.title.trim()) { setFormError('請輸入標題'); return }
    if (!form.content.trim()) { setFormError('請輸入內容'); return }
    try {
      setActionLoading(true)
      setFormError(null)
      await platformFetch('/knowledge/', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category || undefined,
          tenantId: form.scope === 'tenant' && form.tenantId ? form.tenantId : undefined,
        }),
      })
      setShowCreate(false)
      fetchItems()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 編輯 ----------

  function openEdit(item: KnowledgeItem) {
    setTarget(item)
    setForm({
      title: item.title,
      content: item.content,
      category: item.category ?? '',
      tenantId: item.tenantId ?? '',
      scope: item.tenantId ? 'tenant' : 'global',
    })
    setFormError(null)
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!target) return
    if (!form.title.trim()) { setFormError('請輸入標題'); return }
    if (!form.content.trim()) { setFormError('請輸入內容'); return }
    try {
      setActionLoading(true)
      setFormError(null)
      await platformFetch(`/knowledge/${target.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category || undefined,
          tenantId: form.scope === 'tenant' && form.tenantId ? form.tenantId : null,
        }),
      })
      setShowEdit(false)
      fetchItems()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 刪除 ----------

  function openDelete(item: KnowledgeItem) {
    setTarget(item)
    setShowDelete(true)
  }

  async function handleDelete() {
    if (!target) return
    try {
      setActionLoading(true)
      await platformFetch(`/knowledge/${target.id}`, { method: 'DELETE' })
      setShowDelete(false)
      fetchItems()
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 表單內容（共用於新增和編輯） ----------

  function FormContent() {
    return (
      <div className="space-y-3">
        {formError && <p className="text-sm text-red-500">{formError}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">標題 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="例如：課程、招生、行政"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">內容 *</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">適用範圍</label>
          <select
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value as 'global' | 'tenant' })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
          >
            <option value="global">全域</option>
            <option value="tenant">特定補習班</option>
          </select>
        </div>
        {form.scope === 'tenant' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">補習班 ID</label>
            <input
              type="text"
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              placeholder="請輸入補習班 ID"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            />
          </div>
        )}
      </div>
    )
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">全域知識庫</h1>

      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜尋標題或分類..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895] bg-white"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
        >
          <option value="">全部分類</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: '#8FA895' }}
        >
          新增知識
        </button>
      </div>

      {/* 表格 */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Spinner />
            <p className="text-sm text-gray-400 mt-2">載入中...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchItems}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#8FA895' }}
            >
              重新載入
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">尚無資料</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">標題</th>
                  <th className="px-4 py-3 font-medium">分類</th>
                  <th className="px-4 py-3 font-medium">適用範圍</th>
                  <th className="px-4 py-3 font-medium">建立日期</th>
                  <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{item.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.category ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#EAF0EC', color: '#4A7A58' }}
                        >
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.tenantId ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#EAF0F8', color: '#3A6EA5' }}
                        >
                          特定補習班
                        </span>
                      ) : (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#F0ECF8', color: '#6B5F8A' }}
                        >
                          全域
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="px-3 py-1 rounded text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => openDelete(item)}
                          className="px-3 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: '#B5706E' }}
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
      </div>

      {/* 新增 Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新增知識">
        <FormContent />
        <div className="flex justify-end gap-3 pt-4">
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
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="編輯知識">
        <FormContent />
        <div className="flex justify-end gap-3 pt-4">
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
        title="刪除知識"
        message={`確定要刪除「${target?.title ?? ''}」嗎？此操作無法還原。`}
        loading={actionLoading}
      />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

interface Expense {
  id: string
  name: string
  amount: number
  category: string
  expense_date: string
  notes: string | null
  created_at: string
}

const API_BASE = ''
const CATEGORY_PRESETS = ['內務', '水電', '教材', '房租', '設備', '文具', '交通', '餐費', '其他']

const getMonthRange = (offset: number = 0) => {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: `${year}年${month + 1}月` }
}

export default function ExpensesContent() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<string[]>(CATEGORY_PRESETS)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', amount: '', category: '', expenseDate: '', notes: '' })
  const [deleting, setDeleting] = useState<string | null>(null)

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => { fetchExpenses(); fetchCategories() }, [monthOffset])
  useEffect(() => { fetchExpenses() }, [filterCategory])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/expenses?from=${monthRange.start}&to=${monthRange.end}${filterCategory ? `&category=${encodeURIComponent(filterCategory)}` : ''}`,
        { credentials: 'include' }
      )
      if (!res.ok) return
      const result = await res.json()
      setExpenses(result.expenses || [])
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/expenses/categories`, { credentials: 'include' })
      if (!res.ok) return
      const result = await res.json()
      if (result.categories?.length) {
        setCategories([...new Set([...CATEGORY_PRESETS, ...result.categories])])
      }
    } catch { /* ignore */ }
  }

  const openAdd = () => {
    setEditingId(null)
    setForm({ name: '', amount: '', category: '', expenseDate: new Date().toISOString().split('T')[0], notes: '' })
    setShowModal(true)
  }

  const openEdit = (e: Expense) => {
    setEditingId(e.id)
    setForm({ name: e.name, amount: String(e.amount), category: e.category, expenseDate: e.expense_date, notes: e.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.amount || !form.category || !form.expenseDate) return
    try {
      const url = editingId ? `${API_BASE}/api/w8/expenses/${editingId}` : `${API_BASE}/api/w8/expenses`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name, amount: form.amount, category: form.category, expenseDate: form.expenseDate, notes: form.notes || undefined }),
      })
      if (res.ok) { setShowModal(false); fetchExpenses(); fetchCategories() }
    } catch (err) { console.error('Failed to save expense:', err) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆支出嗎？')) return
    setDeleting(id)
    try {
      const res = await fetch(`${API_BASE}/api/w8/expenses/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) fetchExpenses()
    } catch (err) { console.error('Failed to delete expense:', err) } finally { setDeleting(null) }
  }

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface">&larr;</button>
          <div className="text-center min-w-[120px]">
            <p className="font-medium text-text text-sm">{monthRange.label}</p>
            <p className="text-xs text-text-muted">{monthRange.start} ~ {monthRange.end}</p>
          </div>
          <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface">&rarr;</button>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium shrink-0">+ 新增支出</button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0 ${!filterCategory ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}
        >
          全部
        </button>
        {Object.keys(categoryTotals).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0 ${filterCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
            <p className="text-sm opacity-80">本月支出總計</p>
            <p className="text-3xl font-bold mt-1">${totalAmount.toLocaleString()}</p>
            <div className="flex gap-6 mt-4 text-sm">
              <div><p className="opacity-80">筆數</p><p className="font-semibold">{expenses.length} 筆</p></div>
              <div><p className="opacity-80">類別數</p><p className="font-semibold">{Object.keys(categoryTotals).length} 類</p></div>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-border">
              <h2 className="text-sm font-medium text-text-muted mb-3">類別統計</h2>
              <div className="space-y-2">
                {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm text-text w-16 shrink-0">{cat}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${totalAmount > 0 ? (amount / totalAmount) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-medium text-text w-24 text-right">${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense List */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-text-muted px-1">支出明細</h2>
            {expenses.map(expense => (
              <div key={expense.id} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{expense.name}</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{expense.category}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{expense.expense_date}</p>
                    {expense.notes && <p className="text-xs text-text-muted mt-1">{expense.notes}</p>}
                  </div>
                  <p className="text-lg font-bold text-amber-600">${Number(expense.amount).toLocaleString()}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(expense)} className="flex-1 py-1.5 text-sm border border-border text-text-muted rounded-lg hover:bg-surface-hover">編輯</button>
                  <button onClick={() => handleDelete(expense.id)} disabled={deleting === expense.id} className="flex-1 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50">
                    {deleting === expense.id ? '刪除中...' : '刪除'}
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <div className="text-center py-12 text-text-muted">本月無支出記錄</div>}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text mb-4">{editingId ? '編輯支出' : '新增支出'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-muted mb-1">名目</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" placeholder="如：冷氣電費、教材印刷" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">金額</label>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">日期</label>
                  <input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">類別</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map(cat => (
                    <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })} className={`px-3 py-1 rounded-full text-xs ${form.category === cat ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" placeholder="或自行輸入類別" />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">備註</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text" placeholder="選填" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-border rounded-lg text-text">取消</button>
                <button onClick={handleSubmit} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium">{editingId ? '儲存' : '新增'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Pencil, Trash2, X, Settings } from 'lucide-react'
import type { CourseInfo, DaycareClass, DaycareData, DaycarePackage, DaycareStudentRow, OverdueStudent } from '../_types'
import { getMonthOptions, twDate, getOverdueLevel, getOverdueDays, getLastPrice, savePriceMemoryBatch } from '../_helpers'
import { OverdueBadge } from './overdue-badge'
import { ReminderButton } from './reminder-button'
import { OverdueBanner } from './overdue-banner'
import { StatBar } from './stat-bar'

// ─── 常用服務項目選項 ───────────────────────────────────────────────────────────
const COMMON_SERVICES = ['安親', '課輔', '餐食', '才藝', '自習']

// ─── 服務項目 Tag 顏色 ─────────────────────────────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
  '安親': 'bg-green-100 text-green-700',
  '課輔': 'bg-blue-100 text-blue-700',
  '餐食': 'bg-orange-100 text-orange-700',
  '才藝': 'bg-purple-100 text-purple-700',
  '自習': 'bg-yellow-100 text-yellow-700',
}
function getServiceColor(service: string) {
  return SERVICE_COLORS[service] || 'bg-gray-100 text-gray-600'
}

// ─── 套餐管理 Modal ─────────────────────────────────────────────────────────────

interface PackageModalProps {
  open: boolean
  onClose: () => void
  packages: DaycarePackage[]
  onSave: (pkg: Omit<DaycarePackage, 'id' | 'is_active'> & { id?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function PackageModal({ open, onClose, packages, onSave, onDelete }: PackageModalProps) {
  const [editing, setEditing] = useState<DaycarePackage | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [formName, setFormName] = useState('')
  const [formServices, setFormServices] = useState<string[]>([])
  const [formPrice, setFormPrice] = useState(0)
  const [formDesc, setFormDesc] = useState('')
  const [serviceInput, setServiceInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const resetForm = () => {
    setEditing(null)
    setIsNew(false)
    setFormName('')
    setFormServices([])
    setFormPrice(0)
    setFormDesc('')
    setServiceInput('')
  }

  const startNew = () => {
    resetForm()
    setIsNew(true)
  }

  const startEdit = (pkg: DaycarePackage) => {
    setEditing(pkg)
    setIsNew(false)
    setFormName(pkg.name)
    setFormServices([...pkg.services])
    setFormPrice(pkg.price)
    setFormDesc(pkg.description || '')
    setServiceInput('')
  }

  const addService = (svc: string) => {
    const trimmed = svc.trim()
    if (trimmed && !formServices.includes(trimmed)) {
      setFormServices([...formServices, trimmed])
    }
    setServiceInput('')
  }

  const removeService = (svc: string) => {
    setFormServices(formServices.filter(s => s !== svc))
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await onSave({
        id: editing?.id,
        name: formName.trim(),
        services: formServices,
        price: formPrice,
        description: formDesc.trim() || undefined,
      })
      resetForm()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await onDelete(id)
    } catch (e) {
      console.error(e)
    }
    setDeleting(null)
  }

  if (!open) return null

  const showForm = isNew || editing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#8FA895]" />
            套餐管理
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {showForm ? (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-text">{isNew ? '新增套餐' : '編輯套餐'}</h3>
              {/* Name */}
              <div>
                <label className="block text-xs text-text-muted mb-1">名稱</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40"
                  placeholder="例：基礎安親套餐"
                />
              </div>
              {/* Services */}
              <div>
                <label className="block text-xs text-text-muted mb-1">服務項目</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formServices.map(svc => (
                    <span key={svc} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getServiceColor(svc)}`}>
                      {svc}
                      <button onClick={() => removeService(svc)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {COMMON_SERVICES.filter(s => !formServices.includes(s)).map(s => (
                    <button
                      key={s}
                      onClick={() => addService(s)}
                      className="px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-[#8FA895] hover:text-[#8FA895] transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={e => setServiceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addService(serviceInput) } }}
                    className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40"
                    placeholder="自訂項目，Enter 加入"
                  />
                  <button
                    onClick={() => addService(serviceInput)}
                    disabled={!serviceInput.trim()}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    加入
                  </button>
                </div>
              </div>
              {/* Price */}
              <div>
                <label className="block text-xs text-text-muted mb-1">價格</label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={e => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40"
                  placeholder="0"
                  min={0}
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs text-text-muted mb-1">說明（選填）</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40 resize-none"
                  rows={2}
                  placeholder="套餐說明..."
                />
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="flex-1 py-2 bg-[#8FA895] text-white rounded-lg text-sm font-medium hover:bg-[#7a9680] disabled:opacity-50 transition-colors"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={startNew}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#8FA895] hover:text-[#8FA895] transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增套餐
              </button>

              {packages.length === 0 ? (
                <div className="py-8 text-center text-text-muted text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  尚無套餐，點擊上方按鈕新增
                </div>
              ) : (
                <div className="space-y-2">
                  {packages.map(pkg => (
                    <div key={pkg.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-text">{pkg.name}</span>
                        <span className="font-medium text-sm text-[#8FA895]">${pkg.price.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pkg.services.map(svc => (
                          <span key={svc} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getServiceColor(svc)}`}>
                            {svc}
                          </span>
                        ))}
                      </div>
                      {pkg.description && (
                        <div className="text-xs text-text-muted">{pkg.description}</div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => startEdit(pkg)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                          <Pencil className="w-3 h-3" /> 編輯
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          disabled={deleting === pkg.id}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> {deleting === pkg.id ? '刪除中...' : '刪除'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DaycareTab 主元件 ──────────────────────────────────────────────────────────

type BillingMode = 'package' | 'single'

export function DaycareTab() {
  const [daycareClasses, setDaycareClasses] = useState<DaycareClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [data, setData] = useState<DaycareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, number>>({})

  // 套餐/單點模式
  const [billingMode, setBillingMode] = useState<BillingMode>('single')
  const [packages, setPackages] = useState<DaycarePackage[]>([])
  const [studentPackages, setStudentPackages] = useState<Record<string, string>>({}) // studentId -> packageId
  const [packageModalOpen, setPackageModalOpen] = useState(false)

  const monthOptions = getMonthOptions()

  useEffect(() => {
    fetchClasses()
    fetchPackages()
  }, [])

  useEffect(() => {
    if (selectedClassId) fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedMonth])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/w8/courses?limit=100&type=daycare', { credentials: 'include' })
      if (!res.ok) {
        const res2 = await fetch('/api/w8/courses?limit=100', { credentials: 'include' })
        const d2 = await res2.json()
        const all: CourseInfo[] = d2.data?.courses || []
        const filtered = all.filter(c => c.course_type === 'daycare' || c.name.includes('安親'))
        const classes: DaycareClass[] = filtered.map(c => ({
          id: c.id,
          name: c.name,
          fee_monthly: c.fee_monthly || 0,
        }))
        setDaycareClasses(classes)
        if (classes.length > 0) setSelectedClassId(classes[0].id)
        setLoading(false)
        return
      }
      const d = await res.json()
      const classes: DaycareClass[] = (d.data?.courses || []).map((c: CourseInfo) => ({
        id: c.id,
        name: c.name,
        fee_monthly: c.fee_monthly || 0,
      }))
      setDaycareClasses(classes)
      if (classes.length > 0) setSelectedClassId(classes[0].id)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/admin/billing/daycare-packages', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const pkgs: DaycarePackage[] = json.data?.packages || json.data || []
        setPackages(pkgs.filter(p => p.is_active !== false))
      }
    } catch {
      // API 尚未實作或 Demo 模式，容錯用空陣列
      setPackages([])
    }
  }

  const fetchData = async () => {
    if (!selectedClassId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/billing/course/${selectedClassId}?periodMonth=${selectedMonth}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (json.success) {
        const cls = daycareClasses.find(c => c.id === selectedClassId)
        const fee = cls?.fee_monthly || json.data?.course?.fee_monthly || 0
        const students: DaycareStudentRow[] = json.data.students
        const paid = students.filter(s => s.payment_id).reduce((a, s) => a + (s.paid_amount || 0), 0)
        const unpaid = students.filter(s => !s.payment_id).length * fee
        setData({
          daycareClass: { id: selectedClassId, name: json.data.course.name, fee_monthly: fee },
          students,
          stats: { total: students.length, paid, unpaid, overdue: 0 },
        })
        const newSel: Record<string, boolean> = {}
        const newAmt: Record<string, number> = {}
        students.forEach(s => {
          newSel[s.id] = !s.payment_id
          const remembered = getLastPrice(selectedClassId, s.id)
          newAmt[s.id] = s.paid_amount || (remembered?.amount ?? fee)
        })
        setSelected(newSel)
        setAmounts(newAmt)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handlePackageSave = useCallback(async (pkg: Omit<DaycarePackage, 'id' | 'is_active'> & { id?: string }) => {
    const isEdit = !!pkg.id
    const method = isEdit ? 'PUT' : 'POST'
    const url = isEdit
      ? `/api/admin/billing/daycare-packages/${pkg.id}`
      : '/api/admin/billing/daycare-packages'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pkg),
      })
      if (res.ok) {
        await fetchPackages()
      }
    } catch {
      // 容錯：API 未實作時先更新本地狀態
      if (isEdit) {
        setPackages(prev => prev.map(p =>
          p.id === pkg.id ? { ...p, ...pkg, id: pkg.id!, is_active: true } : p
        ))
      } else {
        const newPkg: DaycarePackage = {
          id: `local-${Date.now()}`,
          name: pkg.name,
          services: pkg.services,
          price: pkg.price,
          description: pkg.description,
          is_active: true,
        }
        setPackages(prev => [...prev, newPkg])
      }
    }
  }, [])

  const handlePackageDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/billing/daycare-packages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        await fetchPackages()
        return
      }
    } catch {
      // 容錯
    }
    // 本地移除
    setPackages(prev => prev.filter(p => p.id !== id))
  }, [])

  const handleStudentPackageChange = (studentId: string, packageId: string) => {
    setStudentPackages(prev => ({ ...prev, [studentId]: packageId }))
    const pkg = packages.find(p => p.id === packageId)
    if (pkg) {
      setAmounts(prev => ({ ...prev, [studentId]: pkg.price }))
    }
  }

  const handleSubmit = async () => {
    if (!data) return
    const records = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([studentId]) => ({
        studentId,
        courseId: selectedClassId,
        paymentType: 'monthly',
        amount: amounts[studentId] || data.daycareClass.fee_monthly,
        periodMonth: selectedMonth,
        paymentDate: new Date().toISOString().split('T')[0],
      }))
    if (records.length === 0) { showMsg('請選擇至少一位學生'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/billing/payment-records/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ records }),
      })
      const json = await res.json()
      if (json.success) {
        savePriceMemoryBatch(records)
        showMsg(`成功建立 ${json.data.created} 筆繳費記錄`)
        fetchData()
      }
      else showMsg('建立失敗：' + (json.error?.message || '未知錯誤'))
    } catch (e) { console.error(e); showMsg('建立失敗') }
    setSubmitting(false)
  }

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000) }

  const allSelected = Object.values(selected).every(Boolean)
  const handleSelectAll = () => {
    const newSel: Record<string, boolean> = {}
    data?.students.forEach(s => { newSel[s.id] = !allSelected && !s.payment_id })
    setSelected(newSel)
  }

  // 計算遲繳學生清單
  const overdueStudents: OverdueStudent[] = (data?.students || [])
    .filter(s => {
      const level = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)
      return level !== null
    })
    .map(s => {
      const level = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)!
      const periodMonth = s.period_month || selectedMonth
      return {
        id: s.id,
        full_name: s.full_name,
        grade_level: s.grade_level,
        level,
        periodMonth,
        overdueDays: (level === 'critical' || level === 'overdue')
          ? getOverdueDays(periodMonth)
          : undefined,
      }
    })

  if (loading && !data) {
    return <div className="py-8 text-center text-text-muted text-sm">讀取中...</div>
  }

  if (daycareClasses.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        <div className="text-4xl mb-3">🏫</div>
        <div>尚無安親班課程</div>
        <div className="text-xs mt-1">請先在課程管理新增安親班課程</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
        >
          {daycareClasses.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}（月費 ${c.fee_monthly.toLocaleString()}）
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
        >
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Mode Toggle + 管理套餐 */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setBillingMode('package')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              billingMode === 'package'
                ? 'bg-[#8FA895] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            套餐模式
          </button>
          <button
            onClick={() => setBillingMode('single')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              billingMode === 'single'
                ? 'bg-[#8FA895] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            單點模式
          </button>
        </div>
        <button
          onClick={() => setPackageModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#8FA895] border border-[#8FA895] rounded-lg hover:bg-[#8FA895]/10 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          管理套餐
        </button>
      </div>

      {/* Overdue Banner */}
      {overdueStudents.length > 0 && <OverdueBanner students={overdueStudents} />}

      {/* Stats */}
      {data && (
        <StatBar paid={data.stats.paid} unpaid={data.stats.unpaid} overdue={data.stats.overdue} />
      )}

      {/* Message */}
      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      {/* Student list */}
      {data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">全選未繳</span>
            </label>
            <span className="text-xs text-text-muted">已選 {Object.values(selected).filter(Boolean).length} 人</span>
          </div>

          {data.students.map(s => {
            const overdueLevel = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)
            const overdueDays = overdueLevel && overdueLevel !== 'pending'
              ? getOverdueDays(s.period_month || selectedMonth)
              : undefined

            return (
              <div
                key={s.id}
                className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                  s.payment_id
                    ? 'border-green-200 bg-green-50'
                    : overdueLevel === 'critical'
                    ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/40'
                    : overdueLevel === 'overdue'
                    ? 'border-l-4 border-l-orange-400 border-orange-200'
                    : 'border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected[s.id] || false}
                  onChange={e => setSelected({ ...selected, [s.id]: e.target.checked })}
                  disabled={!!s.payment_id}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text text-sm">{s.full_name}</div>
                  <div className="text-xs text-text-muted">{s.grade_level}</div>
                  {overdueDays != null && overdueDays > 0 && (
                    <div className="text-xs text-red-400 mt-0.5">逾期 {overdueDays} 天</div>
                  )}
                </div>
                {s.payment_id ? (
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-600">已繳 ${s.paid_amount?.toLocaleString()}</div>
                    {s.payment_date && (
                      <div className="text-xs text-text-muted">{twDate(s.payment_date)}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {overdueLevel && (
                      <OverdueBadge level={overdueLevel} />
                    )}
                    {(overdueLevel === 'critical' || overdueLevel === 'overdue') && (
                      <ReminderButton studentId={s.id} studentName={s.full_name} />
                    )}
                    <div className="flex flex-col items-end gap-0.5">
                      {billingMode === 'package' && packages.length > 0 ? (
                        <>
                          <select
                            value={studentPackages[s.id] || ''}
                            onChange={e => handleStudentPackageChange(s.id, e.target.value)}
                            className="w-32 px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40"
                          >
                            <option value="">選擇套餐</option>
                            {packages.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name}（${pkg.price.toLocaleString()}）
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-[#8FA895] font-medium">
                            ${(amounts[s.id] || 0).toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <>
                          <input
                            type="number"
                            value={amounts[s.id] || 0}
                            onChange={e => setAmounts({ ...amounts, [s.id]: Number(e.target.value) })}
                            className="w-24 px-2 py-1 border border-border rounded text-right text-sm"
                            placeholder="金額"
                          />
                          {!s.payment_id && (() => { const lp = getLastPrice(selectedClassId, s.id); return lp ? <span className="text-xs text-text-muted">上次: NT${lp.amount.toLocaleString()}</span> : null })()}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Submit */}
      {data && Object.values(selected).some(Boolean) && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
        >
          {submitting ? '處理中...' : `記錄已繳費（${Object.values(selected).filter(Boolean).length}人）`}
        </button>
      )}

      {/* Package Modal */}
      <PackageModal
        open={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        packages={packages}
        onSave={handlePackageSave}
        onDelete={handlePackageDelete}
      />
    </div>
  )
}

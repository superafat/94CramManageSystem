'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type HQTab = 'account-review' | 'branch-management'

type AccountStatus = 'pending' | 'approved' | 'rejected'
type FranchiseStatus = 'paid' | 'overdue' | 'warning' | 'suspended'
type BranchStatus = 'active' | 'suspended' | 'pending'

interface PendingAccount {
  id: string
  username: string
  name: string
  email: string
  role: string
  tenantName: string
  tenantId: string
  appliedAt: string
  status: AccountStatus
  reviewNote?: string
  reviewedAt?: string
}

interface BranchInfo {
  id: string
  tenantId: string
  name: string
  slug: string
  address: string
  phone: string
  adminName: string
  adminEmail: string
  status: BranchStatus
  franchiseStatus: FranchiseStatus
  franchiseFee: number
  lastPaidAt: string | null
  overdueCount: number
  nextDueAt: string
  studentCount: number
  courseCount: number
  staffCount: number
  createdAt: string
  monthlyRevenue: number
}

interface NewBranchForm {
  name: string
  contactName: string
  contactEmail: string
  address: string
  phone: string
  franchiseFee: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_PENDING_ACCOUNTS: PendingAccount[] = [
  {
    id: 'acc-001',
    username: 'chen_manager',
    name: '陳志明',
    email: 'chen@hsinchu-cram.com',
    role: 'admin',
    tenantName: '新竹光明補習班',
    tenantId: 'tenant-hc-001',
    appliedAt: '2026-03-02T09:15:00Z',
    status: 'pending',
  },
  {
    id: 'acc-002',
    username: 'lin_admin',
    name: '林淑慧',
    email: 'lin@taichung-cram.com',
    role: 'admin',
    tenantName: '台中文賢補習班',
    tenantId: 'tenant-tc-001',
    appliedAt: '2026-03-01T14:30:00Z',
    status: 'pending',
  },
  {
    id: 'acc-003',
    username: 'wang_director',
    name: '王建國',
    email: 'wang@kaohsiung-cram.com',
    role: 'admin',
    tenantName: '高雄鳳山補習班',
    tenantId: 'tenant-ks-001',
    appliedAt: '2026-02-28T10:00:00Z',
    status: 'approved',
    reviewNote: '資料齊全，正式開通',
    reviewedAt: '2026-02-28T16:00:00Z',
  },
  {
    id: 'acc-004',
    username: 'huang_staff',
    name: '黃雅婷',
    email: 'huang@taipei-north.com',
    role: 'staff',
    tenantName: '台北北區補習班',
    tenantId: 'tenant-tp-001',
    appliedAt: '2026-03-02T11:00:00Z',
    status: 'pending',
  },
]

const DEMO_BRANCHES: BranchInfo[] = [
  {
    id: 'branch-001',
    tenantId: 'tenant-tp-001',
    name: '台北北區總館',
    slug: 'taipei-north',
    address: '台北市中山區中山北路二段 30 號',
    phone: '02-2551-8888',
    adminName: '張明德',
    adminEmail: 'chang@taipei-north.com',
    status: 'active',
    franchiseStatus: 'paid',
    franchiseFee: 50000,
    lastPaidAt: '2026-03-01T00:00:00Z',
    overdueCount: 0,
    nextDueAt: '2026-04-01T00:00:00Z',
    studentCount: 128,
    courseCount: 12,
    staffCount: 8,
    createdAt: '2024-09-01T00:00:00Z',
    monthlyRevenue: 380000,
  },
  {
    id: 'branch-002',
    tenantId: 'tenant-hc-001',
    name: '新竹光明補習班',
    slug: 'hsinchu-cram',
    address: '新竹市東區光明路 145 號',
    phone: '03-523-6666',
    adminName: '陳志明',
    adminEmail: 'chen@hsinchu-cram.com',
    status: 'active',
    franchiseStatus: 'overdue',
    franchiseFee: 50000,
    lastPaidAt: '2026-01-01T00:00:00Z',
    overdueCount: 2,
    nextDueAt: '2026-02-01T00:00:00Z',
    studentCount: 76,
    courseCount: 8,
    staffCount: 5,
    createdAt: '2025-01-15T00:00:00Z',
    monthlyRevenue: 210000,
  },
  {
    id: 'branch-003',
    tenantId: 'tenant-tc-001',
    name: '台中文賢補習班',
    slug: 'taichung-cram',
    address: '台中市西屯區文賢路 88 號',
    phone: '04-2356-9999',
    adminName: '林淑慧',
    adminEmail: 'lin@taichung-cram.com',
    status: 'pending',
    franchiseStatus: 'warning',
    franchiseFee: 50000,
    lastPaidAt: '2026-02-01T00:00:00Z',
    overdueCount: 1,
    nextDueAt: '2026-03-01T00:00:00Z',
    studentCount: 54,
    courseCount: 6,
    staffCount: 4,
    createdAt: '2025-06-01T00:00:00Z',
    monthlyRevenue: 145000,
  },
  {
    id: 'branch-004',
    tenantId: 'tenant-ks-001',
    name: '高雄鳳山補習班',
    slug: 'kaohsiung-cram',
    address: '高雄市鳳山區中山路 200 號',
    phone: '07-776-5555',
    adminName: '王建國',
    adminEmail: 'wang@kaohsiung-cram.com',
    status: 'suspended',
    franchiseStatus: 'suspended',
    franchiseFee: 50000,
    lastPaidAt: '2025-11-01T00:00:00Z',
    overdueCount: 3,
    nextDueAt: '2025-12-01T00:00:00Z',
    studentCount: 0,
    courseCount: 0,
    staffCount: 2,
    createdAt: '2025-03-01T00:00:00Z',
    monthlyRevenue: 0,
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatCurrency(amount: number) {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

const ACCOUNT_STATUS_BADGE: Record<AccountStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  approved: 'bg-green-100 text-green-700 border border-green-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
}

const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  pending: '待審核',
  approved: '已通過',
  rejected: '已駁回',
}

const FRANCHISE_STATUS_BADGE: Record<FranchiseStatus, string> = {
  paid: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  overdue: 'bg-orange-100 text-orange-700 border border-orange-200',
  suspended: 'bg-red-100 text-red-700 border border-red-200',
}

const FRANCHISE_STATUS_LABEL: Record<FranchiseStatus, string> = {
  paid: '已繳清',
  warning: '即將到期',
  overdue: '逾期未繳',
  suspended: '已停用',
}

const BRANCH_STATUS_BADGE: Record<BranchStatus, string> = {
  active: 'bg-green-100 text-green-700 border border-green-200',
  pending: 'bg-blue-100 text-blue-700 border border-blue-200',
  suspended: 'bg-red-100 text-red-700 border border-red-200',
}

const BRANCH_STATUS_LABEL: Record<BranchStatus, string> = {
  active: '正常營運',
  pending: '審核中',
  suspended: '已停用',
}

const ROLE_LABEL: Record<string, string> = {
  admin: '館長（業者）',
  staff: '行政人員',
  teacher: '教師',
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm max-w-xs border transition-all ${
            t.type === 'success'
              ? 'bg-[#eef6ee] border-[#a8d4a8] text-[#2d5a3a]'
              : t.type === 'warning'
              ? 'bg-[#fff8e6] border-[#e8c878] text-[#6b4d00]'
              : t.type === 'error'
              ? 'bg-[#fdf0f0] border-[#e8a8a8] text-[#6b2020]'
              : 'bg-[#f5f2ef] border-[#d4cfc9] text-[#4a3f35]'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-xs opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Review Modal ──────────────────────────────────────────────────────────────

function AccountReviewModal({
  account,
  onClose,
  onDone,
}: {
  account: PendingAccount
  onClose: () => void
  onDone: (id: string, action: 'approved' | 'rejected', note: string) => void
}) {
  const [action, setAction] = useState<'approved' | 'rejected'>('approved')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (action === 'rejected' && !note.trim()) {
      setError('駁回時必須填寫原因')
      return
    }
    setSubmitting(true)
    try {
      await fetch(`/api/admin/headquarters/accounts/${account.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, note: note.trim() }),
      })
    } catch {
      // 前端模擬
    }
    onDone(account.id, action, note.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-[#4a3f35] mb-1">帳號審核</h2>
        <div className="bg-[#f5f2ef] rounded-xl p-3 mb-4 text-sm space-y-1">
          <p><span className="text-[#8a8078]">申請人：</span><span className="font-medium text-[#4a3f35]">{account.name}</span></p>
          <p><span className="text-[#8a8078]">帳號：</span><span className="text-[#4a3f35]">{account.username}</span></p>
          <p><span className="text-[#8a8078]">Email：</span><span className="text-[#4a3f35]">{account.email}</span></p>
          <p><span className="text-[#8a8078]">角色：</span><span className="text-[#4a3f35]">{ROLE_LABEL[account.role] || account.role}</span></p>
          <p><span className="text-[#8a8078]">所屬分校：</span><span className="text-[#4a3f35]">{account.tenantName}</span></p>
          <p><span className="text-[#8a8078]">申請時間：</span><span className="text-[#4a3f35]">{formatDate(account.appliedAt)}</span></p>
        </div>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAction('approved')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              action === 'approved'
                ? 'bg-[#d4e6d3] border-[#4a7c59] text-[#4a7c59]'
                : 'bg-white border-[#d4cfc9] text-[#6b6560]'
            }`}
          >
            ✅ 批准開通
          </button>
          <button
            onClick={() => setAction('rejected')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              action === 'rejected'
                ? 'bg-[#f0d6d6] border-[#a54a4a] text-[#a54a4a]'
                : 'bg-white border-[#d4cfc9] text-[#6b6560]'
            }`}
          >
            ❌ 駁回申請
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setError('') }}
          placeholder={action === 'rejected' ? '請填寫駁回原因（必填）' : '審核備註（選填）'}
          rows={3}
          className="w-full border border-[#d4cfc9] rounded-lg px-3 py-2 text-sm text-[#4a3f35] resize-none focus:outline-none focus:ring-2 focus:ring-[#b0a899]"
        />
        {error && <p className="text-xs text-[#a54a4a] mt-1">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#d4cfc9] rounded-lg text-sm text-[#6b6560] hover:bg-[#f5f2ef]"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2 bg-[#8b7d6b] text-white rounded-lg text-sm font-medium hover:bg-[#7a6c5b] disabled:opacity-50"
          >
            {submitting ? '處理中…' : '送出審核'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Branch Modal ──────────────────────────────────────────────────────────

function NewBranchModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (branch: BranchInfo) => void
}) {
  const [form, setForm] = useState<NewBranchForm>({
    name: '',
    contactName: '',
    contactEmail: '',
    address: '',
    phone: '',
    franchiseFee: '50000',
  })
  const [errors, setErrors] = useState<Partial<NewBranchForm>>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const e: Partial<NewBranchForm> = {}
    if (!form.name.trim()) e.name = '請填寫分校名稱'
    if (!form.contactName.trim()) e.contactName = '請填寫聯絡人姓名'
    if (!form.contactEmail.trim()) e.contactEmail = '請填寫 Email'
    if (!form.address.trim()) e.address = '請填寫地址'
    if (!form.phone.trim()) e.phone = '請填寫電話'
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)
    try {
      await fetch('/api/admin/headquarters/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
    } catch {
      // 前端模擬
    }
    const newBranch: BranchInfo = {
      id: `branch-${Date.now()}`,
      tenantId: `tenant-new-${Date.now()}`,
      name: form.name,
      slug: form.name.toLowerCase().replace(/\s+/g, '-'),
      address: form.address,
      phone: form.phone,
      adminName: form.contactName,
      adminEmail: form.contactEmail,
      status: 'pending',
      franchiseStatus: 'warning',
      franchiseFee: parseInt(form.franchiseFee) || 50000,
      lastPaidAt: null,
      overdueCount: 0,
      nextDueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      studentCount: 0,
      courseCount: 0,
      staffCount: 0,
      createdAt: new Date().toISOString(),
      monthlyRevenue: 0,
    }
    onDone(newBranch)
    setSubmitting(false)
  }

  const field = (
    key: keyof NewBranchForm,
    label: string,
    placeholder: string,
    type = 'text'
  ) => (
    <div>
      <label className="block text-xs font-medium text-[#6b6560] mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setErrors({ ...errors, [key]: undefined }) }}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#b0a899] ${
          errors[key] ? 'border-[#e0a8a8]' : 'border-[#d4cfc9]'
        }`}
      />
      {errors[key] && <p className="text-xs text-[#a54a4a] mt-0.5">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[#4a3f35] mb-4">新增分校</h2>
        <div className="space-y-3">
          {field('name', '分校名稱 *', '例：台南府城補習班')}
          {field('contactName', '聯絡人姓名 *', '館長姓名')}
          {field('contactEmail', '聯絡人 Email *', 'example@cram.com', 'email')}
          {field('address', '地址 *', '縣市區路號')}
          {field('phone', '電話 *', '例：06-123-4567')}
          {field('franchiseFee', '加盟金（元）', '50000', 'number')}
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#d4cfc9] rounded-lg text-sm text-[#6b6560] hover:bg-[#f5f2ef]"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2 bg-[#9DAEBB] text-white rounded-lg text-sm font-medium hover:bg-[#8d9eab] disabled:opacity-50"
          >
            {submitting ? '建立中…' : '確認建立'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Branch Detail Modal ───────────────────────────────────────────────────────

function BranchDetailModal({
  branch,
  onClose,
  onUrge,
}: {
  branch: BranchInfo
  onClose: () => void
  onUrge: (id: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#4a3f35]">{branch.name}</h2>
            <p className="text-xs text-[#8a8078] mt-0.5">{branch.slug}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BRANCH_STATUS_BADGE[branch.status]}`}>
              {BRANCH_STATUS_LABEL[branch.status]}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FRANCHISE_STATUS_BADGE[branch.franchiseStatus]}`}>
              {FRANCHISE_STATUS_LABEL[branch.franchiseStatus]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#f5f2ef] rounded-xl p-3">
            <p className="text-xs text-[#8a8078] mb-0.5">學生人數</p>
            <p className="text-xl font-bold text-[#4a3f35]">{branch.studentCount}</p>
          </div>
          <div className="bg-[#f5f2ef] rounded-xl p-3">
            <p className="text-xs text-[#8a8078] mb-0.5">本月營收</p>
            <p className="text-xl font-bold text-[#4a3f35]">{formatCurrency(branch.monthlyRevenue)}</p>
          </div>
          <div className="bg-[#f5f2ef] rounded-xl p-3">
            <p className="text-xs text-[#8a8078] mb-0.5">開設課程</p>
            <p className="text-xl font-bold text-[#4a3f35]">{branch.courseCount}</p>
          </div>
          <div className="bg-[#f5f2ef] rounded-xl p-3">
            <p className="text-xs text-[#8a8078] mb-0.5">人員編制</p>
            <p className="text-xl font-bold text-[#4a3f35]">{branch.staffCount} 人</p>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex gap-2">
            <span className="text-[#8a8078] w-20 shrink-0">地址</span>
            <span className="text-[#4a3f35]">{branch.address}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#8a8078] w-20 shrink-0">電話</span>
            <span className="text-[#4a3f35]">{branch.phone}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#8a8078] w-20 shrink-0">管理員</span>
            <span className="text-[#4a3f35]">{branch.adminName}（{branch.adminEmail}）</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#8a8078] w-20 shrink-0">建立日期</span>
            <span className="text-[#4a3f35]">{formatDateShort(branch.createdAt)}</span>
          </div>
        </div>

        <div className="bg-[#fff8e6] border border-[#e8c878] rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-[#6b4d00] mb-1">加盟金狀況</p>
          <div className="flex justify-between text-sm">
            <span className="text-[#8a8078]">加盟金金額</span>
            <span className="font-medium text-[#4a3f35]">{formatCurrency(branch.franchiseFee)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-[#8a8078]">上次繳費</span>
            <span className="text-[#4a3f35]">{branch.lastPaidAt ? formatDateShort(branch.lastPaidAt) : '未曾繳費'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-[#8a8078]">下次到期</span>
            <span className="text-[#4a3f35]">{formatDateShort(branch.nextDueAt)}</span>
          </div>
          {branch.overdueCount > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-[#8a8078]">催繳次數</span>
              <span className={`font-medium ${branch.overdueCount >= 3 ? 'text-[#a54a4a]' : 'text-[#8a6d00]'}`}>
                {branch.overdueCount} / 3 次
                {branch.overdueCount >= 3 && '（已達上限，系統暫停中）'}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {(branch.franchiseStatus === 'overdue' || branch.franchiseStatus === 'warning') && branch.overdueCount < 3 && (
            <button
              onClick={() => { onUrge(branch.id); onClose() }}
              className="flex-1 py-2 bg-[#f0d6d6] text-[#a54a4a] rounded-lg text-sm font-medium hover:bg-[#e0c6c6] border border-[#e0a8a8]"
            >
              催繳加盟金
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#d4cfc9] rounded-lg text-sm text-[#6b6560] hover:bg-[#f5f2ef]"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Account Review Tab ────────────────────────────────────────────────────────

function AccountReviewTab({
  accounts,
  onReview,
}: {
  accounts: PendingAccount[]
  onReview: (id: string, action: 'approved' | 'rejected', note: string) => void
}) {
  const [reviewTarget, setReviewTarget] = useState<PendingAccount | null>(null)
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'all'>('all')

  const filtered = filterStatus === 'all' ? accounts : accounts.filter((a) => a.status === filterStatus)
  const pendingCount = accounts.filter((a) => a.status === 'pending').length

  return (
    <div className="space-y-4">
      {reviewTarget && (
        <AccountReviewModal
          account={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onDone={(id, action, note) => {
            onReview(id, action, note)
            setReviewTarget(null)
          }}
        />
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#fff8e6] border border-[#e8c878] rounded-xl text-sm text-[#6b4d00]">
          <span>⚠️</span>
          <span>目前有 <strong>{pendingCount}</strong> 個帳號申請等待審核，分校管理員帳號需總部審核後才會開通。</span>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <span className="text-sm text-[#6b6560]">篩選：</span>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-[#9DAEBB] text-white'
                : 'bg-[#f5f2ef] text-[#6b6560] hover:bg-[#e8e4de]'
            }`}
          >
            {s === 'all' ? '全部' : ACCOUNT_STATUS_LABEL[s]}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-yellow-400 text-yellow-900 rounded-full px-1.5 text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#8a8078]">
          <div className="text-4xl mb-3">👤</div>
          <p>目前沒有帳號申請</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((account) => (
            <div
              key={account.id}
              className={`bg-white rounded-xl border p-4 ${
                account.status === 'pending' ? 'border-[#e8c878]' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-[#4a3f35] text-sm">{account.name}</span>
                    <span className="text-xs text-[#8a8078]">@{account.username}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_STATUS_BADGE[account.status]}`}>
                      {ACCOUNT_STATUS_LABEL[account.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#8a8078]">
                    <span>角色：{ROLE_LABEL[account.role] || account.role}</span>
                    <span>所屬：{account.tenantName}</span>
                    <span>申請時間：{formatDate(account.appliedAt)}</span>
                  </div>
                  {account.reviewNote && (
                    <p className="text-xs text-[#6b6560] mt-1 bg-[#f5f2ef] rounded-lg px-2 py-1 inline-block">
                      審核備註：{account.reviewNote}
                    </p>
                  )}
                </div>
                {account.status === 'pending' && (
                  <button
                    onClick={() => setReviewTarget(account)}
                    className="shrink-0 px-3 py-1.5 bg-[#9DAEBB] text-white text-xs rounded-lg hover:bg-[#8d9eab] font-medium"
                  >
                    審核
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Branch Management Tab ─────────────────────────────────────────────────────

function BranchManagementTab({
  branches,
  onAdd,
  onUrge,
}: {
  branches: BranchInfo[]
  onAdd: (branch: BranchInfo) => void
  onUrge: (id: string) => void
}) {
  const [showNewBranch, setShowNewBranch] = useState(false)
  const [detailBranch, setDetailBranch] = useState<BranchInfo | null>(null)
  const [filterStatus, setFilterStatus] = useState<BranchStatus | 'all'>('all')

  const filtered = filterStatus === 'all' ? branches : branches.filter((b) => b.status === filterStatus)
  const overdueCount = branches.filter((b) => b.franchiseStatus === 'overdue' || b.franchiseStatus === 'suspended').length

  return (
    <div className="space-y-4">
      {showNewBranch && (
        <NewBranchModal
          onClose={() => setShowNewBranch(false)}
          onDone={(branch) => { onAdd(branch); setShowNewBranch(false) }}
        />
      )}
      {detailBranch && (
        <BranchDetailModal
          branch={detailBranch}
          onClose={() => setDetailBranch(null)}
          onUrge={onUrge}
        />
      )}

      {/* 加盟金警示 */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#fdf0f0] border border-[#e8a8a8] rounded-xl text-sm text-[#6b2020]">
          <span>🚨</span>
          <span>有 <strong>{overdueCount}</strong> 間分校加盟金逾期或已停用，請儘速處理。</span>
        </div>
      )}

      {/* 操作列 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-[#6b6560]">狀態：</span>
          {(['all', 'active', 'pending', 'suspended'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-[#9DAEBB] text-white'
                  : 'bg-[#f5f2ef] text-[#6b6560] hover:bg-[#e8e4de]'
              }`}
            >
              {s === 'all' ? '全部' : BRANCH_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewBranch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#9DAEBB] text-white text-sm rounded-xl hover:bg-[#8d9eab] font-medium"
        >
          ＋ 新增分校
        </button>
      </div>

      {/* 統計卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '全部分校', value: branches.length, color: 'bg-[#e8f0f6] text-[#3a5f7a]' },
          { label: '正常營運', value: branches.filter((b) => b.status === 'active').length, color: 'bg-[#eef6ee] text-[#2d5a3a]' },
          { label: '加盟金逾期', value: branches.filter((b) => b.franchiseStatus === 'overdue').length, color: 'bg-[#fff8e6] text-[#6b4d00]' },
          { label: '系統停用', value: branches.filter((b) => b.status === 'suspended').length, color: 'bg-[#fdf0f0] text-[#6b2020]' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-3 ${color}`}>
            <p className="text-xs opacity-80">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* 分校清單 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#8a8078]">
          <div className="text-4xl mb-3">🏢</div>
          <p>目前沒有分校資料</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((branch) => (
            <div
              key={branch.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer ${
                branch.franchiseStatus === 'overdue' || branch.franchiseStatus === 'suspended'
                  ? 'border-[#e8a8a8]'
                  : branch.franchiseStatus === 'warning'
                  ? 'border-[#e8c878]'
                  : 'border-gray-100'
              }`}
              onClick={() => setDetailBranch(branch)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-[#4a3f35]">{branch.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BRANCH_STATUS_BADGE[branch.status]}`}>
                      {BRANCH_STATUS_LABEL[branch.status]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FRANCHISE_STATUS_BADGE[branch.franchiseStatus]}`}>
                      {FRANCHISE_STATUS_LABEL[branch.franchiseStatus]}
                    </span>
                    {branch.overdueCount >= 3 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        ⚠️ 催繳3次已停用
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#8a8078]">
                    <span>管理員：{branch.adminName}</span>
                    <span>學生：{branch.studentCount} 人</span>
                    <span>建立：{formatDateShort(branch.createdAt)}</span>
                    {branch.overdueCount > 0 && (
                      <span className="text-[#a54a4a]">催繳 {branch.overdueCount} 次</span>
                    )}
                  </div>
                  <div className="text-xs text-[#8a8078] mt-0.5">{branch.address}</div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-sm font-medium text-[#4a3f35]">{formatCurrency(branch.monthlyRevenue)}</span>
                  <span className="text-xs text-[#8a8078]">本月營收</span>
                  {(branch.franchiseStatus === 'overdue' || branch.franchiseStatus === 'warning') && branch.overdueCount < 3 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUrge(branch.id) }}
                      className="px-2 py-1 bg-[#f0d6d6] text-[#a54a4a] text-xs rounded-lg hover:bg-[#e0c6c6] border border-[#e0a8a8]"
                    >
                      催繳
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HeadquartersPage() {
  const [tab, setTab] = useState<HQTab>('account-review')
  const [accounts, setAccounts] = useState<PendingAccount[]>(DEMO_PENDING_ACCOUNTS)
  const [branches, setBranches] = useState<BranchInfo[]>(DEMO_BRANCHES)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 初始化：嘗試從後端取得資料
  useEffect(() => {
    const loadData = async () => {
      try {
        const [accRes, branchRes] = await Promise.all([
          fetch('/api/admin/headquarters/accounts', { credentials: 'include' }),
          fetch('/api/admin/headquarters/branches', { credentials: 'include' }),
        ])
        const [accData, branchData] = await Promise.all([accRes.json(), branchRes.json()])
        if (accData.success && accData.data?.length > 0) setAccounts(accData.data)
        if (branchData.success && branchData.data?.length > 0) setBranches(branchData.data)
      } catch {
        // 使用 Demo 假資料
      }
    }
    loadData()
  }, [])

  const handleAccountReview = (id: string, action: 'approved' | 'rejected', note: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: action, reviewNote: note, reviewedAt: new Date().toISOString() }
          : a
      )
    )
    addToast(
      action === 'approved' ? `✅ 已批准帳號開通` : `❌ 已駁回帳號申請`,
      action === 'approved' ? 'success' : 'warning'
    )
  }

  const handleAddBranch = (branch: BranchInfo) => {
    setBranches((prev) => [branch, ...prev])
    addToast(`🏢 已新增分校「${branch.name}」`, 'success')
  }

  const handleUrge = (branchId: string) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id !== branchId) return b
        const newCount = b.overdueCount + 1
        return {
          ...b,
          overdueCount: newCount,
          status: newCount >= 3 ? 'suspended' : b.status,
          franchiseStatus: newCount >= 3 ? 'suspended' : b.franchiseStatus,
        }
      })
    )
    const branch = branches.find((b) => b.id === branchId)
    const newCount = (branch?.overdueCount ?? 0) + 1
    if (newCount >= 3) {
      addToast(`🚨「${branch?.name}」催繳已達 3 次，系統使用權已自動停用。`, 'error')
    } else {
      addToast(`📨 已向「${branch?.name}」發送第 ${newCount} 次加盟金催繳通知。`, 'warning')
    }
  }

  const pendingAccountCount = accounts.filter((a) => a.status === 'pending').length
  const overdueCount = branches.filter((b) => b.franchiseStatus === 'overdue').length

  const tabs: { key: HQTab; label: string; badge?: number }[] = [
    { key: 'account-review', label: '帳號審核', badge: pendingAccountCount },
    { key: 'branch-management', label: '分校管理', badge: overdueCount > 0 ? overdueCount : undefined },
  ]

  return (
    <div className="space-y-4 p-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#4a3f35]">🏢 總部管理</h1>
          <p className="text-xs text-[#8a8078] mt-0.5">管理帳號審核、分校資訊與加盟金狀態</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f5f2ef] rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-[#4a3f35] shadow-sm'
                : 'text-[#8a8078] hover:text-[#4a3f35]'
            }`}
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold leading-none">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'account-review' && (
        <AccountReviewTab accounts={accounts} onReview={handleAccountReview} />
      )}
      {tab === 'branch-management' && (
        <BranchManagementTab branches={branches} onAdd={handleAddBranch} onUrge={handleUrge} />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'

// ─── Types ─────────────────────────────────────────────────────────────────────

type HQTab = 'users' | 'branches' | 'archived' | 'franchise'

type UserStatus = 'active' | 'pending' | 'suspended'
type UserRole = 'superadmin' | 'admin' | 'staff' | 'teacher' | 'parent' | 'student'
type BranchStatus = 'active' | 'suspended' | 'pending'
type FranchiseStatus = 'paid' | 'overdue' | 'warning' | 'suspended'
type PaymentStatus = 'paid' | 'overdue' | 'pending'

interface UserRecord {
  id: string
  name: string
  email: string
  role: UserRole
  tenantName: string
  status: UserStatus
  createdAt: string
}

interface BranchInfo {
  id: string
  name: string
  code: string
  address: string
  managerName: string
  studentCount: number
  teacherCount: number
  monthlyRevenue: number
  status: BranchStatus
}

interface ArchivedRecord {
  id: string
  branchName: string
  dataType: string
  description: string
  deletedBy: string
  deletedAt: string
  restoreDeadline: string
}

interface FranchiseFeeRecord {
  id: string
  branchName: string
  plan: string
  monthlyFee: number
  dueDate: string
  paymentStatus: PaymentStatus
  overdueDays: number
  urgeCount: number
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_USERS: UserRecord[] = [
  {
    id: 'u-001',
    name: '張明德',
    email: 'chang@taipei-north.com',
    role: 'admin',
    tenantName: '台北北區總館',
    status: 'active',
    createdAt: '2024-09-01T00:00:00Z',
  },
  {
    id: 'u-002',
    name: '陳志明',
    email: 'chen@hsinchu-cram.com',
    role: 'admin',
    tenantName: '新竹光明補習班',
    status: 'pending',
    createdAt: '2026-03-02T09:15:00Z',
  },
  {
    id: 'u-003',
    name: '林淑慧',
    email: 'lin@taichung-cram.com',
    role: 'admin',
    tenantName: '台中文賢補習班',
    status: 'pending',
    createdAt: '2026-03-01T14:30:00Z',
  },
  {
    id: 'u-004',
    name: '黃雅婷',
    email: 'huang@taipei-north.com',
    role: 'staff',
    tenantName: '台北北區總館',
    status: 'active',
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'u-005',
    name: '王建國',
    email: 'wang@kaohsiung-cram.com',
    role: 'teacher',
    tenantName: '高雄鳳山補習班',
    status: 'suspended',
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'u-006',
    name: '李小美',
    email: 'li@taipei-north.com',
    role: 'parent',
    tenantName: '台北北區總館',
    status: 'active',
    createdAt: '2025-06-15T00:00:00Z',
  },
]

const DEMO_BRANCHES: BranchInfo[] = [
  {
    id: 'branch-001',
    name: '台北北區總館',
    code: 'TPE-N',
    address: '台北市中山區中山北路二段 30 號',
    managerName: '張明德',
    studentCount: 128,
    teacherCount: 10,
    monthlyRevenue: 380000,
    status: 'active',
  },
  {
    id: 'branch-002',
    name: '新竹光明補習班',
    code: 'HSC-GM',
    address: '新竹市東區光明路 145 號',
    managerName: '陳志明',
    studentCount: 76,
    teacherCount: 6,
    monthlyRevenue: 210000,
    status: 'active',
  },
  {
    id: 'branch-003',
    name: '高雄鳳山補習班',
    code: 'KHH-FS',
    address: '高雄市鳳山區中山路 200 號',
    managerName: '（空缺）',
    studentCount: 0,
    teacherCount: 2,
    monthlyRevenue: 0,
    status: 'suspended',
  },
]

const DEMO_ARCHIVED: ArchivedRecord[] = [
  {
    id: 'arc-001',
    branchName: '台北北區總館',
    dataType: '學生資料',
    description: '王小明（已退班）',
    deletedBy: '黃雅婷',
    deletedAt: '2026-02-20T10:00:00Z',
    restoreDeadline: '2026-03-06T10:00:00Z',
  },
  {
    id: 'arc-002',
    branchName: '新竹光明補習班',
    dataType: '課程資料',
    description: '2025 秋季英文班（已結束）',
    deletedBy: '陳志明',
    deletedAt: '2026-02-15T14:00:00Z',
    restoreDeadline: '2026-03-01T14:00:00Z',
  },
  {
    id: 'arc-003',
    branchName: '台北北區總館',
    dataType: '帳務紀錄',
    description: '2025-11 月帳務核銷',
    deletedBy: '張明德',
    deletedAt: '2026-02-28T09:00:00Z',
    restoreDeadline: '2026-03-14T09:00:00Z',
  },
  {
    id: 'arc-004',
    branchName: '高雄鳳山補習班',
    dataType: '教師資料',
    description: '李大華（離職）',
    deletedBy: '王建國',
    deletedAt: '2026-01-31T16:00:00Z',
    restoreDeadline: '2026-02-14T16:00:00Z',
  },
  {
    id: 'arc-005',
    branchName: '台中文賢補習班',
    dataType: '出席紀錄',
    description: '2025 下半年出席彙整',
    deletedBy: '林淑慧',
    deletedAt: '2026-03-01T11:00:00Z',
    restoreDeadline: '2026-03-15T11:00:00Z',
  },
]

const DEMO_FRANCHISE: FranchiseFeeRecord[] = [
  {
    id: 'ff-001',
    branchName: '台北北區總館',
    plan: '旗艦方案',
    monthlyFee: 50000,
    dueDate: '2026-04-01',
    paymentStatus: 'paid',
    overdueDays: 0,
    urgeCount: 0,
  },
  {
    id: 'ff-002',
    branchName: '新竹光明補習班',
    plan: '標準方案',
    monthlyFee: 30000,
    dueDate: '2026-02-01',
    paymentStatus: 'overdue',
    overdueDays: 30,
    urgeCount: 2,
  },
  {
    id: 'ff-003',
    branchName: '台中文賢補習班',
    plan: '標準方案',
    monthlyFee: 30000,
    dueDate: '2026-03-01',
    paymentStatus: 'overdue',
    overdueDays: 2,
    urgeCount: 1,
  },
  {
    id: 'ff-004',
    branchName: '高雄鳳山補習班',
    plan: '基礎方案',
    monthlyFee: 20000,
    dueDate: '2025-12-01',
    paymentStatus: 'overdue',
    overdueDays: 93,
    urgeCount: 3,
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number) {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

function isWithinDeadline(deadline: string) {
  return new Date(deadline) > new Date()
}

const USER_STATUS_BADGE: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700 border border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  suspended: 'bg-red-100 text-red-700 border border-red-200',
}

const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: '正常',
  pending: '待審核',
  suspended: '已停用',
}

const USER_ROLE_LABEL: Record<UserRole, string> = {
  superadmin: '系統管理員',
  admin: '館長',
  staff: '行政',
  teacher: '教師',
  parent: '家長',
  student: '學生',
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

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700 border border-green-200',
  pending: 'bg-blue-100 text-blue-700 border border-blue-200',
  overdue: 'bg-red-100 text-red-700 border border-red-200',
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: '已繳清',
  pending: '待繳費',
  overdue: '逾期未繳',
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

// ─── New Branch Modal ──────────────────────────────────────────────────────────

interface NewBranchForm {
  name: string
  code: string
  address: string
  managerName: string
}

function NewBranchModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (branch: BranchInfo) => void
}) {
  const [form, setForm] = useState<NewBranchForm>({ name: '', code: '', address: '', managerName: '' })
  const [errors, setErrors] = useState<Partial<NewBranchForm>>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const e: Partial<NewBranchForm> = {}
    if (!form.name.trim()) e.name = '請填寫分校名稱'
    if (!form.code.trim()) e.code = '請填寫分校代碼'
    if (!form.address.trim()) e.address = '請填寫地址'
    if (!form.managerName.trim()) e.managerName = '請填寫館長姓名'
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
      name: form.name,
      code: form.code.toUpperCase(),
      address: form.address,
      managerName: form.managerName,
      studentCount: 0,
      teacherCount: 0,
      monthlyRevenue: 0,
      status: 'pending',
    }
    onDone(newBranch)
    setSubmitting(false)
  }

  const fieldEl = (key: keyof NewBranchForm, label: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-[#6b6560] mb-1">{label}</label>
      <input
        type="text"
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-[#4a3f35] mb-4">新增分校</h2>
        <div className="space-y-3">
          {fieldEl('name', '分校名稱 *', '例：台南府城補習班')}
          {fieldEl('code', '分校代碼 *', '例：TNN-FC')}
          {fieldEl('address', '地址 *', '縣市區路號')}
          {fieldEl('managerName', '館長姓名 *', '例：李大明')}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-[#d4cfc9] rounded-lg text-sm text-[#6b6560] hover:bg-[#f5f2ef]">
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

function BranchDetailModal({ branch, onClose }: { branch: BranchInfo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#4a3f35]">{branch.name}</h2>
            <p className="text-xs text-[#8a8078] mt-0.5">代碼：{branch.code}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BRANCH_STATUS_BADGE[branch.status]}`}>
            {BRANCH_STATUS_LABEL[branch.status]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: '學生人數', value: `${branch.studentCount} 人` },
            { label: '教師人數', value: `${branch.teacherCount} 人` },
            { label: '本月營收', value: formatCurrency(branch.monthlyRevenue) },
            { label: '館長', value: branch.managerName },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#f5f2ef] rounded-xl p-3">
              <p className="text-xs text-[#8a8078] mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-[#4a3f35]">{value}</p>
            </div>
          ))}
        </div>
        <div className="text-sm text-[#6b6560] mb-4">
          <span className="text-[#8a8078]">地址：</span>{branch.address}
        </div>
        <button onClick={onClose} className="w-full py-2 border border-[#d4cfc9] rounded-lg text-sm text-[#6b6560] hover:bg-[#f5f2ef]">
          關閉
        </button>
      </div>
    </div>
  )
}

// ─── Tab 1: 使用者管理 ──────────────────────────────────────────────────────────

function UsersTab({
  users,
  onApprove,
  onReject,
}: {
  users: UserRecord[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all')
  const pendingCount = users.filter((u) => u.status === 'pending').length
  const filtered = filterStatus === 'all' ? users : users.filter((u) => u.status === filterStatus)

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#fff8e6] border border-[#e8c878] rounded-xl text-sm text-[#6b4d00]">
          <span>⚠️</span>
          <span>目前有 <strong>{pendingCount}</strong> 個帳號申請等待審核。分校館長帳號需總部審核後才會開通；其他角色會自動開通。</span>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm text-[#6b6560]">篩選：</span>
        {(['all', 'active', 'pending', 'suspended'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s as UserStatus | 'all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-[#9DAEBB] text-white'
                : 'bg-[#f5f2ef] text-[#6b6560] hover:bg-[#e8e4de]'
            }`}
          >
            {s === 'all' ? '全部' : USER_STATUS_LABEL[s as UserStatus]}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-yellow-400 text-yellow-900 rounded-full px-1.5 text-xs">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e4de]">
              {['姓名', 'Email', '角色', '所屬分校', '狀態', '建立日期', '操作'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium text-[#8a8078] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[#8a8078]">目前沒有使用者資料</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#f0ece8] hover:bg-[#faf8f6]">
                  <td className="px-3 py-2.5 font-medium text-[#4a3f35] whitespace-nowrap">{u.name}</td>
                  <td className="px-3 py-2.5 text-[#6b6560]">{u.email}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#f5f2ef] text-[#6b6560]">
                      {USER_ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#6b6560] whitespace-nowrap">{u.tenantName}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${USER_STATUS_BADGE[u.status]}`}>
                      {USER_STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#8a8078] whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {u.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onApprove(u.id)}
                          className="px-2 py-1 bg-[#d4e6d3] text-[#4a7c59] text-xs rounded-lg hover:bg-[#c4d6c3] border border-[#a8c8a8] font-medium"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => onReject(u.id)}
                          className="px-2 py-1 bg-[#f0d6d6] text-[#a54a4a] text-xs rounded-lg hover:bg-[#e0c6c6] border border-[#e0a8a8] font-medium"
                        >
                          駁回
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 2: 分校管理 ────────────────────────────────────────────────────────────

function BranchesTab({
  branches,
  onAdd,
}: {
  branches: BranchInfo[]
  onAdd: (branch: BranchInfo) => void
}) {
  const [showNewBranch, setShowNewBranch] = useState(false)
  const [detailBranch, setDetailBranch] = useState<BranchInfo | null>(null)

  return (
    <div className="space-y-4">
      {showNewBranch && (
        <NewBranchModal
          onClose={() => setShowNewBranch(false)}
          onDone={(branch) => { onAdd(branch); setShowNewBranch(false) }}
        />
      )}
      {detailBranch && (
        <BranchDetailModal branch={detailBranch} onClose={() => setDetailBranch(null)} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[#8a8078]">共 {branches.length} 間分校</p>
        <button
          onClick={() => setShowNewBranch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#9DAEBB] text-white text-sm rounded-xl hover:bg-[#8d9eab] font-medium"
        >
          ＋ 新增分校
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`bg-white rounded-2xl border p-4 space-y-3 ${
              branch.status === 'suspended' ? 'border-red-200 opacity-75' : 'border-[#e8e4de]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[#4a3f35] truncate">{branch.name}</p>
                <p className="text-xs text-[#8a8078] mt-0.5">{branch.code}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${BRANCH_STATUS_BADGE[branch.status]}`}>
                {BRANCH_STATUS_LABEL[branch.status]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: '學生', value: branch.studentCount },
                { label: '教師', value: branch.teacherCount },
                { label: '本月營收', value: formatCurrency(branch.monthlyRevenue) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#f5f2ef] rounded-lg p-2">
                  <p className="text-xs text-[#8a8078]">{label}</p>
                  <p className="text-sm font-semibold text-[#4a3f35] mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>

            <div className="text-xs text-[#8a8078] space-y-0.5">
              <p><span className="font-medium text-[#6b6560]">館長：</span>{branch.managerName}</p>
              <p className="truncate"><span className="font-medium text-[#6b6560]">地址：</span>{branch.address}</p>
            </div>

            <button
              onClick={() => setDetailBranch(branch)}
              className="w-full py-1.5 border border-[#d4cfc9] rounded-lg text-xs text-[#6b6560] hover:bg-[#f5f2ef] transition-colors"
            >
              查看詳情
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab 3: 封存資訊管理 ────────────────────────────────────────────────────────

function ArchivedTab({
  records,
  onRestore,
}: {
  records: ArchivedRecord[]
  onRestore: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f4f8] border border-[#c8d8e8] rounded-xl text-sm text-[#3a5f7a]">
        <span>ℹ️</span>
        <span>封存資料可在刪除後 <strong>14 天</strong>內恢復。逾期後將永久刪除，無法復原。</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e4de]">
              {['分校', '資料類型', '說明', '刪除人', '刪除時間', '恢復截止', '操作'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium text-[#8a8078] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[#8a8078]">目前沒有封存資料</td>
              </tr>
            ) : (
              records.map((rec) => {
                const canRestore = isWithinDeadline(rec.restoreDeadline)
                return (
                  <tr
                    key={rec.id}
                    className={`border-b border-[#f0ece8] hover:bg-[#faf8f6] ${!canRestore ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#6b6560]">{rec.branchName}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[#f5f2ef] text-[#6b6560]">{rec.dataType}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#4a3f35]">{rec.description}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#6b6560]">{rec.deletedBy}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#8a8078]">{formatDateTime(rec.deletedAt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-xs font-medium ${canRestore ? 'text-[#4a7c59]' : 'text-[#a54a4a]'}`}>
                        {formatDateTime(rec.restoreDeadline)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {canRestore ? (
                        <button
                          onClick={() => onRestore(rec.id)}
                          className="px-2 py-1 bg-[#d4e6d3] text-[#4a7c59] text-xs rounded-lg hover:bg-[#c4d6c3] border border-[#a8c8a8] font-medium"
                        >
                          恢復
                        </button>
                      ) : (
                        <span className="text-xs text-[#8a8078]">已逾期</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 4: 加盟金管理 ──────────────────────────────────────────────────────────

function FranchiseTab({
  records,
  onUrge,
}: {
  records: FranchiseFeeRecord[]
  onUrge: (id: string) => void
}) {
  const overdueCount = records.filter((r) => r.paymentStatus === 'overdue').length
  const maxUrgeWarning = records.filter((r) => r.urgeCount >= 3)

  return (
    <div className="space-y-4">
      {/* 催繳上限警示 */}
      <div className="flex items-start gap-2 px-3 py-2 bg-[#fdf0f0] border border-[#e8a8a8] rounded-xl text-sm text-[#6b2020]">
        <span className="shrink-0">🚨</span>
        <span>催繳政策：連續催繳 <strong>3 次</strong>無效，系統將自動關閉該校使用權。請積極處理逾期案件。</span>
      </div>

      {maxUrgeWarning.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#fdf0f0] border border-red-300 rounded-xl text-sm text-red-800">
          <span>⛔</span>
          <span>
            以下分校已達 3 次催繳：
            {maxUrgeWarning.map((r) => <strong key={r.id} className="mx-1">{r.branchName}</strong>)}
            — 系統使用權已暫停。
          </span>
        </div>
      )}

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#fff8e6] border border-[#e8c878] rounded-xl text-sm text-[#6b4d00]">
          <span>⚠️</span>
          <span>目前有 <strong>{overdueCount}</strong> 間分校加盟金逾期未繳。</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e4de]">
              {['分校名稱', '方案', '月繳金額', '繳費到期日', '付款狀態', '逾期天數', '催繳次數', '操作'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium text-[#8a8078] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const isOverdue = rec.paymentStatus === 'overdue'
              const maxedOut = rec.urgeCount >= 3
              return (
                <tr
                  key={rec.id}
                  className={`border-b border-[#f0ece8] hover:bg-[#faf8f6] ${isOverdue ? 'bg-[#fff8f8]' : ''}`}
                >
                  <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${isOverdue ? 'text-red-700' : 'text-[#4a3f35]'}`}>
                    {rec.branchName}
                    {maxedOut && <span className="ml-1 text-xs text-red-600">（停用）</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[#6b6560] whitespace-nowrap">{rec.plan}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={isOverdue ? 'text-red-700 font-medium' : 'text-[#4a3f35]'}>
                      {formatCurrency(rec.monthlyFee)}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-[#6b6560]'}`}>
                    {rec.dueDate}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_BADGE[rec.paymentStatus]}`}>
                      {PAYMENT_STATUS_LABEL[rec.paymentStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {rec.overdueDays > 0 ? (
                      <span className={`font-medium ${rec.overdueDays > 30 ? 'text-red-700' : 'text-orange-600'}`}>
                        {rec.overdueDays} 天
                      </span>
                    ) : (
                      <span className="text-[#8a8078]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`text-sm font-medium ${rec.urgeCount >= 3 ? 'text-red-700' : rec.urgeCount > 0 ? 'text-orange-600' : 'text-[#8a8078]'}`}>
                      {rec.urgeCount} / 3
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {isOverdue && !maxedOut ? (
                      <button
                        onClick={() => onUrge(rec.id)}
                        className="px-2 py-1 bg-[#f0d6d6] text-[#a54a4a] text-xs rounded-lg hover:bg-[#e0c6c6] border border-[#e0a8a8] font-medium"
                      >
                        發送催繳
                      </button>
                    ) : maxedOut ? (
                      <span className="text-xs text-red-600 font-medium">已停用</span>
                    ) : (
                      <span className="text-xs text-[#8a8078]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HeadquartersPage() {
  const router = useRouter()
  const [tab, setTab] = useState<HQTab>('users')
  const [users, setUsers] = useState<UserRecord[]>(DEMO_USERS)
  const [branches, setBranches] = useState<BranchInfo[]>(DEMO_BRANCHES)
  const [archived, setArchived] = useState<ArchivedRecord[]>(DEMO_ARCHIVED)
  const [franchise, setFranchise] = useState<FranchiseFeeRecord[]>(DEMO_FRANCHISE)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 身分驗證
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/login'); return }
    try {
      const u = JSON.parse(userStr) as { role?: string }
      if (u.role !== 'superadmin' && u.role !== 'admin') {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  // 嘗試從後端取資料，失敗時使用 Demo 假資料
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, branchRes, arcRes, ffRes] = await Promise.all([
          fetch('/api/admin/headquarters/users', { credentials: 'include' }),
          fetch('/api/admin/headquarters/branches', { credentials: 'include' }),
          fetch('/api/admin/headquarters/archived', { credentials: 'include' }),
          fetch('/api/admin/headquarters/franchise', { credentials: 'include' }),
        ])
        const [usersData, branchData, arcData, ffData] = await Promise.all([
          usersRes.json(), branchRes.json(), arcRes.json(), ffRes.json(),
        ])
        if (usersData.success && usersData.data?.length > 0) setUsers(usersData.data)
        if (branchData.success && branchData.data?.length > 0) setBranches(branchData.data)
        if (arcData.success && arcData.data?.length > 0) setArchived(arcData.data)
        if (ffData.success && ffData.data?.length > 0) setFranchise(ffData.data)
      } catch {
        // 使用 Demo 假資料（保持預設值）
      }
    }
    loadData()
  }, [])

  const handleApprove = (id: string) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'active' as UserStatus } : u))
    const u = users.find((x) => x.id === id)
    addToast(`✅ 已批准「${u?.name}」的帳號申請`, 'success')
  }

  const handleReject = (id: string) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'suspended' as UserStatus } : u))
    const u = users.find((x) => x.id === id)
    addToast(`❌ 已駁回「${u?.name}」的帳號申請`, 'warning')
  }

  const handleAddBranch = (branch: BranchInfo) => {
    setBranches((prev) => [branch, ...prev])
    addToast(`🏢 已新增分校「${branch.name}」`, 'success')
  }

  const handleRestore = (id: string) => {
    const rec = archived.find((r) => r.id === id)
    setArchived((prev) => prev.filter((r) => r.id !== id))
    addToast(`♻️ 已恢復「${rec?.description}」`, 'success')
  }

  const handleUrge = (id: string) => {
    const rec = franchise.find((r) => r.id === id)
    if (!rec) return
    const newCount = rec.urgeCount + 1
    setFranchise((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, urgeCount: newCount, paymentStatus: newCount >= 3 ? 'pending' as PaymentStatus : r.paymentStatus }
          : r
      )
    )
    if (newCount >= 3) {
      addToast(`🚨「${rec.branchName}」催繳已達 3 次，系統使用權已自動停用。`, 'error')
    } else {
      addToast(`📨 已向「${rec.branchName}」發送第 ${newCount} 次催繳通知。`, 'warning')
    }
  }

  const pendingUserCount = users.filter((u) => u.status === 'pending').length
  const overdueFFCount = franchise.filter((r) => r.paymentStatus === 'overdue').length

  const tabs: { key: HQTab; label: string; badge?: number }[] = [
    { key: 'users', label: '使用者管理', badge: pendingUserCount > 0 ? pendingUserCount : undefined },
    { key: 'branches', label: '分校管理' },
    { key: 'archived', label: '封存資訊管理' },
    { key: 'franchise', label: '加盟金管理', badge: overdueFFCount > 0 ? overdueFFCount : undefined },
  ]

  return (
    <div className="space-y-4 p-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/dashboard" />
          <div>
            <h1 className="text-xl font-bold text-[#4a3f35]">🏢 總部管理</h1>
            <p className="text-xs text-[#8a8078] mt-0.5">使用者審核、分校管理、封存資料與加盟金狀況</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f5f2ef] rounded-xl p-1 flex-wrap">
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
      <div className="bg-white rounded-2xl border border-[#e8e4de] p-4">
        {tab === 'users' && (
          <UsersTab users={users} onApprove={handleApprove} onReject={handleReject} />
        )}
        {tab === 'branches' && (
          <BranchesTab branches={branches} onAdd={handleAddBranch} />
        )}
        {tab === 'archived' && (
          <ArchivedTab records={archived} onRestore={handleRestore} />
        )}
        {tab === 'franchise' && (
          <FranchiseTab records={franchise} onUrge={handleUrge} />
        )}
      </div>
    </div>
  )
}

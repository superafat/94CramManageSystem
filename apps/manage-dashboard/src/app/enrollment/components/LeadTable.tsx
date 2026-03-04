'use client'

import { useState } from 'react'

export interface Lead {
  id: string
  name: string
  student_name?: string
  phone?: string
  status: string
  interest_subjects?: string[]
  trial_date?: string
  follow_up_date?: string
  created_at: string
}

interface LeadTableProps {
  leads: Lead[]
  loading?: boolean
  onStatusChange: (id: string, status: string, followUpDate?: string) => Promise<void>
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  new: { label: '新諮詢', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  contacted: { label: '已聯絡', badge: 'bg-[#6B8CAE]/10 text-[#6B8CAE] border-[#6B8CAE]/20' },
  trial_scheduled: { label: '預約試聽', badge: 'bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20' },
  trial_completed: { label: '完成試聽', badge: 'bg-[#9B7FB6]/10 text-[#9B7FB6] border-[#9B7FB6]/20' },
  enrolled: { label: '已報名', badge: 'bg-[#7B9E89]/10 text-[#7B9E89] border-[#7B9E89]/20' },
  lost: { label: '已流失', badge: 'bg-[#B5706E]/10 text-[#B5706E] border-[#B5706E]/20' },
}

const STATUS_OPTIONS = ['new', 'contacted', 'trial_scheduled', 'trial_completed', 'enrolled', 'lost']

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, badge: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.badge}`}>
      {config.label}
    </span>
  )
}

function StatusDropdown({
  lead,
  onStatusChange,
}: {
  lead: Lead
  onStatusChange: (id: string, status: string, followUpDate?: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const handleSelect = async (status: string) => {
    setUpdating(true)
    setOpen(false)
    await onStatusChange(lead.id, status)
    setUpdating(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={updating}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        {updating ? '更新中...' : '更新狀態'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-border z-20 min-w-[120px] py-1">
            {STATUS_OPTIONS.map((s) => {
              const config = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors ${
                    lead.status === s ? 'font-medium' : ''
                  }`}
                >
                  {config?.label ?? s}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function LeadTable({ leads, loading, onStatusChange }: LeadTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 手機版：卡片 */}
      <div className="lg:hidden space-y-3">
        {leads.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <div className="text-4xl mb-2">📭</div>
            <p>尚無諮詢資料</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-text">{lead.name}</span>
                  {lead.student_name && (
                    <span className="ml-2 text-sm text-text-muted">（學生：{lead.student_name}）</span>
                  )}
                </div>
                <StatusBadge status={lead.status} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted mb-2">
                {lead.phone && <span>📱 {lead.phone}</span>}
                {lead.trial_date && <span>🎯 試聽：{formatDate(lead.trial_date)}</span>}
                <span>建立：{formatDate(lead.created_at)}</span>
              </div>
              {lead.interest_subjects && lead.interest_subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {lead.interest_subjects.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-surface text-text-muted text-xs rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <StatusDropdown lead={lead} onStatusChange={onStatusChange} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 桌面版：表格 */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">姓名</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">學生姓名</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">電話</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">狀態</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">有興趣科目</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">試聽日期</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">建立時間</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-text-muted">
                  尚無諮詢資料
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-text">{lead.name}</td>
                  <td className="px-5 py-3 text-sm text-text-muted">{lead.student_name || '—'}</td>
                  <td className="px-5 py-3 text-sm text-text-muted">{lead.phone || '—'}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-3">
                    {lead.interest_subjects && lead.interest_subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.interest_subjects.slice(0, 3).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-surface text-text-muted text-xs rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-text-muted">{formatDate(lead.trial_date)}</td>
                  <td className="px-5 py-3 text-sm text-text-muted">{formatDate(lead.created_at)}</td>
                  <td className="px-5 py-3 text-center">
                    <StatusDropdown lead={lead} onStatusChange={onStatusChange} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import type { TeacherSalary, ScheduleItem, AttendanceStats, AutoDeduction, AutoDeductionOverride } from '../types'
import { SALARY_TYPE_LABELS, API_BASE } from '../constants'
import { getEffectiveDeductionAmount, autoDeductionSummaryLabel, getTierLabel } from '../utils'
import { ScheduleDetailPanel } from './ScheduleDetailPanel'

export interface TeacherCardProps {
  teacher: TeacherSalary
  grandTotalAmount: number
  isExpanded: boolean
  schedules: ScheduleItem[]
  schedulesLoading: boolean
  attendance: AttendanceStats | null
  autoDeductions: AutoDeduction[]
  confirming: string | null
  monthRangeStart: string
  monthRangeEnd: string
  onToggleExpand: (teacherId: string) => void
  onViewSlip: (teacher: TeacherSalary) => void
  onConfirm: (teacher: TeacherSalary) => void
  onAdjustDeduct: (teacher: TeacherSalary, deduction: AutoDeduction) => void
  onFetchAttendance: (teacherId: string) => void
  onFetchSchedules: (teacherId: string) => void
  getSalaryBreakdown: (teacher: TeacherSalary) => string
  onRefresh?: () => void
}

export function TeacherCard({
  teacher,
  grandTotalAmount,
  isExpanded,
  schedules,
  schedulesLoading,
  attendance,
  autoDeductions,
  confirming,
  monthRangeStart,
  monthRangeEnd,
  onToggleExpand,
  onViewSlip,
  onConfirm,
  onAdjustDeduct,
  onFetchAttendance,
  onFetchSchedules,
  getSalaryBreakdown,
  onRefresh,
}: TeacherCardProps) {
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const [inlineForm, setInlineForm] = useState({ type: 'bonus' as 'bonus' | 'deduction', name: '', amount: '' })
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const autoDeductTotal = autoDeductions.reduce((acc, d) => acc + getEffectiveDeductionAmount(d), 0)
  const hasAttendanceData = attendance !== null
  const hasAutoDeductions = autoDeductions.length > 0
  const netAmount = teacher.net_amount - autoDeductTotal
  const hasSickLeave = attendance && attendance.sick_leave_days > 0
  const laborLabel = getTierLabel('labor', teacher.insurance_config.labor.tierLevel, teacher.insurance_config.labor.enabled)
  const healthLabel = getTierLabel('health', teacher.insurance_config.health.tierLevel, teacher.insurance_config.health.enabled)
  const supplementalPremiumAmount = teacher.supplemental_health_premium_amount ?? 0
  const sharePercentage = grandTotalAmount > 0 ? (Number(teacher.net_amount) / grandTotalAmount) * 100 : 0
  const progressWidthClass = sharePercentage >= 90 ? 'w-full'
    : sharePercentage >= 80 ? 'w-10/12'
    : sharePercentage >= 70 ? 'w-9/12'
    : sharePercentage >= 60 ? 'w-8/12'
    : sharePercentage >= 50 ? 'w-7/12'
    : sharePercentage >= 40 ? 'w-6/12'
    : sharePercentage >= 30 ? 'w-5/12'
    : sharePercentage >= 20 ? 'w-4/12'
    : sharePercentage >= 10 ? 'w-3/12'
    : sharePercentage > 0 ? 'w-2/12' : 'w-0'

  const handleInlineAdd = async () => {
    if (!inlineForm.name || !inlineForm.amount) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: teacher.teacher_id,
          periodStart: monthRangeStart,
          periodEnd: monthRangeEnd,
          type: inlineForm.type,
          name: inlineForm.name,
          amount: inlineForm.amount,
        }),
      })
      if (res.ok) {
        setShowInlineAdd(false)
        setInlineForm({ type: 'bonus', name: '', amount: '' })
        onRefresh?.()
      }
    } catch (err) {
      console.error('Failed to add adjustment:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (adjId: string) => {
    if (!confirm('確定要刪除這筆獎金/扣薪？')) return
    setDeleting(adjId)
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/adjustments/${adjId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) onRefresh?.()
    } catch (err) {
      console.error('Failed to delete adjustment:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-text">{teacher.teacher_name}</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {teacher.title}
              </span>
              {teacher.teacher_role && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  {teacher.teacher_role}
                </span>
              )}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {SALARY_TYPE_LABELS[teacher.salary_type] || '堂薪制'}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1">{getSalaryBreakdown(teacher)}</p>

            {/* Insurance badges */}
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#EDF1F5] text-[#5A7A8F]">
                勞保 {laborLabel} / 自付 ${teacher.labor_personal_amount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#EDF2EC] text-[#4A6B44]">
                健保 {healthLabel} / 自付 ${teacher.health_personal_amount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#F7F0E8] text-[#8F6A3A]">
                雇主負擔 ${teacher.employer_insurance_total.toLocaleString()}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${supplementalPremiumAmount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                補充保費試算 ${supplementalPremiumAmount.toLocaleString()}
              </span>
            </div>

            {teacher.insurance_config.supplementalHealth.employmentType === 'part_time' && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`px-2 py-0.5 text-xs rounded-full ${teacher.should_withhold_supplemental_health ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                  {teacher.should_withhold_supplemental_health
                    ? `兼職，建議代扣補充保費 $${supplementalPremiumAmount.toLocaleString()}`
                    : (teacher.supplemental_health_reason || '兼職，暫不列補充保費代扣')}
                </span>
              </div>
            )}

            {hasSickLeave && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                  病假 {attendance!.sick_leave_days} 天（不扣薪）
                </span>
              </div>
            )}
          </div>

          <div className="text-right ml-3">
            <p className="text-xl font-bold text-primary">
              ${netAmount.toLocaleString()}
            </p>
            {autoDeductTotal > 0 && (
              <p className="text-xs text-red-500">含自動扣款</p>
            )}
            {teacher.personal_insurance_total > 0 && (
              <p className="text-xs text-text-muted">已扣勞健保 ${teacher.personal_insurance_total.toLocaleString()}</p>
            )}
            {teacher.should_withhold_supplemental_health && supplementalPremiumAmount > 0 && (
              <p className="text-xs text-orange-600">補充保費試算 ${supplementalPremiumAmount.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Manual adjustments with delete */}
        {(teacher.bonus_total > 0 || teacher.deduction_total > 0 || (teacher.adjustments?.length ?? 0) > 0) && (
          <div className="mt-2 space-y-1">
            {teacher.adjustments?.map((adj) => (
              <div key={adj.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${adj.type === 'bonus' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span>{adj.type === 'bonus' ? '+' : '-'} {adj.name}</span>
                  {adj.notes && <span className="text-[10px] opacity-60">({adj.notes})</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span>${Number(adj.amount).toLocaleString()}</span>
                  <button
                    onClick={() => handleDelete(adj.id)}
                    disabled={deleting === adj.id}
                    className={`px-1 py-0.5 rounded text-xs border transition-colors ${
                      adj.type === 'bonus'
                        ? 'border-green-300 hover:border-green-500 disabled:opacity-50'
                        : 'border-red-300 hover:border-red-500 disabled:opacity-50'
                    }`}
                  >
                    {deleting === adj.id ? '...' : '×'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inline Add Adjustment */}
        {showInlineAdd ? (
          <div className="mt-2 p-2 border border-dashed border-primary/40 rounded-lg bg-primary/5 space-y-2">
            <div className="flex gap-2">
              <select
                title="獎金或扣薪類型"
                value={inlineForm.type}
                onChange={e => setInlineForm({ ...inlineForm, type: e.target.value as 'bonus' | 'deduction' })}
                className="px-2 py-1 border border-border rounded text-xs bg-white"
              >
                <option value="bonus">獎金</option>
                <option value="deduction">扣薪</option>
              </select>
              <input
                type="text"
                value={inlineForm.name}
                onChange={e => setInlineForm({ ...inlineForm, name: e.target.value })}
                placeholder="項目名稱"
                className="flex-1 px-2 py-1 border border-border rounded text-xs bg-white min-w-0"
              />
              <input
                type="number"
                value={inlineForm.amount}
                onChange={e => setInlineForm({ ...inlineForm, amount: e.target.value })}
                placeholder="金額"
                className="w-20 px-2 py-1 border border-border rounded text-xs bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInlineAdd(false)} className="flex-1 py-1 text-xs border border-border rounded text-text-muted">取消</button>
              <button onClick={handleInlineAdd} disabled={saving} className="flex-1 py-1 text-xs bg-primary text-white rounded font-medium disabled:opacity-50">
                {saving ? '新增中...' : '新增'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInlineAdd(true)}
            className="mt-2 w-full text-xs text-primary border border-dashed border-primary/40 rounded-lg py-1.5 hover:bg-primary/5 transition-colors"
          >
            + 新增獎金/扣薪
          </button>
        )}

        {/* Auto-deduction items */}
        {hasAutoDeductions && (
          <div className="mt-2 space-y-1">
            {autoDeductions.map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded border ${
                  d.cancelled
                    ? 'bg-gray-50 border-gray-200 text-gray-400'
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`shrink-0 px-1 py-0.5 rounded text-xs font-medium ${
                    d.cancelled ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-600'
                  }`}>
                    自動
                  </span>
                  <span className={d.cancelled ? 'line-through text-gray-400' : ''}>
                    {autoDeductionSummaryLabel(d)}
                  </span>
                  {d.cancelled && <span className="text-gray-400 shrink-0">（已取消）</span>}
                  {d.overrideAmount !== null && !d.cancelled && <span className="text-amber-600 shrink-0">（已調整）</span>}
                </div>
                <button
                  onClick={() => {
                    if (!hasAttendanceData) onFetchAttendance(teacher.teacher_id)
                    onAdjustDeduct(teacher, d)
                  }}
                  className={`shrink-0 ml-2 px-1.5 py-0.5 rounded text-xs border transition-colors ${
                    d.cancelled
                      ? 'border-gray-300 text-gray-500 hover:border-gray-400'
                      : 'border-red-200 text-red-500 hover:border-red-400 hover:text-red-700'
                  }`}
                >
                  調整
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No attendance data prompt */}
        {!hasAttendanceData && (
          <button
            onClick={() => {
              onFetchAttendance(teacher.teacher_id)
              if (!isExpanded) { onToggleExpand(teacher.teacher_id); onFetchSchedules(teacher.teacher_id) }
            }}
            className="mt-2 w-full text-xs text-text-muted border border-dashed border-border rounded-lg py-1.5 hover:text-primary hover:border-primary transition-colors"
          >
            載入出缺勤資料以計算自動扣薪
          </button>
        )}

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary rounded-full transition-all ${progressWidthClass}`}
            />
          </div>
          <p className="text-xs text-text-muted mt-1 text-right">
            佔比 {sharePercentage.toFixed(1)}%
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={() => onToggleExpand(teacher.teacher_id)}
            className="flex-1 py-1.5 text-sm border border-border text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            {isExpanded ? '▲ 收起明細' : '▼ 排課明細'}
          </button>
          <button
            onClick={() => {
              if (!schedules.length) onFetchSchedules(teacher.teacher_id)
              if (!attendance) onFetchAttendance(teacher.teacher_id)
              onViewSlip(teacher)
            }}
            className="px-3 py-1.5 text-sm border border-border text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            薪資條
          </button>
          {teacher.total_classes > 0 && (
            <button
              disabled={confirming === teacher.teacher_id}
              onClick={() => onConfirm(teacher)}
              className="px-3 py-1.5 text-sm border border-primary text-primary rounded-lg disabled:opacity-50"
            >
              {confirming === teacher.teacher_id ? '處理中...' : teacher.supplemental_health_premium_amount > 0 ? '覆核後確認' : '確認薪資'}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Schedule Detail Panel */}
      {isExpanded && (
        <div className="border-t border-border bg-gray-50/50 px-4 pb-4">
          <p className="text-xs font-medium text-text-muted pt-3 mb-1">本月排課明細</p>
          <ScheduleDetailPanel teacher={teacher} schedules={schedules} loading={schedulesLoading} />
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import type { SalaryData, TeacherSalary, ScheduleItem, AttendanceStats, AutoDeduction, AutoDeductionOverride } from './types'
import { API_BASE } from './constants'
import { getMonthRange, computeAutoDeductions, normalizeAttendanceStats, normalizeSalaryData } from './utils'
import { MonthNavigation } from './components/MonthNavigation'
import { TeacherCard } from './components/TeacherCard'
import { AdjustmentModal, type AdjustmentFormState } from './components/AdjustmentModal'
import { AdjustAutoDeductModal } from './components/AdjustAutoDeductModal'
import { SalarySlipModal } from './components/SalarySlipModal'

export default function SalaryPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  // Adjustment modal
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState<AdjustmentFormState>({ teacherId: '', type: 'bonus', name: '', amount: '', notes: '' })
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])

  // Schedule panels
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [teacherSchedules, setTeacherSchedules] = useState<Record<string, ScheduleItem[]>>({})
  const [schedulesLoading, setSchedulesLoading] = useState<Record<string, boolean>>({})

  // Attendance
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStats>>({})

  // Auto-deduction overrides — keyed by `${teacherId}::${deductionId}`
  const [autoDeductOverrides, setAutoDeductOverrides] = useState<Record<string, AutoDeductionOverride>>({})

  // Auto-deduction adjust modal
  const [adjustingDeduct, setAdjustingDeduct] = useState<{ teacher: TeacherSalary; deduction: AutoDeduction } | null>(null)

  // Salary slip modal
  const [slipTeacher, setSlipTeacher] = useState<TeacherSalary | null>(null)
  const [supplementalReview, setSupplementalReview] = useState<{
    teacher: TeacherSalary
    withhold: boolean
    note: string
  } | null>(null)

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => {
    fetchSalary()
  }, [monthOffset])

  const fetchSalary = async () => {
    setLoading(true)
    setExpandedTeacher(null)
    setTeacherSchedules({})
    setAttendanceMap({})
    setAutoDeductOverrides({})
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/salary/calculate?startDate=${monthRange.start}&endDate=${monthRange.end}`,
        { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      )
      if (!res.ok) return
      const result = await res.json()
      const d = normalizeSalaryData(result.data ?? result)
      setData(d)
      if (d?.teachers) {
        setTeachers(d.teachers.map((t: TeacherSalary) => ({ id: t.teacher_id, name: t.teacher_name })))
      }
    } catch (err) {
      console.error('Failed to fetch salary:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeacherSchedules = async (teacherId: string) => {
    if (teacherSchedules[teacherId] !== undefined) return
    setSchedulesLoading(prev => ({ ...prev, [teacherId]: true }))
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/schedules?teacherId=${teacherId}&startDate=${monthRange.start}&endDate=${monthRange.end}&status=completed`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const result = await res.json()
        const raw = result.data ?? result
        const items: ScheduleItem[] = Array.isArray(raw) ? raw : []
        setTeacherSchedules(prev => ({ ...prev, [teacherId]: items }))
      } else {
        setTeacherSchedules(prev => ({ ...prev, [teacherId]: [] }))
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
      setTeacherSchedules(prev => ({ ...prev, [teacherId]: [] }))
    } finally {
      setSchedulesLoading(prev => ({ ...prev, [teacherId]: false }))
    }
  }

  const fetchAttendance = async (teacherId: string) => {
    if (attendanceMap[teacherId] !== undefined) return
    try {
      const res = await fetch(
        `${API_BASE}/api/teacher-attendance/stats?teacherId=${teacherId}&month=${monthRange.start.slice(0, 7)}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const result = await res.json()
        const raw = result.data ?? result
        const stats: AttendanceStats = normalizeAttendanceStats(teacherId, raw)
        setAttendanceMap(prev => ({ ...prev, [teacherId]: stats }))
      }
    } catch {
      // Attendance API may not exist yet — silently ignore
    }
  }

  const handleToggleExpand = (teacherId: string) => {
    if (expandedTeacher === teacherId) {
      setExpandedTeacher(null)
    } else {
      setExpandedTeacher(teacherId)
      fetchTeacherSchedules(teacherId)
      fetchAttendance(teacherId)
    }
  }

  const handleAddAdjustment = async () => {
    if (!adjForm.teacherId || !adjForm.name || !adjForm.amount) return
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: adjForm.teacherId,
          periodStart: monthRange.start,
          periodEnd: monthRange.end,
          type: adjForm.type,
          name: adjForm.name,
          amount: adjForm.amount,
          notes: adjForm.notes || undefined,
        }),
      })
      if (res.ok) {
        setShowAdjModal(false)
        setAdjForm({ teacherId: '', type: 'bonus', name: '', amount: '', notes: '' })
        fetchSalary()
      }
    } catch (err) {
      console.error('Failed to add adjustment:', err)
    }
  }

  const executeConfirmSalary = async (teacher: TeacherSalary, withholdSupplementalHealth: boolean, supplementalHealthReviewNote?: string) => {
    setConfirming(teacher.teacher_id)
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: teacher.teacher_id,
          periodStart: monthRange.start,
          periodEnd: monthRange.end,
          withholdSupplementalHealth,
          supplementalHealthReviewNote: supplementalHealthReviewNote || undefined,
        }),
      })
      if (res.ok) {
        const message = withholdSupplementalHealth && teacher.supplemental_health_premium_amount > 0
          ? `${teacher.teacher_name} 薪資已確認，已正式代扣補充保費 $${teacher.supplemental_health_premium_amount.toLocaleString()}`
          : `${teacher.teacher_name} 薪資已確認`
        alert(message)
        setSupplementalReview(null)
      }
      else alert('確認失敗')
    } catch (err) {
      console.error('[Salary] Confirm failed:', err)
      alert('確認失敗')
    } finally {
      setConfirming(null)
    }
  }

  const handleConfirmSalary = async (teacher: TeacherSalary) => {
    if (teacher.supplemental_health_premium_amount > 0) {
      setSupplementalReview({
        teacher,
        withhold: teacher.should_withhold_supplemental_health,
        note: teacher.supplemental_health_reason || '',
      })
      return
    }

    await executeConfirmSalary(teacher, false)
  }

  const getSalaryBreakdown = (t: TeacherSalary) => {
    const st = t.salary_type || 'per_class'
    if (st === 'monthly') return `月薪 $${Number(t.base_salary || 0).toLocaleString()}`
    if (st === 'hourly') return `時薪 $${Number(t.hourly_rate || 0).toLocaleString()} × ${t.total_hours ?? t.total_classes} 時`
    return `堂薪 $${Number(t.rate_per_class || 0).toLocaleString()} × ${t.total_classes} 堂`
  }

  const getAutoDeductions = (teacher: TeacherSalary): AutoDeduction[] => {
    const attendance = attendanceMap[teacher.teacher_id] ?? null
    const overridePrefix = `${teacher.teacher_id}::`
    const relevantOverrides: Record<string, AutoDeductionOverride> = {}
    for (const [k, v] of Object.entries(autoDeductOverrides)) {
      if (k.startsWith(overridePrefix)) {
        relevantOverrides[k.replace(overridePrefix, '')] = v
      }
    }
    return computeAutoDeductions(teacher, attendance, relevantOverrides)
  }

  const handleSaveAutoDeductOverride = (teacher: TeacherSalary, deduction: AutoDeduction, override: AutoDeductionOverride) => {
    const key = `${teacher.teacher_id}::${deduction.id}`
    setAutoDeductOverrides(prev => ({ ...prev, [key]: override }))
    setAdjustingDeduct(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/dashboard" />
            <h1 className="text-lg font-semibold text-text">薪資管理</h1>
          </div>
          <button
            onClick={() => setShowAdjModal(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
          >
            + 獎金/扣薪
          </button>
        </div>

        <MonthNavigation
          monthLabel={monthRange.label}
          monthStart={monthRange.start}
          monthEnd={monthRange.end}
          onPrevMonth={() => setMonthOffset(m => m - 1)}
          onNextMonth={() => setMonthOffset(m => m + 1)}
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-primary to-primary-hover rounded-2xl p-6 text-white">
              <p className="text-sm opacity-80">本月實發總計</p>
              <p className="text-3xl font-bold mt-1">
                ${data.grand_net_amount.toLocaleString()}
              </p>
              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <p className="opacity-80">總堂數</p>
                  <p className="font-semibold">{data.grand_total_classes} 堂</p>
                </div>
                <div>
                  <p className="opacity-80">講師數</p>
                  <p className="font-semibold">{data.teachers.length} 位</p>
                </div>
                <div>
                  <p className="opacity-80">勞健保自付</p>
                  <p className="font-semibold">${data.grand_personal_insurance_total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-80">補充保費試算</p>
                  <p className="font-semibold">${data.grand_supplemental_health_premium_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Teacher Cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text-muted px-1">各講師明細</h2>

              {data.teachers.map((teacher) => (
                <TeacherCard
                  key={teacher.teacher_id}
                  teacher={teacher}
                  grandTotalAmount={data.grand_net_amount}
                  isExpanded={expandedTeacher === teacher.teacher_id}
                  schedules={teacherSchedules[teacher.teacher_id] ?? []}
                  schedulesLoading={schedulesLoading[teacher.teacher_id] ?? false}
                  attendance={attendanceMap[teacher.teacher_id] ?? null}
                  autoDeductions={getAutoDeductions(teacher)}
                  confirming={confirming}
                  monthRangeStart={monthRange.start}
                  monthRangeEnd={monthRange.end}
                  onToggleExpand={handleToggleExpand}
                  onViewSlip={setSlipTeacher}
                  onConfirm={handleConfirmSalary}
                  onAdjustDeduct={(teacher, deduction) => setAdjustingDeduct({ teacher, deduction })}
                  onFetchAttendance={fetchAttendance}
                  onFetchSchedules={fetchTeacherSchedules}
                  getSalaryBreakdown={getSalaryBreakdown}
                  onRefresh={fetchSalary}
                />
              ))}
            </div>

            {/* 雇主勞健保負擔總計 */}
            {data.teachers.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4 mt-2">
                <p className="text-sm font-semibold text-text mb-3">雇主勞健保負擔總計</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#EDF1F5] rounded-lg p-3">
                    <p className="text-[10px] text-[#5A7A8F] mb-1">薪資毛額</p>
                    <p className="text-sm font-bold text-[#5A7A8F]">${data.grand_total_amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#EDF2EC] rounded-lg p-3">
                    <p className="text-[10px] text-[#4A6B44] mb-1">勞健保雇主負擔</p>
                    <p className="text-sm font-bold text-[#4A6B44]">${data.grand_employer_insurance_total.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#F7F0E8] rounded-lg p-3">
                    <p className="text-[10px] text-[#8F6A3A] mb-1">公司總支出</p>
                    <p className="text-sm font-bold text-[#8F6A3A]">${(data.grand_total_amount + data.grand_employer_insurance_total).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-2 text-right">
                  * 依各老師設定的級距方案彙總；補充保費為試算提醒，實際是否代扣仍需覆核
                </p>
              </div>
            )}

            {data.teachers.length === 0 && (
              <div className="text-center py-12 text-text-muted">本月無排課記錄</div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">無法載入資料</div>
        )}
      </div>

      {/* Add Adjustment Modal */}
      {showAdjModal && (
        <AdjustmentModal
          teachers={teachers}
          form={adjForm}
          onFormChange={setAdjForm}
          onSave={handleAddAdjustment}
          onClose={() => setShowAdjModal(false)}
        />
      )}

      {/* Auto-Deduction Adjust Modal */}
      {adjustingDeduct && (
        <AdjustAutoDeductModal
          deduction={adjustingDeduct.deduction}
          onSave={(override) => handleSaveAutoDeductOverride(adjustingDeduct.teacher, adjustingDeduct.deduction, override)}
          onClose={() => setAdjustingDeduct(null)}
        />
      )}

      {/* Salary Slip Modal */}
      {slipTeacher && (
        <SalarySlipModal
          teacher={slipTeacher}
          schedules={teacherSchedules[slipTeacher.teacher_id] ?? []}
          attendance={attendanceMap[slipTeacher.teacher_id] ?? null}
          autoDeductions={getAutoDeductions(slipTeacher)}
          period={monthRange.label}
          onClose={() => setSlipTeacher(null)}
        />
      )}

      {supplementalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-xl">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-text">覆核二代健保補充保費</h2>
              <p className="mt-1 text-sm text-text-muted">
                {supplementalReview.teacher.teacher_name} 本期補充保費試算為
                ${supplementalReview.teacher.supplemental_health_premium_amount.toLocaleString()}。
              </p>
            </div>

            <div className="space-y-4 px-5 py-4 text-sm text-text">
              <div className="rounded-xl bg-background border border-border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span>目前試算原因</span>
                  <span className="font-medium">${supplementalReview.teacher.supplemental_health_premium_amount.toLocaleString()}</span>
                </div>
                <p className="text-xs leading-5 text-text-muted">{supplementalReview.teacher.supplemental_health_reason}</p>
                <p className="text-xs text-text-muted">
                  若正式代扣，本次實發將由 ${supplementalReview.teacher.net_amount.toLocaleString()} 變為
                  ${(supplementalReview.teacher.net_amount - supplementalReview.teacher.supplemental_health_premium_amount).toLocaleString()}。
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border p-3">
                <input
                  type="checkbox"
                  title="是否正式代扣補充保費"
                  checked={supplementalReview.withhold}
                  onChange={(e) => setSupplementalReview((prev) => prev ? { ...prev, withhold: e.target.checked } : prev)}
                  className="mt-0.5 rounded border-border text-primary"
                />
                <span>
                  <span className="block font-medium text-text">本次結算正式代扣補充保費</span>
                  <span className="block text-xs text-text-muted mt-1">未勾選時，只保留試算與覆核紀錄，不會從正式薪資扣除。</span>
                </span>
              </label>

              <div>
                <label className="mb-1 block text-sm text-text-muted">覆核備註</label>
                <textarea
                  title="補充保費覆核備註"
                  value={supplementalReview.note}
                  onChange={(e) => setSupplementalReview((prev) => prev ? { ...prev, note: e.target.value } : prev)}
                  className="min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2 text-text"
                  placeholder="例如：已確認非本單位投保，依單次給付達門檻正式代扣。"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={() => setSupplementalReview(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted"
              >
                取消
              </button>
              <button
                onClick={() => executeConfirmSalary(
                  supplementalReview.teacher,
                  supplementalReview.withhold,
                  supplementalReview.note
                )}
                disabled={confirming === supplementalReview.teacher.teacher_id}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {confirming === supplementalReview.teacher.teacher_id ? '處理中...' : '確認結算'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

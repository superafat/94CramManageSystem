'use client'

import { useEffect, useState } from 'react'
import type { SalaryData, TeacherSalary, ScheduleItem, AttendanceStats, AutoDeduction, AutoDeductionOverride } from '../../salary/types'
import { API_BASE } from '../../salary/constants'
import { getMonthRange, computeAutoDeductions, normalizeAttendanceStats, normalizeSalaryData } from '../../salary/utils'
import { MonthNavigation } from '../../salary/components/MonthNavigation'
import { TeacherCard } from '../../salary/components/TeacherCard'
import { AdjustmentModal, type AdjustmentFormState } from '../../salary/components/AdjustmentModal'
import { AdjustAutoDeductModal } from '../../salary/components/AdjustAutoDeductModal'
import { SalarySlipModal } from '../../salary/components/SalarySlipModal'

export default function SalaryContent() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState<AdjustmentFormState>({ teacherId: '', type: 'bonus', name: '', amount: '', notes: '' })
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [teacherSchedules, setTeacherSchedules] = useState<Record<string, ScheduleItem[]>>({})
  const [schedulesLoading, setSchedulesLoading] = useState<Record<string, boolean>>({})
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStats>>({})
  const [autoDeductOverrides, setAutoDeductOverrides] = useState<Record<string, AutoDeductionOverride>>({})
  const [adjustingDeduct, setAdjustingDeduct] = useState<{ teacher: TeacherSalary; deduction: AutoDeduction } | null>(null)
  const [slipTeacher, setSlipTeacher] = useState<TeacherSalary | null>(null)

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => { fetchSalary() }, [monthOffset])

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
      if (d?.teachers) setTeachers(d.teachers.map((t: TeacherSalary) => ({ id: t.teacher_id, name: t.teacher_name })))
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
        setTeacherSchedules(prev => ({ ...prev, [teacherId]: Array.isArray(raw) ? raw : [] }))
      } else {
        setTeacherSchedules(prev => ({ ...prev, [teacherId]: [] }))
      }
    } catch {
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
        setAttendanceMap(prev => ({
          ...prev,
          [teacherId]: normalizeAttendanceStats(teacherId, raw)
        }))
      }
    } catch { /* ignore */ }
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
          teacherId: adjForm.teacherId, periodStart: monthRange.start, periodEnd: monthRange.end,
          type: adjForm.type, name: adjForm.name, amount: adjForm.amount, notes: adjForm.notes || undefined,
        }),
      })
      if (res.ok) { setShowAdjModal(false); setAdjForm({ teacherId: '', type: 'bonus', name: '', amount: '', notes: '' }); fetchSalary() }
    } catch (err) { console.error('Failed to add adjustment:', err) }
  }

  const handleConfirmSalary = async (teacher: TeacherSalary) => {
    setConfirming(teacher.teacher_id)
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/records`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ teacherId: teacher.teacher_id, periodStart: monthRange.start, periodEnd: monthRange.end }),
      })
      if (res.ok) alert(`${teacher.teacher_name} 薪資已確認`)
      else alert('確認失敗')
    } catch { alert('確認失敗') } finally { setConfirming(null) }
  }

  const getSalaryBreakdown = (t: TeacherSalary) => {
    const st = t.salary_type || 'per_class'
    if (st === 'monthly') return `月薪 $${Number(t.base_salary || 0).toLocaleString()}`
    if (st === 'hourly') return `時薪 $${Number(t.hourly_rate || 0).toLocaleString()} x ${t.total_hours ?? t.total_classes} 時`
    return `堂薪 $${Number(t.rate_per_class || 0).toLocaleString()} x ${t.total_classes} 堂`
  }

  const getAutoDeductions = (teacher: TeacherSalary): AutoDeduction[] => {
    const attendance = attendanceMap[teacher.teacher_id] ?? null
    const prefix = `${teacher.teacher_id}::`
    const relevantOverrides: Record<string, AutoDeductionOverride> = {}
    for (const [k, v] of Object.entries(autoDeductOverrides)) {
      if (k.startsWith(prefix)) relevantOverrides[k.replace(prefix, '')] = v
    }
    return computeAutoDeductions(teacher, attendance, relevantOverrides)
  }

  const handleSaveAutoDeductOverride = (teacher: TeacherSalary, deduction: AutoDeduction, override: AutoDeductionOverride) => {
    setAutoDeductOverrides(prev => ({ ...prev, [`${teacher.teacher_id}::${deduction.id}`]: override }))
    setAdjustingDeduct(null)
  }

  return (
    <div className="space-y-4">
      {/* Salary Header */}
      <div className="flex items-center justify-between">
        <MonthNavigation
          monthLabel={monthRange.label}
          monthStart={monthRange.start}
          monthEnd={monthRange.end}
          onPrevMonth={() => setMonthOffset(m => m - 1)}
          onNextMonth={() => setMonthOffset(m => m + 1)}
        />
        <button onClick={() => setShowAdjModal(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium shrink-0">
          + 獎金/扣薪
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gradient-to-r from-primary to-primary-hover rounded-2xl p-6 text-white">
            <p className="text-sm opacity-80">本月實發總計</p>
            <p className="text-3xl font-bold mt-1">${data.grand_net_amount.toLocaleString()}</p>
            <div className="flex gap-6 mt-4 text-sm">
              <div><p className="opacity-80">總堂數</p><p className="font-semibold">{data.grand_total_classes} 堂</p></div>
              <div><p className="opacity-80">講師數</p><p className="font-semibold">{data.teachers.length} 位</p></div>
              <div><p className="opacity-80">勞健保自付</p><p className="font-semibold">${data.grand_personal_insurance_total.toLocaleString()}</p></div>
              <div><p className="opacity-80">補充保費試算</p><p className="font-semibold">${data.grand_supplemental_health_premium_amount.toLocaleString()}</p></div>
            </div>
          </div>

          {/* Teacher Cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-text-muted px-1">各講師明細</h2>
            {data.teachers.map(teacher => (
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
                onAdjustDeduct={(t, d) => setAdjustingDeduct({ teacher: t, deduction: d })}
                onFetchAttendance={fetchAttendance}
                onFetchSchedules={fetchTeacherSchedules}
                getSalaryBreakdown={getSalaryBreakdown}
                onRefresh={fetchSalary}
              />
            ))}
          </div>

          {/* Insurance Summary */}
          {data.teachers.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <p className="text-sm font-semibold text-text mb-3">雇主勞健保負擔總計</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
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
                * 補充保費僅提供試算提醒，未自動併入公司總支出
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

      {showAdjModal && (
        <AdjustmentModal teachers={teachers} form={adjForm} onFormChange={setAdjForm} onSave={handleAddAdjustment} onClose={() => setShowAdjModal(false)} />
      )}
      {adjustingDeduct && (
        <AdjustAutoDeductModal deduction={adjustingDeduct.deduction} onSave={o => handleSaveAutoDeductOverride(adjustingDeduct.teacher, adjustingDeduct.deduction, o)} onClose={() => setAdjustingDeduct(null)} />
      )}
      {slipTeacher && (
        <SalarySlipModal teacher={slipTeacher} schedules={teacherSchedules[slipTeacher.teacher_id] ?? []} attendance={attendanceMap[slipTeacher.teacher_id] ?? null} autoDeductions={getAutoDeductions(slipTeacher)} period={monthRange.label} onClose={() => setSlipTeacher(null)} />
      )}
    </div>
  )
}

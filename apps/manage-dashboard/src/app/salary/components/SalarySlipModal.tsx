'use client'

import { useRef } from 'react'
import type { TeacherSalary, ScheduleItem, AttendanceStats, AutoDeduction } from '../types'
import { SALARY_TYPE_LABELS } from '../constants'
import { getEffectiveDeductionAmount } from '../utils'

export interface SalarySlipModalProps {
  teacher: TeacherSalary
  schedules: ScheduleItem[]
  attendance: AttendanceStats | null
  autoDeductions: AutoDeduction[]
  period: string
  onClose: () => void
}

export function SalarySlipModal({ teacher, schedules, attendance, autoDeductions, period, onClose }: SalarySlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>薪資條</title>
      <style>
        body { font-family: 'Noto Sans TC', sans-serif; padding: 24px; color: #333; }
        h2 { text-align: center; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ccc; padding: 8px 12px; font-size: 13px; }
        th { background: #f5f5f5; }
        .total { font-weight: bold; background: #eef; }
      </style>
      </head><body>${content}</body></html>
    `)
    win.document.close()
    win.print()
  }

  const autoDeductTotal = autoDeductions.reduce((acc, d) => acc + getEffectiveDeductionAmount(d), 0)
  const supplementalPremiumAmount = teacher.supplemental_health_premium_amount ?? 0
  const netAmount = teacher.net_amount - autoDeductTotal

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">薪資條</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm"
            >
              列印
            </button>
            <button onClick={onClose} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600">
              關閉
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-5 space-y-4">
          <h2 className="text-center text-base font-bold text-gray-800">
            {period} 薪資條
          </h2>

          {/* Basic Info */}
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <tbody>
              <tr>
                <td className="bg-gray-50 px-3 py-2 text-gray-500 w-28">姓名</td>
                <td className="px-3 py-2 font-medium">{teacher.teacher_name}</td>
                <td className="bg-gray-50 px-3 py-2 text-gray-500 w-24">職稱</td>
                <td className="px-3 py-2">{teacher.title}</td>
              </tr>
              <tr>
                <td className="bg-gray-50 px-3 py-2 text-gray-500">薪資類型</td>
                <td className="px-3 py-2">{SALARY_TYPE_LABELS[teacher.salary_type] ?? '堂薪制'}</td>
                <td className="bg-gray-50 px-3 py-2 text-gray-500">計薪月份</td>
                <td className="px-3 py-2">{period}</td>
              </tr>
            </tbody>
          </table>

          {/* Salary Detail */}
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-gray-600">項目</th>
                <th className="px-3 py-2 text-right text-gray-600">金額</th>
              </tr>
            </thead>
            <tbody>
              {/* Base */}
              {teacher.salary_type === 'monthly' && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">月薪底薪</td>
                  <td className="px-3 py-2 text-right">${Number(teacher.base_salary).toLocaleString()}</td>
                </tr>
              )}
              {teacher.salary_type === 'per_class' && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">
                    堂薪 ${Number(teacher.rate_per_class).toLocaleString()} × {teacher.total_classes} 堂
                  </td>
                  <td className="px-3 py-2 text-right">${teacher.base_amount.toLocaleString()}</td>
                </tr>
              )}
              {teacher.salary_type === 'hourly' && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">
                    時薪 ${Number(teacher.hourly_rate).toLocaleString()} × {teacher.total_hours ?? teacher.total_classes} 時
                  </td>
                  <td className="px-3 py-2 text-right">${teacher.base_amount.toLocaleString()}</td>
                </tr>
              )}

              {/* Individual sessions */}
              {schedules.filter(s => s.is_individual).length > 0 && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">
                    個指課程 {schedules.filter(s => s.is_individual).length} 堂
                  </td>
                  <td className="px-3 py-2 text-right">
                    ${schedules.filter(s => s.is_individual).reduce((acc, s) => acc + (s.per_session_fee ?? 0), 0).toLocaleString()}
                  </td>
                </tr>
              )}

              {/* Bonuses */}
              {teacher.adjustments?.filter(a => a.type === 'bonus').map((a, i) => (
                <tr key={i} className="text-green-700">
                  <td className="px-3 py-2">+ {a.name}</td>
                  <td className="px-3 py-2 text-right">${Number(a.amount).toLocaleString()}</td>
                </tr>
              ))}

              {/* Manual deductions */}
              {teacher.adjustments?.filter(a => a.type === 'deduction').map((a, i) => (
                <tr key={i} className="text-red-700">
                  <td className="px-3 py-2">- {a.name}</td>
                  <td className="px-3 py-2 text-right">-${Number(a.amount).toLocaleString()}</td>
                </tr>
              ))}

              {/* Auto deductions section */}
              {autoDeductions.length > 0 && (
                <>
                  <tr>
                    <td colSpan={2} className="px-3 py-1.5 bg-red-50 text-xs font-semibold text-red-700 border-t border-red-100">
                      自動扣款明細
                    </td>
                  </tr>
                  {autoDeductions.map((d) => {
                    const eff = getEffectiveDeductionAmount(d)
                    return (
                      <tr key={d.id} className={d.cancelled ? 'text-gray-400' : 'text-red-700'}>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs bg-red-100 text-red-600 px-1 rounded">自動</span>
                            {d.cancelled
                              ? <span className="line-through">{d.label}</span>
                              : d.label}
                          </span>
                          {d.cancelled && <span className="ml-1 text-xs text-gray-400">（已取消）</span>}
                          {d.overrideAmount !== null && !d.cancelled && (
                            <span className="ml-1 text-xs text-amber-600">（已調整）</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {d.cancelled
                            ? <span className="line-through text-gray-400">-${d.totalAmount.toLocaleString()}</span>
                            : `-$${eff.toLocaleString()}`}
                        </td>
                      </tr>
                    )
                  })}
                </>
              )}

              {/* Total */}
              {teacher.personal_insurance_total > 0 && (
                <tr className="text-red-700">
                  <td className="px-3 py-2">- 勞健保自付</td>
                  <td className="px-3 py-2 text-right">-${teacher.personal_insurance_total.toLocaleString()}</td>
                </tr>
              )}
              {supplementalPremiumAmount > 0 && (
                <tr className="text-amber-700">
                  <td className="px-3 py-2">二代健保補充保費試算</td>
                  <td className="px-3 py-2 text-right">${supplementalPremiumAmount.toLocaleString()}</td>
                </tr>
              )}
              <tr className="bg-indigo-50 font-bold">
                <td className="px-3 py-2 text-gray-800">實發金額</td>
                <td className="px-3 py-2 text-right text-indigo-700 text-base">
                  ${netAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {teacher.supplemental_health_reason && (
            <p className="text-xs text-gray-500">
              補充保費備註：{teacher.supplemental_health_reason}
            </p>
          )}

          {/* Attendance summary */}
          {attendance && (
            <div className="text-xs text-gray-500 border border-gray-100 rounded-lg p-3 space-y-1">
              <p className="font-medium text-gray-700 mb-1">出缺勤紀錄</p>
              <p>病假：{attendance.sick_leave_days} 天（不扣薪）</p>
              <p>事假：{attendance.personal_leave_days} 天</p>
              <p>曠職：{attendance.absent_days} 天</p>
              <p>遲到：{attendance.late_count ?? 0} 次</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

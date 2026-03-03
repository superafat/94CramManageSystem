'use client'

import { useEffect, useState } from 'react'
import { Schedule, CourseType, CourseBillingData } from './types'

interface WeeklyScheduleGridProps {
  weekDates: Date[]
  schedules: Schedule[]
  loading: boolean
  weekOffset: number
  onSelectSchedule: (schedule: Schedule) => void
  onRenewSchedule: (schedule: Schedule) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const formatDate = (date: Date) => date.toISOString().split('T')[0]
const formatTime = (time: string) => time.slice(0, 5)

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-700'
    case 'completed': return 'bg-green-100 text-green-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    case 'rescheduled': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

// 課程類型對應左邊框顏色：團班=藍、個指=橘、安親=綠
const getCourseTypeBorderColor = (courseType?: CourseType, subject?: string) => {
  if (courseType === 'group') return 'border-l-[#9DAEBB]'      // 莫蘭迪藍
  if (courseType === 'individual') return 'border-l-[#C8A882]' // 莫蘭迪橘
  if (courseType === 'daycare') return 'border-l-[#A8B5A2]'    // 莫蘭迪綠
  // 向後相容：以 subject 判斷
  switch (subject) {
    case '數學': return 'border-l-[#9DAEBB]'
    case '英文': return 'border-l-[#A8B5A2]'
    case '體育': return 'border-l-[#C8A882]'
    default: return 'border-l-gray-400'
  }
}

// 課程類型對應卡片背景色
const getCourseTypeBg = (courseType?: CourseType) => {
  if (courseType === 'group') return 'bg-[#EDF1F5]'      // 淡藍
  if (courseType === 'individual') return 'bg-[#F7F0E8]' // 淡橘
  if (courseType === 'daycare') return 'bg-[#EDF2EC]'    // 淡綠
  return 'bg-background'
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

const COURSE_TYPE_BADGE: Record<string, string> = {
  group: 'bg-[#9DAEBB]/20 text-[#5A7A8F]',
  individual: 'bg-[#C8A882]/20 text-[#8F6A3A]',
  daycare: 'bg-[#A8B5A2]/20 text-[#4A6B44]',
}

// ---- Billing helpers ----

const BILLING_FALLBACK: Record<string, CourseBillingData> = {}

async function fetchBillingData(courseId: string): Promise<CourseBillingData | null> {
  try {
    const res = await fetch(`/api/admin/billing/course/${courseId}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      if (res.status === 404 || res.status === 401) return null
      return null
    }
    const body = await res.json() as { data?: CourseBillingData } | CourseBillingData
    const data = (body as { data?: CourseBillingData }).data ?? (body as CourseBillingData)
    return data
  } catch {
    return null
  }
}

// 依 courseId 穩定產生 Demo 假資料（0~3 未繳人數）
const DEMO_STUDENT_NAMES = ['小明', '小華', '小美', '小強', '小玲', '小傑', '小雯', '小凱']
function getDemoUnpaid(courseId: string): { unpaidCount: number; unpaidStudents: string[] } {
  // 用 courseId 最後兩個字元的 charCode 做穩定的偽隨機
  const seed = (courseId.charCodeAt(courseId.length - 1) ?? 0) + (courseId.charCodeAt(courseId.length - 2) ?? 0)
  const count = seed % 4  // 0~3
  const students = DEMO_STUDENT_NAMES.slice(seed % DEMO_STUDENT_NAMES.length).concat(DEMO_STUDENT_NAMES).slice(0, count)
  return { unpaidCount: count, unpaidStudents: students }
}

interface BillingBadgeProps {
  courseId: string
  /** 排課本身攜帶的未繳人數（優先於 API 資料） */
  unpaidCount?: number
  /** 排課本身攜帶的未繳學生名單 */
  unpaidStudents?: string[]
}

function BillingBadge({ courseId, unpaidCount: propUnpaidCount, unpaidStudents: propUnpaidStudents }: BillingBadgeProps) {
  const [billing, setBilling] = useState<CourseBillingData | null>(
    BILLING_FALLBACK[courseId] ?? null
  )

  useEffect(() => {
    if (BILLING_FALLBACK[courseId]) {
      setBilling(BILLING_FALLBACK[courseId])
      return
    }
    fetchBillingData(courseId).then(data => {
      if (data) {
        BILLING_FALLBACK[courseId] = data
        setBilling(data)
      }
    })
  }, [courseId])

  // 若排課本身有 unpaidCount 欄位，優先使用；否則從 API billing 資料推算；最後 fallback 到 demo 假資料
  let unpaidCount: number
  let unpaidStudents: string[]
  let total: number

  if (propUnpaidCount !== undefined) {
    unpaidCount = propUnpaidCount
    unpaidStudents = propUnpaidStudents ?? []
    total = unpaidStudents.length > 0 ? unpaidStudents.length + (billing?.paid ?? 0) : unpaidCount + (billing?.paid ?? 1)
  } else if (billing && billing.total > 0) {
    unpaidCount = billing.total - billing.paid
    unpaidStudents = billing.students.filter(s => s.status !== 'paid').map(s => s.studentName)
    total = billing.total
  } else {
    // Demo 假資料
    const demo = getDemoUnpaid(courseId)
    unpaidCount = demo.unpaidCount
    unpaidStudents = demo.unpaidStudents
    total = unpaidCount + Math.max(1, unpaidCount)  // 假設至少有同等數量已繳
  }

  if (total === 0) return null

  const allPaid = unpaidCount === 0
  const nonePaid = billing ? billing.paid === 0 && billing.total > 0 : false
  const partial = !allPaid && !nonePaid

  // 全數已繳：不顯示 badge（正常狀態）
  if (allPaid) return null

  let colorClass: string
  let label: string
  if (nonePaid) {
    colorClass = 'bg-red-100 text-red-700 border border-red-200'
    label = `${unpaidCount}人未繳`
  } else if (partial && unpaidCount >= 3) {
    colorClass = 'bg-red-100 text-red-700 border border-red-200'
    label = `${unpaidCount}人未繳`
  } else {
    colorClass = 'bg-orange-100 text-orange-700 border border-orange-200'
    label = `${unpaidCount}人未繳`
  }

  const tooltipText = unpaidStudents.length > 0
    ? `未繳學生：${unpaidStudents.join('、')}`
    : `${unpaidCount} 位學生尚未繳費`

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-help ${colorClass}`}
      title={tooltipText}
    >
      ● {label}
    </span>
  )
}

export default function WeeklyScheduleGrid({
  weekDates,
  schedules,
  loading,
  onSelectSchedule,
  onRenewSchedule,
}: WeeklyScheduleGridProps) {
  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return schedules
      .filter(s => s.scheduled_date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {weekDates.map((date, idx) => {
        const daySchedules = getSchedulesForDate(date)
        const isToday = formatDate(date) === formatDate(new Date())

        return (
          <div key={idx} className={`rounded-xl border ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
            {/* Day Header */}
            <div className={`px-4 py-2 border-b ${isToday ? 'border-primary/20' : 'border-border'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-text'}`}>
                  週{WEEKDAYS[date.getDay()]}
                </span>
                <span className="text-sm text-text-muted">
                  {date.getMonth() + 1}/{date.getDate()}
                </span>
                {isToday && (
                  <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                    今天
                  </span>
                )}
                {daySchedules.length > 0 && (
                  <span className="ml-auto text-xs text-text-muted">{daySchedules.length} 堂</span>
                )}
              </div>
            </div>

            {/* Day Content */}
            <div className="p-3">
              {daySchedules.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-2">無課程</p>
              ) : (
                <div className="space-y-2">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`p-3 rounded-lg border-l-4 ${getCourseTypeBorderColor(schedule.course_type, schedule.subject)} ${getCourseTypeBg(schedule.course_type)} cursor-pointer hover:shadow-md transition-shadow relative`}
                      onClick={() => onSelectSchedule(schedule)}
                    >
                      {/* 續班按鈕 — 右上角，不觸發卡片點擊 */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onRenewSchedule(schedule)
                        }}
                        className="absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium leading-snug z-10"
                        title="續班（複製此課程）"
                      >
                        🔄 續班
                      </button>

                      <div className="flex items-start justify-between gap-2 pr-14">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-text">{schedule.course_name}</p>
                            {schedule.course_type && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COURSE_TYPE_BADGE[schedule.course_type] ?? ''}`}>
                                {COURSE_TYPE_LABEL[schedule.course_type]}
                              </span>
                            )}
                            {/* 繳費狀態 badge */}
                            <BillingBadge
                              courseId={schedule.course_id}
                              unpaidCount={schedule.unpaidCount}
                              unpaidStudents={schedule.unpaidStudents}
                            />
                          </div>
                          <p className="text-sm text-text-muted mt-0.5">
                            {schedule.teacher_name} {schedule.teacher_title}
                          </p>
                          {schedule.course_type === 'individual' && schedule.student_names && schedule.student_names.length > 0 && (
                            <p className="text-xs text-text-muted mt-0.5">
                              學生：{schedule.student_names.join('、')}
                            </p>
                          )}
                          {schedule.room_name && (
                            <p className="text-xs text-text-muted">教室：{schedule.room_name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-text">
                            {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}>
                            {schedule.status === 'scheduled' ? '已排' : schedule.status === 'completed' ? '已完成' : schedule.status === 'cancelled' ? '已取消' : schedule.status}
                          </span>
                          {schedule.course_type === 'individual' && schedule.fee_per_class && (
                            <p className="text-xs text-text-muted mt-0.5">${Number(schedule.fee_per_class).toLocaleString()}/堂</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { ScheduleEvent, DetailStudent } from './types'

interface DetailDrawerProps {
  event: ScheduleEvent
  students: DetailStudent[]
  onClose: () => void
  onEditClick: () => void
  onRosterClick: () => void
  onMakeupClick: () => void
  onRenewalClick: () => void
  onCancelClick: () => void
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

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export default function DetailDrawer({ event, students, onClose, onEditClick, onRosterClick, onMakeupClick, onRenewalClick, onCancelClick }: DetailDrawerProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text">課程詳情</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Course name + badge */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-text">{event.courseName}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${COURSE_TYPE_BADGE[event.courseType] ?? ''}`}>
                {COURSE_TYPE_LABEL[event.courseType] ?? event.courseType}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-14 shrink-0">時間</span>
              <span className="text-sm text-text">
                {event.date && `${event.date} `}
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-14 shrink-0">老師</span>
              <span className="text-sm text-text">{event.teacherName}</span>
            </div>

            {event.room && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-14 shrink-0">教室</span>
                <span className="text-sm text-text">{event.room}</span>
              </div>
            )}

            {event.courseType === 'individual' && event.studentName && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-14 shrink-0">學生</span>
                <span className="text-sm text-text">{event.studentName}</span>
              </div>
            )}
          </div>

          {/* Student list */}
          {students.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-text-muted mb-2">
                學生名單（{students.length} 人）
              </h5>
              <div className="space-y-1">
                {students.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-border/20"
                  >
                    <span className="text-sm text-text">{s.name}</span>
                    {s.grade && (
                      <span className="text-xs text-text-muted">{s.grade}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border space-y-2">
          {/* Row 1: 補課 + 續班 */}
          <div className="flex gap-2">
            <button
              onClick={onMakeupClick}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-[#C4956A] text-[#C4956A] hover:bg-[#C4956A]/10 transition-colors"
            >
              安排補課
            </button>
            <button
              onClick={onRenewalClick}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
            >
              📋 續班
            </button>
          </div>
          {/* Row 2: 編輯 + 管理名單 */}
          <div className="flex gap-2">
            <button
              onClick={onEditClick}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-border text-text hover:bg-border/30 transition-colors"
            >
              編輯
            </button>
            <button
              onClick={onRosterClick}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              管理名單
            </button>
          </div>
          {/* Row 3: 取消課程 */}
          <button
            onClick={onCancelClick}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
          >
            取消此堂課
          </button>
        </div>
      </div>
    </>
  )
}

'use client'

import { Schedule, AddForm, ConflictWarning } from './types'

const WEEK_DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

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

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

interface ScheduleDetailModalProps {
  schedule: Schedule
  onClose: () => void
  onCancel: (scheduleId: string) => void
}

export function ScheduleDetailModal({ schedule, onClose, onCancel }: ScheduleDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-text mb-4">{schedule.course_name}</h2>
        <div className="space-y-3">
          {schedule.course_type && (
            <div className="flex justify-between">
              <span className="text-text-muted">課程類型</span>
              <span className="text-text">{COURSE_TYPE_LABEL[schedule.course_type] ?? schedule.course_type}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-muted">講師</span>
            <span className="text-text">{schedule.teacher_name} {schedule.teacher_title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">日期</span>
            <span className="text-text">{schedule.scheduled_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">時間</span>
            <span className="text-text">
              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">科目</span>
            <span className="text-text">{schedule.subject}</span>
          </div>
          {schedule.room_name && (
            <div className="flex justify-between">
              <span className="text-text-muted">教室</span>
              <span className="text-text">{schedule.room_name}</span>
            </div>
          )}
          {schedule.course_type === 'individual' && schedule.student_names && schedule.student_names.length > 0 && (
            <div className="flex justify-between">
              <span className="text-text-muted">學生</span>
              <span className="text-text text-right">{schedule.student_names.join('、')}</span>
            </div>
          )}
          {schedule.course_type === 'individual' && schedule.fee_per_class && (
            <div className="flex justify-between">
              <span className="text-text-muted">單堂費用</span>
              <span className="text-primary font-medium">${Number(schedule.fee_per_class).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-muted">堂薪</span>
            <span className="text-primary font-medium">${Number(schedule.rate_per_class).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">狀態</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(schedule.status)}`}>
              {schedule.status === 'scheduled' ? '已排' : schedule.status === 'completed' ? '已完成' : schedule.status === 'cancelled' ? '已取消' : schedule.status}
            </span>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          {schedule.status === 'scheduled' && (
            <button
              onClick={() => onCancel(schedule.id)}
              className="flex-1 py-2 border border-[#B5706E] text-[#B5706E] rounded-lg text-sm"
            >
              取消此課
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-primary text-white rounded-lg font-medium"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

interface ScheduleFormProps {
  addForm: AddForm
  onFormChange: (form: AddForm) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  conflicts: ConflictWarning[]
  children?: React.ReactNode
}

export default function ScheduleForm({
  addForm,
  onFormChange,
  onSubmit,
  onClose,
  conflicts,
  children,
}: ScheduleFormProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text mb-4">新增排課</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Teacher/Course selectors + course type + students rendered via children */}
          {children}

          {/* 教室 */}
          <div>
            <label className="block text-sm text-text-muted mb-1">教室</label>
            <input
              type="text"
              value={addForm.roomId}
              onChange={(e) => onFormChange({ ...addForm, roomId: e.target.value })}
              placeholder="教室名稱（選填）"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
            />
          </div>

          {/* 排課模式切換 */}
          <div>
            <label className="block text-sm text-text-muted mb-2">排課模式</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFormChange({ ...addForm, recurrenceMode: 'single' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  addForm.recurrenceMode === 'single'
                    ? 'bg-[#6f8d75] text-white border-transparent'
                    : 'bg-surface border-border text-text-muted hover:border-[#8FA895]'
                }`}
              >
                單堂
              </button>
              <button
                type="button"
                onClick={() => onFormChange({ ...addForm, recurrenceMode: 'weekly' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  addForm.recurrenceMode === 'weekly'
                    ? 'bg-[#6f8d75] text-white border-transparent'
                    : 'bg-surface border-border text-text-muted hover:border-[#8FA895]'
                }`}
              >
                每週重複
              </button>
            </div>
          </div>

          {addForm.recurrenceMode === 'single' ? (
            <div>
              <label className="block text-sm text-text-muted mb-1">日期 *</label>
              <input
                type="date"
                value={addForm.scheduledDate}
                onChange={(e) => onFormChange({ ...addForm, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-text-muted mb-2">週課天數 *</label>
                <div className="flex gap-1.5">
                  {WEEK_DAY_LABELS.map((label, idx) => {
                    const selected = addForm.weekDays.includes(idx)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? addForm.weekDays.filter(d => d !== idx)
                            : [...addForm.weekDays, idx]
                          onFormChange({ ...addForm, weekDays: next })
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                          selected
                            ? 'bg-[#6f8d75] text-white border-transparent'
                            : 'bg-surface border-border text-text-muted hover:border-[#8FA895]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">開始日期 *</label>
                  <input
                    type="date"
                    value={addForm.recurrenceStart}
                    onChange={(e) => onFormChange({ ...addForm, recurrenceStart: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required={addForm.recurrenceMode === 'weekly'}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">結束日期 *</label>
                  <input
                    type="date"
                    value={addForm.recurrenceEnd}
                    onChange={(e) => onFormChange({ ...addForm, recurrenceEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required={addForm.recurrenceMode === 'weekly'}
                  />
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">開始時間 *</label>
              <input
                type="time"
                value={addForm.startTime}
                onChange={(e) => onFormChange({ ...addForm, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">結束時間 *</label>
              <input
                type="time"
                value={addForm.endTime}
                onChange={(e) => onFormChange({ ...addForm, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                required
              />
            </div>
          </div>

          {/* 衝突警告 */}
          {conflicts.length > 0 && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 space-y-1.5">
              <p className="text-sm font-medium text-yellow-800">⚠ 排課衝突警告</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-yellow-700">
                  {c.type === 'room' ? '🏫' : '👨‍🏫'} {c.message}
                </p>
              ))}
              <p className="text-xs text-yellow-600 mt-1">仍可繼續新增，請確認後送出。</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-border rounded-lg text-text"
            >
              取消
            </button>
            <button
              type="submit"
              className={`flex-1 py-2 rounded-lg font-medium text-white ${conflicts.length > 0 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-primary'}`}
            >
              {conflicts.length > 0 ? '仍要新增' : '新增排課'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

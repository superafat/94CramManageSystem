'use client'

import { Schedule, AddForm } from './types'

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
  children?: React.ReactNode
}

export default function ScheduleForm({ addForm, onFormChange, onSubmit, onClose, children }: ScheduleFormProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text mb-4">新增排課</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Teacher/Course selectors rendered by TeacherCourseSelector via children */}
          {children}
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
              className="flex-1 py-2 bg-primary text-white rounded-lg font-medium"
            >
              新增排課
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

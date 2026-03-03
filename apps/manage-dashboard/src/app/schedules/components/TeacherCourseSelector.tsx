'use client'

import { Teacher, Course, Student, AddForm, CourseType } from './types'

interface TeacherCourseSelectorProps {
  teachers: Teacher[]
  courses: Course[]
  students: Student[]
  addForm: AddForm
  onFormChange: (form: AddForm) => void
}

const COURSE_TYPE_OPTIONS: { value: CourseType; label: string; desc: string }[] = [
  { value: 'group', label: '團班', desc: '多人同時上課' },
  { value: 'individual', label: '個指', desc: '1-3 位學生' },
  { value: 'daycare', label: '安親', desc: '課後安親托育' },
]

const COURSE_TYPE_ACTIVE: Record<CourseType, string> = {
  group: 'bg-[#9DAEBB] text-white',
  individual: 'bg-[#C8A882] text-white',
  daycare: 'bg-[#A8B5A2] text-white',
}

export default function TeacherCourseSelector({
  teachers,
  courses,
  students,
  addForm,
  onFormChange,
}: TeacherCourseSelectorProps) {
  const isIndividual = addForm.courseType === 'individual'

  const toggleStudent = (studentId: string) => {
    const current = addForm.studentIds
    if (current.includes(studentId)) {
      onFormChange({ ...addForm, studentIds: current.filter(id => id !== studentId) })
    } else {
      if (current.length >= 3) return // 個指最多 3 位
      onFormChange({ ...addForm, studentIds: [...current, studentId] })
    }
  }

  return (
    <>
      {/* 課程類型 */}
      <div>
        <label className="block text-sm text-text-muted mb-2">課程類型 *</label>
        <div className="grid grid-cols-3 gap-2">
          {COURSE_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFormChange({ ...addForm, courseType: opt.value, studentIds: [] })}
              className={`flex flex-col items-center py-2.5 px-2 rounded-xl border-2 transition-all ${
                addForm.courseType === opt.value
                  ? `${COURSE_TYPE_ACTIVE[opt.value]} border-transparent`
                  : 'bg-surface border-border text-text-muted hover:border-primary'
              }`}
            >
              <span className="font-medium text-sm">{opt.label}</span>
              <span className={`text-xs mt-0.5 ${addForm.courseType === opt.value ? 'text-white/80' : 'text-text-muted'}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 課程 */}
      <div>
        <label className="block text-sm text-text-muted mb-1">課程 *</label>
        <select
          value={addForm.courseId}
          onChange={(e) => onFormChange({ ...addForm, courseId: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
          required
        >
          <option value="">選擇課程</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
          ))}
        </select>
      </div>

      {/* 講師 */}
      <div>
        <label className="block text-sm text-text-muted mb-1">講師 *</label>
        <select
          value={addForm.teacherId}
          onChange={(e) => onFormChange({ ...addForm, teacherId: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
          required
        >
          <option value="">選擇講師</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.title}) - ${t.rate_per_class}/堂</option>
          ))}
        </select>
      </div>

      {/* 個指：選擇學生（1-3 位） */}
      {isIndividual && (
        <div>
          <label className="block text-sm text-text-muted mb-1">
            學生
            <span className="ml-1 text-xs text-text-muted">（已選 {addForm.studentIds.length}/3）</span>
          </label>
          {students.length === 0 ? (
            <p className="text-sm text-text-muted py-2">無學生資料</p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-background">
              {students.map(s => {
                const selected = addForm.studentIds.includes(s.id)
                const disabled = !selected && addForm.studentIds.length >= 3
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStudent(s.id)}
                    disabled={disabled}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selected
                        ? 'bg-[#C8A882]/20 text-[#8F6A3A] font-medium'
                        : disabled
                        ? 'text-text-muted opacity-40 cursor-not-allowed'
                        : 'hover:bg-surface-hover text-text'
                    }`}
                  >
                    <span className="mr-2">{selected ? '✓' : '○'}</span>
                    {s.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 個指：單堂費用 */}
      {isIndividual && (
        <div>
          <label className="block text-sm text-text-muted mb-1">單堂費用</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
            <input
              type="number"
              min="0"
              step="50"
              value={addForm.feePerClass}
              onChange={(e) => onFormChange({ ...addForm, feePerClass: e.target.value })}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-text"
            />
          </div>
        </div>
      )}
    </>
  )
}

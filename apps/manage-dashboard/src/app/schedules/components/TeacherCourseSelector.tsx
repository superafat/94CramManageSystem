'use client'

import { Teacher, Course, AddForm } from './types'

interface TeacherCourseSelectorProps {
  teachers: Teacher[]
  courses: Course[]
  addForm: AddForm
  onFormChange: (form: AddForm) => void
}

export default function TeacherCourseSelector({
  teachers,
  courses,
  addForm,
  onFormChange,
}: TeacherCourseSelectorProps) {
  return (
    <>
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
    </>
  )
}

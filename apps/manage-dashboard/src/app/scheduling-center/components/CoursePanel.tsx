'use client'

import type { CourseItem, CourseTypeFilter } from './types'

interface CoursePanelProps {
  courses: CourseItem[]
  filter: CourseTypeFilter
  onFilterChange: (filter: CourseTypeFilter) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onCourseClick: (courseId: string) => void
  selectedCourseId: string | null
}

const FILTER_TABS: { key: CourseTypeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'group', label: '團班' },
  { key: 'daycare', label: '安親' },
  { key: 'individual', label: '個指' },
]

const COURSE_TYPE_DOT: Record<string, string> = {
  group: 'bg-[#9DAEBB]',
  individual: 'bg-[#C8A882]',
  daycare: 'bg-[#A8B5A2]',
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

export default function CoursePanel({
  courses,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onCourseClick,
  selectedCourseId,
}: CoursePanelProps) {
  const filtered = courses.filter(c => {
    if (filter !== 'all' && c.courseType !== filter) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text">課程列表</h2>
        <p className="text-xs text-text-muted mt-0.5">{filtered.length} 門課程</p>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border px-2 pt-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`flex-1 text-xs font-medium pb-2 pt-1 border-b-2 transition-colors ${
              filter === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="搜尋課程..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-white text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Course list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-10">無課程資料</p>
        ) : (
          <div className="space-y-1">
            {filtered.map(course => (
              <button
                key={course.id}
                type="button"
                onClick={() => onCourseClick(course.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  selectedCourseId === course.id
                    ? 'bg-primary/10 ring-1 ring-primary'
                    : 'hover:bg-border/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${COURSE_TYPE_DOT[course.courseType] ?? 'bg-gray-400'}`} />
                  <span className="text-sm font-medium text-text truncate flex-1">
                    {course.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-4">
                  <span className="text-[10px] text-text-muted">
                    {COURSE_TYPE_LABEL[course.courseType] ?? course.courseType}
                  </span>
                  {course.subject && (
                    <span className="text-[10px] text-text-muted">{course.subject}</span>
                  )}
                  {course.studentCount != null && (
                    <span className="text-[10px] text-text-muted">
                      {course.studentCount}{course.maxStudents ? `/${course.maxStudents}` : ''} 人
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

# Scheduling / Grade Auto-Calc / Makeup Class Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three-phase enhancement: P1 auto-calculate student grade from DOB with manual override, P2 scheduling center create/edit/makeup modals, P3 attendance page one-click makeup arrangement.

**Architecture:** Frontend-first approach — each phase adds new UI components and extends existing backend APIs. Shared components (`StudentPicker`, `MakeupScheduleModal`) are extracted for reuse across P2 and P3.

**Tech Stack:** Next.js (React), Hono backend, Drizzle ORM, PostgreSQL, Tailwind CSS (Morandi palette), zod validation.

---

## Phase 1: Student Grade Auto-Calculation

### Task 1: Add `grade_override` column to DB schema

**Files:**
- Modify: `packages/shared/src/db/schema/manage.ts:28-44`

**Step 1: Add the column**

In `manageStudents` table definition, add after `grade`:

```typescript
gradeOverride: varchar('grade_override', { length: 20 }),  // 手動校正年級
```

**Step 2: Push schema to DB**

Run: `pnpm --filter @94cram/shared drizzle-kit push`
Expected: Column `grade_override` added to `manage_students`.

**Step 3: Commit**

```bash
git add packages/shared/src/db/schema/manage.ts
git commit -m "feat(shared): add grade_override column to manage_students"
```

---

### Task 2: Update backend student routes to handle `grade_override`

**Files:**
- Modify: `apps/manage-backend/src/routes/admin/students.ts:69-80` (GET query)
- Modify: `apps/manage-backend/src/routes/admin/students.ts:216-220` (PUT handler)
- Modify: `apps/manage-backend/src/utils/validation.ts` (updateStudentSchema)

**Step 1: Add `grade_override` to GET query SELECT**

In the GET `/students` SQL query (around line 69), add `s.grade_override` to the SELECT:

```sql
SELECT s.id, s.student_code, s.full_name, s.nickname, s.gender,
  s.date_of_birth, s.school_name, s.grade_level, s.grade_override, s.branch_id,
  ...
```

**Step 2: Add `grade_override` to GET single student if exists**

Search for `studentsRoutes.get('/students/:id'` and add `grade_override` to its SELECT too.

**Step 3: Add `gradeOverride` to `updateStudentSchema` in validation.ts**

```typescript
gradeOverride: z.string().max(20).nullable().optional(),
```

**Step 4: Add `grade_override` to PUT handler SET clause**

In the PUT handler, add to the SQL UPDATE:

```sql
grade_override = ${body.gradeOverride ?? null},
```

**Step 5: Verify with typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 6: Commit**

```bash
git add apps/manage-backend/src/routes/admin/students.ts apps/manage-backend/src/utils/validation.ts
git commit -m "feat(manage-backend): support grade_override in student CRUD"
```

---

### Task 3: Update student page — auto-grade display with override UI

**Files:**
- Modify: `apps/manage-dashboard/src/app/students/page.tsx`

**Step 1: Update Student interface**

Add `grade_override?: string | null` to the `Student` interface (around line 43).

**Step 2: Update form state**

Add `gradeOverride` to `emptyForm`:
```typescript
const emptyForm = { fullName: '', gradeLevel: '', phone: '', email: '', schoolName: '', notes: '', dateOfBirth: '', gradeOverride: '' }
```

**Step 3: Replace grade dropdown in modal form**

Replace the `gradeLevel` `<select>` dropdown with auto-computed grade display + override button:

```tsx
{/* Grade — auto computed from DOB */}
<div>
  <label className="block text-sm font-medium text-text-muted mb-1">年級</label>
  {form.dateOfBirth ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text font-medium">
        {form.gradeOverride || computeGrade(form.dateOfBirth) || '無法計算'}
      </span>
      {form.gradeOverride && (
        <span className="text-[10px] px-1.5 py-0.5 bg-[#C4956A]/10 text-[#C4956A] rounded-full">已手動校正</span>
      )}
      {!form.gradeOverride ? (
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, gradeOverride: computeGrade(f.dateOfBirth) || '' }))}
          className="text-xs text-primary hover:underline"
        >
          校正
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, gradeOverride: '' }))}
          className="text-xs text-text-muted hover:underline"
        >
          恢復自動
        </button>
      )}
    </div>
  ) : (
    <p className="text-sm text-text-muted">請先填寫出生日期</p>
  )}
  {form.gradeOverride !== '' && form.gradeOverride !== undefined && (
    <select
      value={form.gradeOverride}
      onChange={e => setForm(f => ({ ...f, gradeOverride: e.target.value }))}
      className="mt-1 w-full px-3 py-2 rounded-xl border border-border text-sm"
    >
      <option value="">自動計算</option>
      {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
    </select>
  )}
</div>
```

**Step 4: Update `openEdit` to populate gradeOverride**

```typescript
gradeOverride: student.grade_override || '',
```

**Step 5: Update `handleSubmit` to send gradeOverride**

In the JSON body, add:
```typescript
gradeOverride: form.gradeOverride || null,
```

**Step 6: Update card display**

In the student list card, update the grade badge to show override vs auto:
```tsx
{(student.grade_override || student.computed_grade || student.grade_level) && (
  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
    {student.grade_override || computeGrade(student.date_of_birth || '') || student.grade_level}
    {student.grade_override && <span className="ml-1 text-[10px] text-[#C4956A]">校正</span>}
  </span>
)}
```

**Step 7: Verify with typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 8: Commit**

```bash
git add apps/manage-dashboard/src/app/students/page.tsx
git commit -m "feat(manage-dashboard): auto-compute grade from DOB with manual override"
```

---

## Phase 2: Scheduling Center Enhancements

### Task 4: Create `StudentPicker` shared component

**Files:**
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/StudentPicker.tsx`

**Step 1: Extract student picker from RosterModal**

Create a reusable component that provides student search + checkbox selection. This is the core of RosterModal's left panel, extracted as an embeddable form section:

```tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

interface StudentOption {
  id: string
  name: string
  grade?: string
}

interface StudentPickerProps {
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  courseType?: 'group' | 'individual' | 'daycare'
  maxStudents?: number
}

export default function StudentPicker({ selectedIds, onSelectionChange, courseType, maxStudents }: StudentPickerProps) {
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/students?status=active&limit=200', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const students = data.data?.students || data.students || []
      setAllStudents(students.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: (s.full_name as string) || (s.name as string) || '',
        grade: (s.grade_level as string) || (s.grade as string) || undefined,
      })))
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const grades = useMemo(() => {
    const set = new Set<string>()
    for (const s of allStudents) { if (s.grade) set.add(s.grade) }
    return Array.from(set).sort()
  }, [allStudents])

  const filtered = useMemo(() => {
    let list = allStudents
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q))
    }
    if (gradeFilter) list = list.filter(s => s.grade === gradeFilter)
    return list
  }, [allStudents, search, gradeFilter])

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (courseType === 'individual' && next.size >= 1) {
        // Individual: single select, replace
        next.clear()
      }
      next.add(id)
    }
    onSelectionChange(next)
  }

  const selected = allStudents.filter(s => selectedIds.has(s.id))

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: all students */}
      <div className="flex flex-col min-h-0">
        <h4 className="text-sm font-semibold text-text mb-2">選擇學生</h4>
        <div className="flex gap-2 mb-2">
          <input type="text" placeholder="搜尋姓名..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg border border-border bg-white">
            <option value="">全年級</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-48 pr-1">
          {filtered.map(s => (
            <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-border/20 cursor-pointer">
              <input type={courseType === 'individual' ? 'radio' : 'checkbox'}
                checked={selectedIds.has(s.id)} onChange={() => toggle(s.id)}
                className="rounded border-border text-primary focus:ring-primary/40" />
              <span className="text-sm text-text flex-1">{s.name}</span>
              {s.grade && <span className="text-xs text-text-muted">{s.grade}</span>}
            </label>
          ))}
        </div>
      </div>
      {/* Right: selected */}
      <div className="flex flex-col min-h-0">
        <h4 className="text-sm font-semibold text-text mb-2">
          已選 <span className="text-xs font-normal text-text-muted">({selected.length}{maxStudents != null ? `/${maxStudents}` : ''} 人)</span>
        </h4>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-48 pr-1">
          {selected.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">尚未選擇學生</p>
          ) : selected.map(s => (
            <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-border/20">
              <span className="text-sm text-text">{s.name}</span>
              <button onClick={() => toggle(s.id)} className="text-text-muted hover:text-[#B5706E] text-sm px-1">&times;</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/manage-dashboard/src/app/scheduling-center/components/StudentPicker.tsx
git commit -m "feat(manage-dashboard): extract StudentPicker component for reuse"
```

---

### Task 5: Create `EditScheduleModal` component

**Files:**
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/EditScheduleModal.tsx`
- Modify: `apps/manage-dashboard/src/app/scheduling-center/page.tsx` (wire up)

**Step 1: Create EditScheduleModal**

Full edit modal with all schedule fields + embedded StudentPicker. The modal fetches current schedule data and allows editing course, teacher, time, room, and student list.

Key fields:
- `scheduledDate` (date input)
- `startTime` / `endTime` (time inputs)
- `teacherId` (dropdown — fetch from `/api/w8/teachers`)
- `room` (text input)
- `notes` (textarea)
- Embedded `StudentPicker` for managing student list

On save:
1. `PUT /api/w8/schedules/:id` with schedule fields
2. Diff student list and call `POST/DELETE /api/admin/enrollments/batch` for changes

The component signature:

```tsx
interface EditScheduleModalProps {
  isOpen: boolean
  scheduleId: string
  courseId: string
  courseName: string
  courseType: 'group' | 'individual' | 'daycare'
  onClose: () => void
  onUpdated: () => void
}
```

**Step 2: Wire up in page.tsx**

In `scheduling-center/page.tsx`:
- Add state: `const [editScheduleId, setEditScheduleId] = useState<string | null>(null)`
- In `handleEventClick`'s `onEditClick` callback, set `editScheduleId` to the schedule's base ID
- Render `<EditScheduleModal>` when `editScheduleId` is not null
- On modal close/update, clear `editScheduleId` and re-fetch schedules

**Step 3: Verify with typecheck**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add apps/manage-dashboard/src/app/scheduling-center/components/EditScheduleModal.tsx apps/manage-dashboard/src/app/scheduling-center/page.tsx
git commit -m "feat(manage-dashboard): add EditScheduleModal for scheduling center"
```

---

### Task 6: Add student selection to create schedule flow

**Files:**
- Modify: `apps/manage-dashboard/src/app/scheduling-center/page.tsx`

**Step 1: Check if a create schedule modal already exists**

Search for existing create modal code. If none exists, create a `CreateScheduleModal` component.

**Step 2: Add StudentPicker to create flow**

After the basic schedule fields (course, teacher, time, room), add an optional `StudentPicker` section.

On save:
1. `POST /api/w8/schedules` to create the schedule
2. If students selected: `POST /api/admin/enrollments/batch` with `{ courseId, studentIds }`

**Step 3: Verify with typecheck**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add apps/manage-dashboard/src/app/scheduling-center/
git commit -m "feat(manage-dashboard): add student selection to create schedule modal"
```

---

### Task 7: Create `MakeupScheduleModal` shared component

**Files:**
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/MakeupScheduleModal.tsx`

**Step 1: Create the modal**

Props:

```tsx
interface MakeupScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  // Pre-filled context (from attendance or schedule detail)
  studentId?: string
  studentName?: string
  originalDate?: string
  originalCourseId?: string
  originalCourseName?: string
}
```

UI:
- Student name (pre-filled or selectable if not provided)
- Original course + date (pre-filled, read-only)
- Makeup date (date input)
- Makeup time start/end (time inputs)
- Teacher (dropdown — fetch from `/api/w8/teachers`)
- Room (text input)
- **Charge toggle** (`是否收費` switch, default OFF)
  - When ON: amount field pre-filled from course's `fee_per_session`, editable
- Notes (textarea)

On save:
- `POST /api/admin/makeup-classes` with `{ studentId, originalDate, originalCourseId, originalCourseName, notes }`
- Then `PUT /api/admin/makeup-classes/:id/schedule` with `{ makeupDate, makeupTime, makeupEndTime, makeupTeacherId, makeupRoom }`
- If charging: `POST /api/admin/billing` with fee record (or add billing fields to makeup-classes endpoint)

**Step 2: Commit**

```bash
git add apps/manage-dashboard/src/app/scheduling-center/components/MakeupScheduleModal.tsx
git commit -m "feat(manage-dashboard): create MakeupScheduleModal with billing toggle"
```

---

### Task 8: Add "安排補課" button to DetailDrawer

**Files:**
- Modify: `apps/manage-dashboard/src/app/scheduling-center/components/DetailDrawer.tsx`
- Modify: `apps/manage-dashboard/src/app/scheduling-center/page.tsx`

**Step 1: Add callback prop to DetailDrawer**

Add `onMakeupClick: () => void` to `DetailDrawerProps`.

**Step 2: Add button to DetailDrawer footer**

In the footer `<div>` (line 117), add a third button:

```tsx
<button
  onClick={onMakeupClick}
  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-[#C4956A] text-[#C4956A] hover:bg-[#C4956A]/10 transition-colors"
>
  安排補課
</button>
```

**Step 3: Wire up in page.tsx**

- Add state for makeup modal: `const [makeupContext, setMakeupContext] = useState<{...} | null>(null)`
- Pass `onMakeupClick` to DetailDrawer that sets context from `selectedEvent`
- Render `<MakeupScheduleModal>` when `makeupContext` is not null

**Step 4: Verify with typecheck**

Run: `pnpm typecheck`

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/app/scheduling-center/
git commit -m "feat(manage-dashboard): add makeup scheduling button to schedule detail drawer"
```

---

## Phase 3: Attendance Makeup Arrangement

### Task 9: Add "安排補課" button to attendance page

**Files:**
- Modify: `apps/manage-dashboard/src/app/attendance/page.tsx`

**Step 1: Import MakeupScheduleModal**

```tsx
import MakeupScheduleModal from '../scheduling-center/components/MakeupScheduleModal'
```

**Step 2: Add state**

```tsx
const [makeupTarget, setMakeupTarget] = useState<{
  studentId: string
  studentName: string
  date: string
} | null>(null)
```

**Step 3: Add button to absent/leave rows**

In the attendance list rendering, for rows where `status === 'absent'` or `status === 'leave'`, add an "安排補課" button:

```tsx
{(r.status === 'absent' || r.status === 'leave') && (
  <button
    onClick={() => setMakeupTarget({
      studentId: r.student_id,
      studentName: r.student_name,
      date: r.date,
    })}
    className="text-xs px-2 py-1 rounded-lg border border-[#C4956A] text-[#C4956A] hover:bg-[#C4956A]/10"
  >
    安排補課
  </button>
)}
```

**Step 4: Render MakeupScheduleModal**

At the bottom of the page component, add:

```tsx
<MakeupScheduleModal
  isOpen={makeupTarget !== null}
  onClose={() => setMakeupTarget(null)}
  onCreated={() => { setMakeupTarget(null); loadData() }}
  studentId={makeupTarget?.studentId}
  studentName={makeupTarget?.studentName}
  originalDate={makeupTarget?.date}
/>
```

**Step 5: Verify with typecheck**

Run: `pnpm typecheck`

**Step 6: Commit**

```bash
git add apps/manage-dashboard/src/app/attendance/page.tsx
git commit -m "feat(manage-dashboard): add one-click makeup scheduling from attendance page"
```

---

### Task 10: Final verification and push

**Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 2: Build**

Run: `pnpm build`
Expected: All apps build successfully.

**Step 3: Push and verify CI**

```bash
git push origin main
```

Wait 3 minutes, then check GitHub Actions:
```bash
gh run list --limit 3
```

Expected: CI passes (typecheck + build green).

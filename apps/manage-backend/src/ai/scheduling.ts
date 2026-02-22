/**
 * W5: Smart Scheduling Engine
 * Conflict detection + AI schedule suggestions
 */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

export interface ScheduleConflict {
  type: 'student' | 'teacher' | 'classroom'
  entityName: string
  existingSlot: {
    subject: string
    startTime: string
    endTime: string
  }
}

export interface TimeSlotInput {
  tenantId: string
  branchId: string
  studentId: string
  teacherId: string
  classroomId?: string
  subject: string
  dayOfWeek: number
  startTime: string  // 'HH:MM'
  endTime: string
  effectiveFrom?: string
}

/**
 * Check for scheduling conflicts before inserting a time slot
 */
export async function checkConflicts(input: TimeSlotInput): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []
  const effFrom = input.effectiveFrom ?? new Date().toISOString().slice(0, 10)

  // Check student conflict
  const studentConflicts = await db.execute(sql`
    SELECT ts.subject, ts.start_time::text, ts.end_time::text, s.name as entity_name
    FROM time_slots ts
    JOIN students s ON ts.student_id = s.id
    WHERE ts.tenant_id = ${input.tenantId}
      AND ts.student_id = ${input.studentId}
      AND ts.day_of_week = ${input.dayOfWeek}
      AND ts.status = 'active'
      AND (ts.effective_until IS NULL OR ts.effective_until >= ${effFrom}::date)
      AND ts.start_time < ${input.endTime}::time
      AND ts.end_time > ${input.startTime}::time
  `) as unknown as any[]

  for (const c of studentConflicts) {
    conflicts.push({
      type: 'student',
      entityName: c.entity_name,
      existingSlot: { subject: c.subject, startTime: c.start_time, endTime: c.end_time },
    })
  }

  // Check teacher conflict
  const teacherConflicts = await db.execute(sql`
    SELECT ts.subject, ts.start_time::text, ts.end_time::text, t.name as entity_name
    FROM time_slots ts
    JOIN teachers t ON ts.teacher_id = t.id
    WHERE ts.tenant_id = ${input.tenantId}
      AND ts.teacher_id = ${input.teacherId}
      AND ts.day_of_week = ${input.dayOfWeek}
      AND ts.status = 'active'
      AND (ts.effective_until IS NULL OR ts.effective_until >= ${effFrom}::date)
      AND ts.start_time < ${input.endTime}::time
      AND ts.end_time > ${input.startTime}::time
  `) as unknown as any[]

  for (const c of teacherConflicts) {
    conflicts.push({
      type: 'teacher',
      entityName: c.entity_name,
      existingSlot: { subject: c.subject, startTime: c.start_time, endTime: c.end_time },
    })
  }

  // Check classroom conflict
  if (input.classroomId) {
    const roomConflicts = await db.execute(sql`
      SELECT ts.subject, ts.start_time::text, ts.end_time::text, cr.name as entity_name
      FROM time_slots ts
      JOIN classrooms cr ON ts.classroom_id = cr.id
      WHERE ts.tenant_id = ${input.tenantId}
        AND ts.classroom_id = ${input.classroomId}
        AND ts.day_of_week = ${input.dayOfWeek}
        AND ts.status = 'active'
        AND (ts.effective_until IS NULL OR ts.effective_until >= ${effFrom}::date)
        AND ts.start_time < ${input.endTime}::time
        AND ts.end_time > ${input.startTime}::time
    `) as unknown as any[]

    for (const c of roomConflicts) {
      conflicts.push({
        type: 'classroom',
        entityName: c.entity_name,
        existingSlot: { subject: c.subject, startTime: c.start_time, endTime: c.end_time },
      })
    }
  }

  return conflicts
}

/**
 * Create a time slot after conflict check
 */
export async function createTimeSlot(input: TimeSlotInput): Promise<{ id: string } | { conflicts: ScheduleConflict[] }> {
  const conflicts = await checkConflicts(input)
  if (conflicts.length > 0) return { conflicts }

  const effFrom = input.effectiveFrom ?? new Date().toISOString().slice(0, 10)
  const durationMin = timeDiffMinutes(input.startTime, input.endTime)

  const result = await db.execute(sql`
    INSERT INTO time_slots (tenant_id, branch_id, student_id, teacher_id, classroom_id, subject, day_of_week, start_time, end_time, duration_min, effective_from)
    VALUES (${input.tenantId}, ${input.branchId}, ${input.studentId}, ${input.teacherId}, ${input.classroomId ?? null}, ${input.subject}, ${input.dayOfWeek}, ${input.startTime}::time, ${input.endTime}::time, ${durationMin}, ${effFrom}::date)
    RETURNING id
  `) as unknown as { id: string }[]

  return { id: result[0].id }
}

/**
 * Get weekly schedule for a branch
 */
export async function getWeeklySchedule(tenantId: string, branchId: string) {
  const rows = await db.execute(sql`
    SELECT ts.*, s.name as student_name, t.name as teacher_name, cr.name as classroom_name
    FROM time_slots ts
    LEFT JOIN students s ON ts.student_id = s.id
    LEFT JOIN teachers t ON ts.teacher_id = t.id
    LEFT JOIN classrooms cr ON ts.classroom_id = cr.id
    WHERE ts.tenant_id = ${tenantId}
      AND ts.branch_id = ${branchId}
      AND ts.status = 'active'
    ORDER BY ts.day_of_week, ts.start_time
  `)
  return rows
}

function timeDiffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

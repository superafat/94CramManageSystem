import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassFaceEnrollments, manageStudents, inclassAttendances, manageEnrollments } from '@94cram/shared/db'
import { and, eq, gte, lt } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'
import { encodeSingleFace, encodeAllFaces, findBestMatch } from '../services/faceRecognition.js'

const faceRouter = new Hono<{ Variables: Variables }>()

// 限制 base64 圖片大小（5MB）
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const enrollSchema = z.object({
  studentId: z.string().uuid(),
  image: z.string().min(100).max(MAX_IMAGE_SIZE), // base64
})

const recognizeSchema = z.object({
  image: z.string().min(100).max(MAX_IMAGE_SIZE), // base64
  autoCheckin: z.boolean().default(false),
  classId: z.string().uuid().optional(),
})

// POST /api/face/enroll
faceRouter.post('/enroll', zValidator('json', enrollSchema), async (c) => {
  try {
    const { studentId, image } = c.req.valid('json')
    const tenantId = c.get('schoolId')

    const [student] = await db.select().from(manageStudents).where(
      and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId))
    )
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const embedding = await encodeSingleFace(image)
    if (!embedding) {
      return c.json({ error: 'No face detected in image. Please retake with clear frontal face.' }, 422)
    }

    await db.delete(inclassFaceEnrollments).where(
      and(
        eq(inclassFaceEnrollments.tenantId, tenantId),
        eq(inclassFaceEnrollments.studentId, studentId)
      )
    )

    const [enrollment] = await db.insert(inclassFaceEnrollments).values({
      tenantId,
      studentId,
      embedding,
    }).returning()

    logger.info(`[Face] Enrolled student ${student.name} (${studentId}) for tenant ${tenantId}`)
    return c.json({ success: true, enrollmentId: enrollment.id, studentName: student.name })
  } catch (err) {
    logger.error({ err }, '[Face] Enroll error')
    return c.json({ error: 'Face enrollment failed' }, 500)
  }
})

// POST /api/face/recognize
faceRouter.post('/recognize', zValidator('json', recognizeSchema), async (c) => {
  try {
    const { image, autoCheckin, classId } = c.req.valid('json')
    const tenantId = c.get('schoolId')

    const enrollments = await db.select({
      studentId: inclassFaceEnrollments.studentId,
      embedding: inclassFaceEnrollments.embedding,
    }).from(inclassFaceEnrollments).where(
      eq(inclassFaceEnrollments.tenantId, tenantId)
    )

    if (enrollments.length === 0) {
      return c.json({ matches: [], message: '尚無學生建立人臉資料，請先進行建檔' })
    }

    const faceEmbeddings = await encodeAllFaces(image)
    if (faceEmbeddings.length === 0) {
      return c.json({ matches: [], message: '圖片中未偵測到人臉，請重新拍攝' })
    }

    const students = await db.select({ id: manageStudents.id, name: manageStudents.name })
      .from(manageStudents)
      .where(eq(manageStudents.tenantId, tenantId))

    const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]))

    const candidates = enrollments.map(e => ({
      studentId: e.studentId,
      embedding: e.embedding as number[],
    }))

    const matched: { studentId: string; studentName: string; confidence: number; distance: number }[] = []
    const matchedStudentIds = new Set<string>()

    for (const faceEmb of faceEmbeddings) {
      const remaining = candidates.filter(cand => !matchedStudentIds.has(cand.studentId))
      const match = findBestMatch(faceEmb, remaining)
      if (match && !matchedStudentIds.has(match.studentId)) {
        matchedStudentIds.add(match.studentId)
        matched.push({
          studentId: match.studentId,
          studentName: studentMap[match.studentId] ?? 'Unknown',
          confidence: match.confidence,
          distance: match.distance,
        })
      }
    }

    const checkedIn: string[] = []
    if (autoCheckin && matched.length > 0) {
      const now = new Date()
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end = new Date(start); end.setDate(end.getDate() + 1)

      for (const m of matched) {
        let resolvedCourseId = classId
        if (!resolvedCourseId) {
          const [enrollment] = await db.select().from(manageEnrollments).where(
            and(
              eq(manageEnrollments.tenantId, tenantId),
              eq(manageEnrollments.studentId, m.studentId),
              eq(manageEnrollments.status, 'active')
            )
          )
          resolvedCourseId = enrollment?.courseId ?? undefined
        }
        if (!resolvedCourseId) continue

        const [existing] = await db.select().from(inclassAttendances).where(
          and(
            eq(inclassAttendances.tenantId, tenantId),
            eq(inclassAttendances.studentId, m.studentId),
            gte(inclassAttendances.date, start),
            lt(inclassAttendances.date, end)
          )
        )
        if (existing) continue

        await db.insert(inclassAttendances).values({
          tenantId,
          studentId: m.studentId,
          courseId: resolvedCourseId,
          date: now,
          status: 'present',
          checkInTime: now,
          checkInMethod: 'face',
        })
        checkedIn.push(m.studentId)
      }
    }

    return c.json({
      matches: matched,
      facesDetected: faceEmbeddings.length,
      checkedIn,
      message: `偵測到 ${faceEmbeddings.length} 張人臉，辨識出 ${matched.length} 位學生`,
    })
  } catch (err) {
    logger.error({ err }, '[Face] Recognize error')
    return c.json({ error: 'Face recognition failed' }, 500)
  }
})

// GET /api/face/enrolled-students
faceRouter.get('/enrolled-students', async (c) => {
  try {
    const tenantId = c.get('schoolId')
    const enrollments = await db.select({
      studentId: inclassFaceEnrollments.studentId,
      enrolledAt: inclassFaceEnrollments.enrolledAt,
    }).from(inclassFaceEnrollments).where(
      eq(inclassFaceEnrollments.tenantId, tenantId)
    )
    return c.json({ enrolledStudentIds: enrollments.map(e => e.studentId) })
  } catch (err) {
    logger.error({ err }, '[Face] enrolled-students error')
    return c.json({ error: 'Failed to fetch enrolled students' }, 500)
  }
})

export default faceRouter

import { getUser } from './auth-context'

export interface CurrentTeacher {
  id: string
  name: string
  title?: string
  email?: string
}

interface TeacherApiRecord {
  id?: string
  user_id?: string | null
  name?: string | null
  full_name?: string | null
  title?: string | null
  email?: string | null
  username?: string | null
}

interface AuthUserLike {
  id: string
  name: string
  email?: string
  username?: string
  teacher_id?: string
  teacherId?: string
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let cache: { teacher: CurrentTeacher | null; expiry: number } | null = null

function normalizeTeacherRecord(record: TeacherApiRecord): CurrentTeacher | null {
  const id = String(record.id ?? '')
  if (!id) return null

  return {
    id,
    name: String(record.full_name ?? record.name ?? '').trim(),
    title: typeof record.title === 'string' ? record.title : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
  }
}

export async function resolveCurrentTeacher(): Promise<CurrentTeacher | null> {
  if (cache && Date.now() < cache.expiry) return cache.teacher

  const user = getUser()
  if (!user) return null
  const authUser = user as unknown as AuthUserLike

  const teacherId = authUser.teacher_id ?? authUser.teacherId
  if (typeof teacherId === 'string' && teacherId.trim() !== '') {
    const teacher: CurrentTeacher = {
      id: teacherId,
      name: user.name,
      email: authUser.email,
    }
    cache = { teacher, expiry: Date.now() + CACHE_TTL }
    return teacher
  }

  const res = await fetch('/api/w8/teachers', { credentials: 'include' })
  if (!res.ok) return null

  const json = await res.json()
  const payload = json.data ?? json
  const rawTeachers = Array.isArray(payload.teachers) ? payload.teachers : Array.isArray(payload) ? payload : []

  // Match by user_id, email, or username only — name matching is unreliable
  const matched = rawTeachers.find((teacher: TeacherApiRecord) => {
    const record = teacher as TeacherApiRecord
    return record.user_id === user.id
      || (authUser.email && record.email === authUser.email)
      || (authUser.username && record.username === authUser.username)
  }) as TeacherApiRecord | undefined

  const result = matched ? normalizeTeacherRecord(matched) : null
  cache = { teacher: result, expiry: Date.now() + CACHE_TTL }
  return result
}

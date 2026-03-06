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

const API_BASE = ''

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
  const user = getUser()
  if (!user) return null
  const authUser = user as unknown as AuthUserLike

  const teacherId = authUser.teacher_id ?? authUser.teacherId
  if (typeof teacherId === 'string' && teacherId.trim() !== '') {
    return {
      id: teacherId,
      name: user.name,
      email: authUser.email,
    }
  }

  const res = await fetch(`${API_BASE}/api/w8/teachers`, { credentials: 'include' })
  if (!res.ok) return null

  const json = await res.json()
  const payload = json.data ?? json
  const rawTeachers = Array.isArray(payload.teachers) ? payload.teachers : Array.isArray(payload) ? payload : []

  const matched = rawTeachers.find((teacher: TeacherApiRecord) => {
    const record = teacher as TeacherApiRecord
    return record.user_id === user.id
      || record.email === authUser.email
      || record.username === authUser.username
      || record.name === user.name
      || record.full_name === user.name
  }) as TeacherApiRecord | undefined

  return matched ? normalizeTeacherRecord(matched) : null
}
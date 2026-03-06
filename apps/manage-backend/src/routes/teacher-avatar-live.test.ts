import { describe, expect, it } from 'vitest'

const runLiveSmoke = process.env.ENABLE_LIVE_AVATAR_SMOKE === '1'

function applyLiveEnv() {
  process.env.NODE_ENV = 'development'

  if (process.env.LIVE_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.LIVE_DATABASE_URL
  }
  if (process.env.LIVE_JWT_SECRET) {
    process.env.JWT_SECRET = process.env.LIVE_JWT_SECRET
  }
  if (process.env.LIVE_INTERNAL_API_KEY) {
    process.env.INTERNAL_API_KEY = process.env.LIVE_INTERNAL_API_KEY
  }
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

describe.skipIf(!runLiveSmoke)('teacher avatar live smoke', () => {
  async function createAdminToken(tenantId: string) {
    const { SignJWT } = await import('jose')
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

    return new SignJWT({
      sub: 'smoke-test-user',
      userId: 'smoke-test-user',
      role: 'admin',
      tenantId,
      tenant_id: tenantId,
      branchId: tenantId,
      name: 'Smoke Test',
      email: 'smoke@test.local',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)
  }

  async function getLiveContext() {
    applyLiveEnv()

    const tenantId = process.env.LIVE_TENANT_ID
    expect(tenantId).toBeTruthy()

    const { app } = await import('../app')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return {
      app,
      tenantId: tenantId as string,
      token: await createAdminToken(tenantId as string),
    }
  }

  function buildCreatePayload(tenantId: string, marker: string) {
    return {
      tenantId,
      branchId: '11111111-1111-1111-1111-111111111111',
      name: `頭像測試講師-${marker}`,
      phone: '0912345678',
      email: `avatar-smoke-${marker}@94cram.app`,
      hourlyRate: 950,
      subjects: ['英文', '數學'],
    }
  }

  async function createTeacherRecord(app: Awaited<ReturnType<typeof getLiveContext>>['app'], token: string, tenantId: string, marker: string) {
    const createRes = await app.request('/api/w8/teachers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify(buildCreatePayload(tenantId, marker)),
    })

    const createJson = await createRes.json() as { data?: { teacher?: { id?: string; name?: string } } }
    expect(createRes.status).toBe(201)
    expect(createJson.data?.teacher?.id).toBeTruthy()

    return createJson.data?.teacher?.id as string
  }

  async function deleteTeacherRecord(app: Awaited<ReturnType<typeof getLiveContext>>['app'], token: string, tenantId: string, teacherId: string) {
    await app.request(`/api/w8/teachers/${teacherId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    })
  }

  it('uploads an avatar to GCS and persists it for a real teacher', async () => {
    const teacherId = process.env.LIVE_TEACHER_ID
    expect(teacherId).toBeTruthy()
    const { app, tenantId, token } = await getLiveContext()

    const uploadBody = new FormData()
    uploadBody.append('tenantId', tenantId)
    uploadBody.append('file', new File([
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], 'smoke-avatar.png', { type: 'image/png' }))

    const uploadRes = await app.request('/api/w8/teachers/upload-avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
      body: uploadBody,
    })

    const uploadText = await uploadRes.text()
    const uploadJson = JSON.parse(uploadText) as { data?: { url?: string } }
    expect(uploadRes.status).toBe(201)
    expect(uploadJson.data?.url).toContain('teacher-avatars/')

    const patchRes = await app.request(`/api/w8/teachers/${teacherId}/avatar`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({ avatarUrl: uploadJson.data?.url }),
    })

    const patchText = await patchRes.text()
    const patchJson = JSON.parse(patchText) as { data?: { teacher?: { avatar_url?: string } } }
    expect(patchRes.status).toBe(200)
    expect(patchJson.data?.teacher?.avatar_url).toBe(uploadJson.data?.url)
  }, 120_000)

  it('creates and reads a teacher record against manage_teachers', async () => {
    const { app, tenantId, token } = await getLiveContext()
    const marker = `${Date.now()}-create`
    const createPayload = buildCreatePayload(tenantId, marker)
    const teacherId = await createTeacherRecord(app, token, tenantId, marker)

    try {
      const getRes = await app.request(`/api/w8/teachers/${teacherId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
        },
      })
      const getJson = await getRes.json() as { data?: { teacher?: { id?: string; name?: string; email?: string; subjects?: string[] } } }
      expect(getRes.status).toBe(200)
      expect(getJson.data?.teacher?.name).toBe(createPayload.name)
      expect(getJson.data?.teacher?.email).toBe(createPayload.email)
      expect(getJson.data?.teacher?.subjects).toEqual(createPayload.subjects)
    } finally {
      await deleteTeacherRecord(app, token, tenantId, teacherId)
    }
  }, 120_000)

  it('updates a teacher record against manage_teachers', async () => {
    const { app, tenantId, token } = await getLiveContext()
    const teacherId = await createTeacherRecord(app, token, tenantId, `${Date.now()}-update`)

    try {
      const updateRes = await app.request(`/api/w8/teachers/${teacherId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          phone: '0987654321',
          hourlyRate: 980,
          subjects: ['英文'],
        }),
      })
      const updateJson = await updateRes.json() as { data?: { teacher?: { phone?: string; hourly_rate?: string; subjects?: string[] } } }
      expect(updateRes.status).toBe(200)
      expect(updateJson.data?.teacher?.phone).toBe('0987654321')
      expect(Number(updateJson.data?.teacher?.hourly_rate)).toBe(980)
      expect(updateJson.data?.teacher?.subjects).toEqual(['英文'])
    } finally {
      await deleteTeacherRecord(app, token, tenantId, teacherId)
    }
  }, 120_000)

  it('deletes a teacher record against manage_teachers', async () => {
    const { app, tenantId, token } = await getLiveContext()
    const teacherId = await createTeacherRecord(app, token, tenantId, `${Date.now()}-delete`)

    const deleteRes = await app.request(`/api/w8/teachers/${teacherId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    })
    expect(deleteRes.status).toBe(200)

    const getRes = await app.request(`/api/w8/teachers/${teacherId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    })
    expect(getRes.status).toBe(404)
  }, 120_000)
})
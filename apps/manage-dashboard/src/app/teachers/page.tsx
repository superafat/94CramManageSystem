'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { Avatar } from '@/components/ui/Avatar'

interface Teacher {
  id: string
  name: string
  avatar_url?: string
  phone: string
  email: string
  hourly_rate?: string
  subjects?: string[]
}

const SUBJECT_OPTIONS = [
  '國文', '英文', '數學', '理化', '物理', '化學',
  '生物', '地科', '歷史', '地理', '公民', '自然',
  '社會', '作文', '閱讀', '程式設計',
]

const AVATAR_PREVIEW_SIZE = 220
const AVATAR_OUTPUT_SIZE = 512
const PRODUCTION_PERSISTED_FIELDS = ['頭像', '姓名', '電話', 'Email', '時薪', '授課科目']
const PLANNED_FIELDS = ['勞健保設定', '個人身分資料', '匯款資訊', '授課年級', '教師身分/職務']

interface ImageDimensions {
  width: number
  height: number
}

const createEmptyForm = () => ({
  name: '', phone: '', email: '', hourly_rate: '',
  avatar_url: '',
  subjects: [] as string[],
})

const API_BASE = ''

function getTenantId() {
  return typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''
}

function getBranchId() {
  return typeof window !== 'undefined' ? localStorage.getItem('branchId') || '' : ''
}

function getAvatarBaseSize(dimensions: ImageDimensions | null) {
  if (!dimensions) return { width: AVATAR_PREVIEW_SIZE, height: AVATAR_PREVIEW_SIZE }

  const scale = Math.max(
    AVATAR_PREVIEW_SIZE / dimensions.width,
    AVATAR_PREVIEW_SIZE / dimensions.height,
  )

  return {
    width: dimensions.width * scale,
    height: dimensions.height * scale,
  }
}

function clampAvatarOffset(offsetX: number, offsetY: number, zoom: number, dimensions: ImageDimensions | null) {
  const base = getAvatarBaseSize(dimensions)
  const scaledWidth = base.width * zoom
  const scaledHeight = base.height * zoom
  const maxX = Math.max(0, (scaledWidth - AVATAR_PREVIEW_SIZE) / 2)
  const maxY = Math.max(0, (scaledHeight - AVATAR_PREVIEW_SIZE) / 2)

  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(-maxY, offsetY)),
  }
}

async function loadImageDimensions(file: File): Promise<ImageDimensions> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const dimensions = await new Promise<ImageDimensions>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('無法讀取圖片尺寸'))
      image.src = objectUrl
    })
    return dimensions
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function cropAvatarFile(
  file: File,
  dimensions: ImageDimensions,
  zoom: number,
  offset: { x: number; y: number }
): Promise<File> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('無法載入圖片進行裁切'))
      element.src = objectUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_OUTPUT_SIZE
    canvas.height = AVATAR_OUTPUT_SIZE

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法建立裁切畫布')

    const base = getAvatarBaseSize(dimensions)
    const ratio = AVATAR_OUTPUT_SIZE / AVATAR_PREVIEW_SIZE
    ctx.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE)
    ctx.translate(AVATAR_OUTPUT_SIZE / 2 + offset.x * ratio, AVATAR_OUTPUT_SIZE / 2 + offset.y * ratio)
    ctx.scale(zoom * ratio, zoom * ratio)
    ctx.drawImage(image, -base.width / 2, -base.height / 2, base.width, base.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value)
        else reject(new Error('裁切輸出失敗'))
      }, 'image/jpeg', 0.92)
    })

    const croppedName = file.name.replace(/\.[^.]+$/, '') || 'avatar'
    return new File([blob], `${croppedName}-cropped.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState(createEmptyForm())
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [localAvatarFile, setLocalAvatarFile] = useState<File | null>(null)
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null)
  const [localAvatarMeta, setLocalAvatarMeta] = useState<{ name: string; sizeLabel: string } | null>(null)
  const [localAvatarDimensions, setLocalAvatarDimensions] = useState<ImageDimensions | null>(null)
  const [avatarZoom, setAvatarZoom] = useState(1)
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 })
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const avatarPreviewImageRef = useRef<HTMLImageElement | null>(null)
  const avatarPreviewSrc = useMemo(() => localAvatarPreview || form.avatar_url || undefined, [localAvatarPreview, form.avatar_url])
  const avatarBaseSize = useMemo(() => getAvatarBaseSize(localAvatarDimensions), [localAvatarDimensions])

  const updateAvatarZoom = (nextZoom: number) => {
    const clampedZoom = Math.min(2.5, Math.max(1, nextZoom))
    setAvatarZoom(clampedZoom)
    setAvatarOffset((current) => clampAvatarOffset(current.x, current.y, clampedZoom, localAvatarDimensions))
  }

  useEffect(() => {
    return () => {
      if (localAvatarPreview) {
        URL.revokeObjectURL(localAvatarPreview)
      }
    }
  }, [localAvatarPreview])

  useEffect(() => {
    if (!avatarPreviewImageRef.current) return

    avatarPreviewImageRef.current.style.width = `${avatarBaseSize.width}px`
    avatarPreviewImageRef.current.style.height = `${avatarBaseSize.height}px`
    avatarPreviewImageRef.current.style.transform = `translate(calc(-50% + ${avatarOffset.x}px), calc(-50% + ${avatarOffset.y}px)) scale(${avatarZoom})`
  }, [avatarBaseSize.height, avatarBaseSize.width, avatarOffset.x, avatarOffset.y, avatarZoom, avatarPreviewSrc])

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Tenant-Id': getTenantId(),
  })

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, { headers: getHeaders(), credentials: 'include' })
      const json = await res.json()
      const payload = json.data ?? json
      setTeachers(payload.teachers || [])
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetLocalAvatarDraft = () => {
    if (localAvatarPreview) {
      URL.revokeObjectURL(localAvatarPreview)
    }

    setLocalAvatarFile(null)
    setLocalAvatarPreview(null)
    setLocalAvatarMeta(null)
    setLocalAvatarDimensions(null)
    setAvatarZoom(1)
    setAvatarOffset({ x: 0, y: 0 })
  }

  const handleAvatarSelect = async (file: File) => {
    resetLocalAvatarDraft()

    const previewUrl = URL.createObjectURL(file)
    try {
      const dimensions = await loadImageDimensions(file)
      setLocalAvatarFile(file)
      setLocalAvatarPreview(previewUrl)
      setLocalAvatarDimensions(dimensions)
      setLocalAvatarMeta({
        name: file.name,
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      })
      setAvatarZoom(1)
      setAvatarOffset({ x: 0, y: 0 })
    } catch (err) {
      URL.revokeObjectURL(previewUrl)
      window.alert(err instanceof Error ? err.message : '無法讀取圖片')
    }
  }

  const handleAvatarUpload = async () => {
    if (!localAvatarFile || !localAvatarDimensions) {
      window.alert('請先選擇要上傳的照片')
      return
    }

    const croppedFile = await cropAvatarFile(localAvatarFile, localAvatarDimensions, avatarZoom, avatarOffset)

    const formData = new FormData()
    formData.append('file', croppedFile)
    formData.append('tenantId', getTenantId())

    setUploadingAvatar(true)
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Tenant-Id': getTenantId(),
        },
        body: formData,
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || '上傳頭像失敗')
      }

      const payload = json.data ?? json
      const nextAvatarUrl = payload.url || ''

      if (editingTeacher && nextAvatarUrl) {
        const persistRes = await fetch(`${API_BASE}/api/w8/teachers/${editingTeacher.id}/avatar`, {
          method: 'PATCH',
          headers: getHeaders(),
          credentials: 'include',
          body: JSON.stringify({ avatarUrl: nextAvatarUrl }),
        })

        const persistJson = await persistRes.json().catch(() => ({}))
        if (!persistRes.ok) {
          throw new Error(persistJson.error?.message || persistJson.error || '儲存教師頭像失敗')
        }

        const teacherPayload = persistJson.data?.teacher
        setEditingTeacher((prev) => prev ? { ...prev, avatar_url: teacherPayload?.avatar_url || nextAvatarUrl } : prev)
        setTeachers((prev) => prev.map((teacher) => (
          teacher.id === editingTeacher.id
            ? { ...teacher, avatar_url: teacherPayload?.avatar_url || nextAvatarUrl }
            : teacher
        )))
      }

      setForm((prev) => ({ ...prev, avatar_url: nextAvatarUrl }))
      resetLocalAvatarDraft()
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      window.alert(err instanceof Error ? err.message : '上傳頭像失敗')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingTeacher
        ? `${API_BASE}/api/w8/teachers/${editingTeacher.id}`
        : `${API_BASE}/api/w8/teachers`

      const res = await fetch(url, {
        method: editingTeacher ? 'PUT' : 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          avatarUrl: form.avatar_url || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          hourlyRate: form.hourly_rate || undefined,
          subjects: form.subjects.length > 0 ? form.subjects : undefined,
          tenantId: getTenantId(),
          branchId: getBranchId(),
        }),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingTeacher(null)
        setForm(createEmptyForm())
        fetchTeachers()
      }
    } catch (err) {
      console.error('Failed to save teacher:', err)
    }
  }

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    resetLocalAvatarDraft()
    setForm({
      name: teacher.name,
      avatar_url: teacher.avatar_url || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      hourly_rate: teacher.hourly_rate || '',
      subjects: teacher.subjects || [],
    })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditingTeacher(null)
    resetLocalAvatarDraft()
    setForm(createEmptyForm())
    setShowModal(true)
  }

  const toggleSubject = (subject: string) => {
    setForm({
      ...form,
      subjects: form.subjects.includes(subject)
        ? form.subjects.filter((item) => item !== subject)
        : [...form.subjects, subject],
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/dashboard" />
          <h1 className="text-lg font-semibold text-text">講師管理</h1>
        </div>
        <button
          onClick={openAdd}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
        >
          + 新增
        </button>
      </div>

      <div className="lg:hidden p-4 space-y-3">
        {teachers.length === 0 ? (
          <div className="text-center py-12 text-text-muted">尚無講師資料</div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => openEdit(teacher)}
              className="bg-surface rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors active:bg-surface-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar src={teacher.avatar_url} fallback={teacher.name} size="lg" />
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-text">{teacher.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    {teacher.phone && <span>📱 {teacher.phone}</span>}
                    {teacher.email && <span className="truncate">✉️ {teacher.email}</span>}
                  </div>
                  {teacher.subjects?.length ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {teacher.subjects?.map((subject) => (
                        <span key={subject} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          {subject}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-base font-semibold text-primary">
                    ${Number(teacher.hourly_rate || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">
                    時薪
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden lg:block overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">姓名</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">Email</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">電話</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">科目</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">薪資</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-text">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-muted">尚無講師資料</td>
              </tr>
            ) : (
              teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-text">
                    <div className="flex items-center gap-3">
                      <Avatar src={teacher.avatar_url} fallback={teacher.name} size="md" />
                      <span>{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {teacher.email || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{teacher.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {teacher.subjects?.join('、') || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    ${Number(teacher.hourly_rate || 0).toLocaleString()}
                    <span className="text-xs text-text-muted ml-1">
                      /時
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEdit(teacher)}
                      className="text-sm text-primary hover:underline"
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text mb-4">
              {editingTeacher ? '編輯講師' : '新增講師'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">目前 production 只會儲存以下欄位</p>
                <p className="mt-1 leading-6">{PRODUCTION_PERSISTED_FIELDS.join('、')}</p>
                <p className="mt-2 text-xs leading-5 text-amber-800">勞健保設定、個資、匯款、授課年級與教師職務仍在資料表補齊階段，先不在這個表單中假裝可存，避免管理端編輯後實際沒有落庫。</p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">基本資料</legend>
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4">
                  <div className="grid gap-5 md:grid-cols-[minmax(0,220px),1fr] md:items-center">
                    <div className="space-y-3">
                      <div
                        className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[28px] border border-border bg-white shadow-sm"
                        onWheel={(event) => {
                          if (!localAvatarFile) return
                          event.preventDefault()
                          const direction = event.deltaY > 0 ? -0.08 : 0.08
                          updateAvatarZoom(avatarZoom + direction)
                        }}
                      >
                        {avatarPreviewSrc ? (
                          <img
                            ref={avatarPreviewImageRef}
                            src={avatarPreviewSrc}
                            alt="頭像裁切預覽"
                            className={`absolute left-1/2 top-1/2 max-w-none select-none ${localAvatarFile ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            draggable={false}
                            onPointerDown={(event) => {
                              if (!localAvatarFile) return
                              dragStateRef.current = {
                                startX: event.clientX,
                                startY: event.clientY,
                                originX: avatarOffset.x,
                                originY: avatarOffset.y,
                              }
                              event.currentTarget.setPointerCapture(event.pointerId)
                            }}
                            onPointerMove={(event) => {
                              if (!dragStateRef.current || !localAvatarFile) return
                              const deltaX = event.clientX - dragStateRef.current.startX
                              const deltaY = event.clientY - dragStateRef.current.startY
                              setAvatarOffset(clampAvatarOffset(
                                dragStateRef.current.originX + deltaX,
                                dragStateRef.current.originY + deltaY,
                                avatarZoom,
                                localAvatarDimensions,
                              ))
                            }}
                            onPointerUp={() => {
                              dragStateRef.current = null
                            }}
                            onPointerCancel={() => {
                              dragStateRef.current = null
                            }}
                            onPointerLeave={() => {
                              dragStateRef.current = null
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(232,223,213,0.65),rgba(216,232,240,0.45))] px-6 text-center">
                            <div className="text-4xl">👤</div>
                            <p className="mt-3 text-sm font-medium text-text">將大頭貼放進虛線輪廓</p>
                            <p className="mt-1 text-xs text-text-muted">系統會以置中圓形方式顯示頭像</p>
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0">
                          <div className="absolute inset-3 rounded-[24px] border border-white/60" />
                          <div className="absolute inset-5 rounded-full border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.18)]" />
                          <div className="absolute inset-x-0 bottom-4 flex justify-center">
                            <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium tracking-wide text-white">請讓臉部落在虛線圈內</span>
                          </div>
                        </div>

                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <div className="space-y-2 text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white shadow-sm">
                            <Avatar src={avatarPreviewSrc} fallback={form.name || '教師'} size="lg" className="h-14 w-14 bg-white text-base" />
                          </div>
                          <p className="text-[11px] text-text-muted">最終頭像</p>
                        </div>
                        <div className="space-y-2 text-center">
                          <div className="mx-auto h-16 w-16 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                            {avatarPreviewSrc ? (
                              <img src={avatarPreviewSrc} alt="原始預覽" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-text-muted">原圖</div>
                            )}
                          </div>
                          <p className="text-[11px] text-text-muted">原圖</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">大頭貼</p>
                      <p className="mt-1 text-xs text-text-muted">支援 JPG、PNG、WebP，大小上限 3MB。先選擇照片，再拖曳與縮放，讓臉部與肩線落在虛線圈附近，最後才會上傳裁切後結果。</p>
                      {localAvatarMeta && (
                        <p className="mt-2 text-xs text-text-muted">暫存檔案：{localAvatarMeta.name} · {localAvatarMeta.sizeLabel}</p>
                      )}
                      {localAvatarFile && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                            <span>縮放調整</span>
                            <span>{avatarZoom.toFixed(2)}x</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateAvatarZoom(avatarZoom - 0.1)}
                              className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted hover:bg-surface"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              title="頭像縮放調整"
                              aria-label="頭像縮放調整"
                              min="1"
                              max="2.5"
                              step="0.01"
                              value={avatarZoom}
                              onChange={(event) => updateAvatarZoom(Number(event.target.value))}
                              className="w-full accent-primary"
                            />
                            <button
                              type="button"
                              onClick={() => updateAvatarZoom(avatarZoom + 0.1)}
                              className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted hover:bg-surface"
                            >
                              +
                            </button>
                          </div>
                          <div className="rounded-xl bg-surface px-3 py-2 text-xs text-text-muted">
                            可直接拖曳照片微調位置，也可用滑鼠滾輪、觸控板或 +/- 按鈕縮放。上傳時會以左側虛線圈的範圍裁切成正方形頭像。
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-white px-3 py-2 text-sm text-text hover:bg-surface">
                          {localAvatarFile ? '重新選擇照片' : '選擇照片'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingAvatar}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) {
                                void handleAvatarSelect(file)
                              }
                              event.currentTarget.value = ''
                            }}
                          />
                        </label>
                        {localAvatarFile && (
                          <button
                            type="button"
                            onClick={() => void handleAvatarUpload()}
                            disabled={uploadingAvatar}
                            className="rounded-lg bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-60"
                          >
                            {uploadingAvatar ? '上傳中...' : '套用裁切並上傳'}
                          </button>
                        )}
                        {(form.avatar_url || localAvatarFile) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (localAvatarFile) {
                                resetLocalAvatarDraft()
                              } else {
                                setForm({ ...form, avatar_url: '' })
                              }
                            }}
                            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface"
                          >
                            {localAvatarFile ? '取消新照片' : '移除照片'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">姓名 *</label>
                  <input
                    title="講師姓名"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">電話</label>
                    <input
                      title="講師電話"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Email</label>
                    <input
                      title="講師 Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">授課與薪資</legend>
                <div>
                  <label className="block text-sm text-text-muted mb-1">時薪</label>
                  <input
                    title="時薪金額"
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    placeholder="每小時金額"
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-primary mb-2">教授科目</legend>
                <div className="grid grid-cols-4 gap-2">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <label key={subject} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                      <input
                        title={`教授科目 ${subject}`}
                        type="checkbox"
                        checked={form.subjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                        className="rounded border-border text-primary"
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-3 text-sm text-text-muted">
                <p className="font-medium text-text">已先下線的欄位</p>
                <p className="mt-1 leading-6">{PLANNED_FIELDS.join('、')}</p>
                <p className="mt-2 text-xs leading-5">等 manage_teachers schema 補齊後再重新開放，避免使用者輸入後誤以為已經成功保存。</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-text"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-medium"
                >
                  {editingTeacher ? '儲存' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

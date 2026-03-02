# Face Recognition Attendance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 老師對班上拍一張照，後端辨識每位學生臉孔，自動完成點名。

**Architecture:** 使用 `@vladmandic/face-api`（face-api.js 的 ESM fork）+ `@tensorflow/tfjs-node` 在 inclass-backend 上執行人臉偵測與 128 維嵌入向量提取。嵌入向量以 `jsonb` 存入 PostgreSQL 的新表 `inclass_face_enrollments`，相似度比對在 Node.js 內以 Euclidean distance 完成（補習班學生數有限，效能充足）。

**Tech Stack:**
- Backend: `@vladmandic/face-api`, `@tensorflow/tfjs-node`, `canvas` (image loading)
- DB: PostgreSQL jsonb column for float32 arrays
- Frontend: WebRTC camera (已有 CheckInModal), base64 image upload

---

## 流程說明

```
建檔流程：
  學生第一次刷臉 → 相機引導拍照 → POST /api/face/enroll → 存 embedding

點名流程：
  老師按「刷臉點名」→ 相機開啟 → 拍照 → POST /api/face/recognize
  → 後端偵測人臉 → 每張臉比對 DB embeddings → 回傳 matches
  → 前端顯示「王小明 ✅ 符合度 96%」→ 老師確認 → 自動打卡
```

---

## Task 1: DB Schema — 新增 `inclass_face_enrollments` 表

**Files:**
- Modify: `packages/shared/src/db/schema/inclass.ts`

**Step 1: 在 inclass.ts 末尾加入新表定義**

```typescript
// 人臉建檔（刷臉點名用）
export const inclassFaceEnrollments = pgTable('inclass_face_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  embedding: jsonb('embedding').notNull(), // number[] - 128 維向量
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_face_enrollments_tenant_id_idx').on(table.tenantId),
  studentIdx: index('inclass_face_enrollments_student_id_idx').on(table.studentId),
  tenantStudentIdx: index('inclass_face_enrollments_tenant_student_idx').on(table.tenantId, table.studentId),
}));
```

**Step 2: 同步 DB schema**

```bash
pnpm --filter @94cram/shared drizzle-kit push
```

Expected: `inclass_face_enrollments` 表建立成功

**Step 3: Commit**

```bash
git add packages/shared/src/db/schema/inclass.ts
git commit -m "feat(inclass): add inclass_face_enrollments table for face recognition"
```

---

## Task 2: 安裝套件 + 下載 face-api 模型

**Files:**
- Modify: `apps/inclass-backend/package.json` (pnpm 自動更新)
- Create: `apps/inclass-backend/models/` (模型檔案)
- Create: `apps/inclass-backend/scripts/download-models.sh`

**Step 1: 安裝套件**

```bash
pnpm --filter @94cram/inclass-backend add @vladmandic/face-api @tensorflow/tfjs-node canvas
```

> `@tensorflow/tfjs-node` 提供預編譯 linux-x64 二進制，`--platform linux/amd64` 下可直接使用。

**Step 2: 建立模型下載腳本**

建立 `apps/inclass-backend/scripts/download-models.sh`:

```bash
#!/bin/bash
# Download face-api.js model files
set -e
MODELS_DIR="$(dirname "$0")/../models"
mkdir -p "$MODELS_DIR"
BASE="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

for f in \
  "ssd_mobilenetv1_model-weights_manifest.json" \
  "ssd_mobilenetv1_model-shard1" \
  "ssd_mobilenetv1_model-shard2" \
  "face_landmark_68_model-weights_manifest.json" \
  "face_landmark_68_model-shard1" \
  "face_recognition_model-weights_manifest.json" \
  "face_recognition_model-shard1" \
  "face_recognition_model-shard2"
do
  echo "Downloading $f..."
  curl -fsSL "$BASE/$f" -o "$MODELS_DIR/$f"
done
echo "✅ Models downloaded to $MODELS_DIR"
```

**Step 3: 執行下載**

```bash
chmod +x apps/inclass-backend/scripts/download-models.sh
bash apps/inclass-backend/scripts/download-models.sh
```

Expected: `apps/inclass-backend/models/` 內有 8 個檔案，總計約 12MB

**Step 4: 加到 .gitignore 或 commit 模型**

模型檔案較大，加入 `.gitignore`，改由 Dockerfile 在 build 時下載：

在根目錄 `.gitignore` 加入：
```
apps/inclass-backend/models/
```

**Step 5: Commit**

```bash
git add apps/inclass-backend/package.json pnpm-lock.yaml apps/inclass-backend/scripts/
git commit -m "feat(inclass): add face-api.js and tensorflow deps with model download script"
```

---

## Task 3: 建立 Face Recognition Service

**Files:**
- Create: `apps/inclass-backend/src/services/faceRecognition.ts`

```typescript
/**
 * Face Recognition Service
 * Uses @vladmandic/face-api with @tensorflow/tfjs-node backend
 * for 128-dim face embedding extraction and matching.
 */
import * as tf from '@tensorflow/tfjs-node'
import * as faceapi from '@vladmandic/face-api'
import { createCanvas, loadImage } from 'canvas'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODELS_PATH = path.join(__dirname, '../../models')
const MATCH_THRESHOLD = 0.55 // 小於此距離視為匹配（0.6 = 業界常用值，0.55 更嚴格）

let modelsLoaded = false

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  logger.info('[FaceRecognition] Loading face-api models...')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH)
  modelsLoaded = true
  logger.info('[FaceRecognition] Models loaded ✅')
}

/**
 * Extract 128-dim face embedding from a single-face base64 image.
 * Returns null if no face detected.
 */
export async function encodeSingleFace(base64Image: string): Promise<number[] | null> {
  await loadModels()
  try {
    const buffer = Buffer.from(
      base64Image.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )
    const img = await loadImage(buffer)
    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img as any, 0, 0)

    const detection = await faceapi
      .detectSingleFace(canvas as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) return null
    return Array.from(detection.descriptor)
  } catch (err) {
    logger.error({ err }, '[FaceRecognition] encodeSingleFace error')
    return null
  }
}

/**
 * Detect ALL faces in an image (for teacher group scan).
 * Returns array of embeddings, one per detected face.
 */
export async function encodeAllFaces(base64Image: string): Promise<number[][]> {
  await loadModels()
  try {
    const buffer = Buffer.from(
      base64Image.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )
    const img = await loadImage(buffer)
    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img as any, 0, 0)

    const detections = await faceapi
      .detectAllFaces(canvas as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptors()

    return detections.map(d => Array.from(d.descriptor))
  } catch (err) {
    logger.error({ err }, '[FaceRecognition] encodeAllFaces error')
    return []
  }
}

/**
 * Find best matching student for a given embedding.
 * Returns studentId + distance, or null if no match within threshold.
 */
export function findBestMatch(
  queryEmbedding: number[],
  candidates: { studentId: string; embedding: number[] }[]
): { studentId: string; distance: number; confidence: number } | null {
  if (candidates.length === 0) return null

  const queryArr = new Float32Array(queryEmbedding)
  let best: { studentId: string; distance: number } | null = null

  for (const c of candidates) {
    const d = faceapi.euclideanDistance(queryArr, new Float32Array(c.embedding))
    if (!best || d < best.distance) {
      best = { studentId: c.studentId, distance: d }
    }
  }

  if (!best || best.distance > MATCH_THRESHOLD) return null

  // Convert distance to confidence percentage (0.0 distance = 100%, 0.55 = 0%)
  const confidence = Math.round(Math.max(0, (1 - best.distance / MATCH_THRESHOLD)) * 100)
  return { ...best, confidence }
}
```

**Step 2: Commit**

```bash
git add apps/inclass-backend/src/services/faceRecognition.ts
git commit -m "feat(inclass): add face recognition service with vladmandic/face-api"
```

---

## Task 4: 建立 Face API Routes

**Files:**
- Create: `apps/inclass-backend/src/routes/face.ts`

```typescript
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
  autoCheckin: z.boolean().default(false), // 自動打卡
  classId: z.string().uuid().optional(),
})

// POST /api/face/enroll
// 學生建檔：儲存人臉 embedding
faceRouter.post('/enroll', zValidator('json', enrollSchema), async (c) => {
  try {
    const { studentId, image } = c.req.valid('json')
    const tenantId = c.get('schoolId')

    // 驗證學生屬於此 tenant
    const [student] = await db.select().from(manageStudents).where(
      and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId))
    )
    if (!student) return c.json({ error: 'Student not found' }, 404)

    // 提取人臉 embedding
    const embedding = await encodeSingleFace(image)
    if (!embedding) {
      return c.json({ error: 'No face detected in image. Please retake with clear frontal face.' }, 422)
    }

    // 刪除舊的 enrollment（一個學生只保留最新一筆）
    await db.delete(inclassFaceEnrollments).where(
      and(
        eq(inclassFaceEnrollments.tenantId, tenantId),
        eq(inclassFaceEnrollments.studentId, studentId)
      )
    )

    // 儲存新 embedding
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
// 老師掃描：辨識圖片內所有人臉，回傳匹配學生
faceRouter.post('/recognize', zValidator('json', recognizeSchema), async (c) => {
  try {
    const { image, autoCheckin, classId } = c.req.valid('json')
    const tenantId = c.get('schoolId')

    // 讀取此 tenant 所有已建檔的人臉
    const enrollments = await db.select({
      studentId: inclassFaceEnrollments.studentId,
      embedding: inclassFaceEnrollments.embedding,
    }).from(inclassFaceEnrollments).where(
      eq(inclassFaceEnrollments.tenantId, tenantId)
    )

    if (enrollments.length === 0) {
      return c.json({ matches: [], message: '尚無學生建立人臉資料，請先進行建檔' })
    }

    // 偵測圖片內所有人臉
    const faceEmbeddings = await encodeAllFaces(image)
    if (faceEmbeddings.length === 0) {
      return c.json({ matches: [], message: '圖片中未偵測到人臉，請重新拍攝' })
    }

    // 讀取學生姓名
    const studentIds = [...new Set(enrollments.map(e => e.studentId))]
    const students = await db.select({ id: manageStudents.id, name: manageStudents.name })
      .from(manageStudents)
      .where(eq(manageStudents.tenantId, tenantId))

    const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]))

    // 為每張偵測到的臉找最佳匹配
    const candidates = enrollments.map(e => ({
      studentId: e.studentId,
      embedding: e.embedding as number[],
    }))

    const matched: { studentId: string; studentName: string; confidence: number; distance: number }[] = []
    const matchedStudentIds = new Set<string>()

    for (const faceEmb of faceEmbeddings) {
      const match = findBestMatch(faceEmb, candidates.filter(c => !matchedStudentIds.has(c.studentId)))
      if (match && !matchedStudentIds.has(match.studentId)) {
        matchedStudentIds.add(match.studentId)
        matched.push({
          studentId: match.studentId,
          studentName: studentMap[match.studentId] || 'Unknown',
          confidence: match.confidence,
          distance: match.distance,
        })
      }
    }

    // autoCheckin: 自動為匹配學生打卡
    const checkedIn: string[] = []
    if (autoCheckin && matched.length > 0) {
      const now = new Date()
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end = new Date(start); end.setDate(end.getDate() + 1)

      for (const m of matched) {
        // 查 classId
        let resolvedClassId = classId
        if (!resolvedClassId) {
          const [enrollment] = await db.select().from(manageEnrollments).where(
            and(
              eq(manageEnrollments.tenantId, tenantId),
              eq(manageEnrollments.studentId, m.studentId),
              eq(manageEnrollments.status, 'active')
            )
          )
          resolvedClassId = enrollment?.courseId ?? undefined
        }
        if (!resolvedClassId) continue

        // 避免重複打卡
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
          courseId: resolvedClassId,
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
// 查詢哪些學生已建檔
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
```

**Step 2: Commit**

```bash
git add apps/inclass-backend/src/routes/face.ts
git commit -m "feat(inclass): add face enrollment and recognition API routes"
```

---

## Task 5: 在 index.ts 註冊 face routes

**Files:**
- Modify: `apps/inclass-backend/src/index.ts`

在 import 區塊加入：
```typescript
import faceRoutes from './routes/face.js'
```

在 `// ===== Mount Route Modules =====` 區塊，加在 `app.route('/api/payments', paymentsRoutes)` 之後：
```typescript
app.route('/api/face', faceRoutes)
```

同時，在 body size limit 行：
```typescript
// 修改前
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }))
// 修改後（人臉圖片最大 5MB）
app.use('/api/*', bodyLimit({ maxSize: 5 * 1024 * 1024 }))
```

**Step 2: Commit**

```bash
git add apps/inclass-backend/src/index.ts
git commit -m "feat(inclass): mount face API routes and increase body limit for image upload"
```

---

## Task 6: 更新 CheckInModal.tsx — 實作真實辨識

**Files:**
- Modify: `apps/inclass-dashboard/src/app/main/components/CheckInModal.tsx`

```typescript
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface MatchResult {
  studentId: string
  studentName: string
  confidence: number
}

interface CheckInModalProps {
  onClose: () => void
  onCapture: (base64: string) => Promise<void>
  onStreamReady: (stream: MediaStream) => void
}

export default function CheckInModal({ onClose, onCapture, onStreamReady }: CheckInModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let mediaStream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        mediaStream = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        onStreamReady(stream)
      })
      .catch(() => {
        setCameraError('無法開啟相機，請確認瀏覽器相機權限')
      })

    return () => {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)

    setCapturing(true)
    try {
      await onCapture(base64)
    } finally {
      setCapturing(false)
    }
  }, [onCapture])

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74, 74, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
        >×</button>

        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>
          📸 刷臉點名
        </h3>

        {cameraError ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--error)', fontSize: '14px' }}>
            ⚠️ {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000', marginBottom: '12px' }}
          />
        )}

        {/* 隱藏的 canvas 用於擷取幀 */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <button
          onClick={handleCapture}
          disabled={capturing || !!cameraError}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: capturing || cameraError ? '#B0B8B4' : 'var(--accent)',
            color: 'white',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: capturing || cameraError ? 'not-allowed' : 'pointer',
          }}
        >
          {capturing ? '⏳ 辨識中...' : '📸 拍照辨識全班'}
        </button>

        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          對準全班同學後按下拍照，系統自動辨識並點名
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/inclass-dashboard/src/app/main/components/CheckInModal.tsx
git commit -m "feat(inclass): update CheckInModal with real camera capture functionality"
```

---

## Task 7: 更新 main/page.tsx — 辨識結果狀態與確認打卡

**Files:**
- Modify: `apps/inclass-dashboard/src/app/main/page.tsx`

**需要修改的部分：**

**7-A: 新增 state（加在現有 state 宣告區塊）：**

```typescript
const [faceMatches, setFaceMatches] = useState<{studentId: string; studentName: string; confidence: number}[]>([])
const [showFaceResults, setShowFaceResults] = useState(false)
const [faceLoading, setFaceLoading] = useState(false)
```

**7-B: 替換 `capturePhoto` 函數：**

```typescript
const capturePhoto = async (base64Image: string) => {
  setFaceLoading(true)
  try {
    const token = localStorage.getItem('token')
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch('/api/face/recognize', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ image: base64Image, autoCheckin: false }),
    })
    const data = await res.json()

    if (!res.ok) {
      showMessage(`❌ ${data.error || '辨識失敗'}`)
      return
    }

    setFaceMatches(data.matches || [])
    setShowFaceCheckin(false)
    setShowFaceResults(true)

    if (data.matches.length === 0) {
      showMessage(`⚠️ ${data.message || '未辨識到學生'}`)
    }
  } catch (e) {
    showMessage('❌ 辨識失敗，請重試')
  } finally {
    setFaceLoading(false)
  }
}
```

**7-C: 新增確認打卡函數：**

```typescript
const confirmFaceCheckin = async (studentIds: string[]) => {
  try {
    const token = localStorage.getItem('token')
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // 逐一打卡
    let successCount = 0
    for (const studentId of studentIds) {
      try {
        await api.checkin({ studentId, method: 'face', status: 'arrived' })
        successCount++
      } catch { /* skip already checked in */ }
    }
    showMessage(`✅ 成功為 ${successCount} 位學生完成點名！`)
    setShowFaceResults(false)
    setFaceMatches([])
    fetchAttendance()
  } catch (e) {
    showMessage('❌ 打卡失敗')
  }
}
```

**7-D: 在 return JSX 中加入辨識結果 Modal（放在 Face Checkin Modal 之後）：**

```tsx
{/* Face Recognition Results Modal */}
{showFaceResults && (
  <div
    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74,74,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
    onClick={() => setShowFaceResults(false)}
  >
    <div
      style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)' }}
      onClick={e => e.stopPropagation()}
    >
      <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>
        🎯 辨識結果
      </h3>

      {faceMatches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
          😕 未辨識到任何學生<br/>
          <small>請確認學生已建立人臉資料</small>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
            {faceMatches.map(m => (
              <div key={m.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{m.studentName}</span>
                <span style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                  background: m.confidence >= 80 ? 'var(--success)' : 'var(--warning)',
                  color: 'white'
                }}>
                  {m.confidence}%
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => confirmFaceCheckin(faceMatches.map(m => m.studentId))}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
          >
            ✅ 確認為 {faceMatches.length} 位學生點名
          </button>
        </>
      )}
    </div>
  </div>
)}
```

**7-E: 更新 CheckInModal props（line 449 附近）：**

```tsx
{showFaceCheckin && (
  <CheckInModal
    onClose={() => setShowFaceCheckin(false)}
    onCapture={capturePhoto}
    onStreamReady={() => {}}
  />
)}
```

**Step 2: TypeCheck**

```bash
pnpm --filter inclass-dashboard exec tsc --noEmit
```

Expected: 0 errors

**Step 3: Commit**

```bash
git add apps/inclass-dashboard/src/app/main/page.tsx
git commit -m "feat(inclass): implement face recognition checkin flow in main page"
```

---

## Task 8: 更新 Dockerfile — 加入模型下載 + canvas runtime deps

**Files:**
- Modify: `apps/inclass-backend/Dockerfile`

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# canvas 需要 build tools
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    curl \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/inclass-backend/package.json apps/inclass-backend/
RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile
COPY apps/inclass-backend/ apps/inclass-backend/
WORKDIR /app/apps/inclass-backend
# 下載 face-api 模型檔案
RUN bash scripts/download-models.sh
RUN pnpm build

FROM node:20-slim
WORKDIR /app
# canvas 與 tensorflow runtime deps
RUN apt-get update && apt-get install -y \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libjpeg62-turbo libgif7 librsvg2-2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs appuser
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/dist ./apps/inclass-backend/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/models ./apps/inclass-backend/models
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/package.json ./apps/inclass-backend/package.json
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
WORKDIR /app/apps/inclass-backend
ENV NODE_ENV=production
USER appuser
EXPOSE 3102
CMD ["node", "dist/index.js"]
```

**Step 2: Commit**

```bash
git add apps/inclass-backend/Dockerfile
git commit -m "feat(inclass): update Dockerfile with canvas deps and face-api model download"
```

---

## Task 9: 學生人臉建檔 UI（可選，加在 manage-dashboard）

> 此 Task 為加分項目，核心功能不依賴此。可在 inclass 點名頁加入單一學生建檔入口。

**快速方案：** 在 main/page.tsx 的學生名單列表，每個學生旁加「建檔」按鈕，點開相機自拍後呼叫 `/api/face/enroll`。

---

## 驗證清單

```
□ pnpm --filter @94cram/inclass-backend exec tsc --noEmit  → 0 errors
□ pnpm --filter inclass-dashboard exec tsc --noEmit        → 0 errors
□ POST /api/face/enroll 回傳 { success: true }
□ POST /api/face/recognize 回傳 { matches: [...] }
□ CheckInModal 相機開啟，拍照後出現辨識結果 modal
□ 確認打卡後 attendance 記錄出現在今日到校列表
```

---

## 注意事項

1. **模型冷啟動**：第一次請求需載入模型（約 3-5 秒），Cloud Run 冷啟動時明顯。可在 `src/index.ts` 的 startup 中預載：
   ```typescript
   import { loadModels } from './services/faceRecognition.js'
   // 在 serve() 前加：
   await loadModels()
   ```

2. **body limit**：人臉圖片約 200-500KB（壓縮後），5MB 上限充足。

3. **光線影響**：辨識率在弱光下會降低，建議 UI 提示老師在光線充足處拍攝。

4. **已打卡重複**：`/api/face/recognize` 在 `autoCheckin: false` 模式不會重複打卡，由 `confirmFaceCheckin` 呼叫既有 `api.checkin` 來處理（內部已有重複檢查）。

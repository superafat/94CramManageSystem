# 學生管理增強：QR Code 家長綁定 + 年級自動運算 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增 QR Code 家長綁定機制（一生一碼、可設定時效、LINE 掃描即綁定）+ 出生日期自動換算年級（台灣學制 9/1 分界）。

**Architecture:** 新增 `manage_binding_tokens` 表存放 QR token，`manage_students` 加 `date_of_birth` 欄位。後端新增 binding-token CRUD + 公開綁定 API。前端學生詳情頁加 QR 區塊，表單加出生日期 + 即時年級計算。年級計算為純函式（前後端共用），不存 DB，每次查詢即時算。

**Tech Stack:** Hono + raw SQL, Next.js + Tailwind, `qrcode` npm (前端 SVG 生成), crypto.randomBytes (token)

---

### Task 1: Schema — 新增 `manage_binding_tokens` 表 + `manage_students` 加 `date_of_birth`

**Files:**
- Modify: `packages/shared/src/db/schema/manage.ts`

在 `manageStudents` 定義中（約第 28-43 行），`grade` 之後加入 `dateOfBirth`：

```typescript
dateOfBirth: date('date_of_birth'),  // 出生日期（nullable，雙軌並行）
```

在 `manageStudents` 之後、`manageEnrollments` 之前，新增 `manageBindingTokens` 表：

```typescript
// QR Code 家長綁定 Token
export const manageBindingTokens = pgTable('manage_binding_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at'),         // null = 永久有效
  usedAt: timestamp('used_at'),               // null = 未使用
  usedByLineId: varchar('used_by_line_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('idx_binding_tokens_token').on(table.token),
  studentIdx: index('idx_binding_tokens_student').on(table.tenantId, table.studentId),
}));
```

**驗證：** `pnpm --filter @94cram/shared typecheck` → 0 errors

---

### Task 2: Shared Utility — 年級自動計算函式 `computeGrade`

**Files:**
- Create: `packages/shared/src/utils/grade-calculator.ts`

```typescript
/**
 * 台灣學制年級自動計算
 * 以 9/1 為學年分界，根據出生日期算出當前年級
 */

const GRADE_LABELS: Record<number, string> = {
  3: '幼兒園小班', 4: '幼兒園中班', 5: '幼兒園大班',
  6: '小一', 7: '小二', 8: '小三', 9: '小四', 10: '小五', 11: '小六',
  12: '國一', 13: '國二', 14: '國三',
  15: '高一', 16: '高二', 17: '高三',
}

export function computeGrade(dateOfBirth: string | Date, referenceDate?: Date): string | null {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  if (isNaN(dob.getTime())) return null

  const ref = referenceDate ?? new Date()
  // 台灣學制：以 9/1 為學年起始
  // 計算「學年度年齡」：若當前日期 >= 9/1，用今年 9/1 算；否則用去年 9/1 算
  const academicYear = ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1
  const academicStart = new Date(academicYear, 8, 1) // 9/1

  let age = academicStart.getFullYear() - dob.getFullYear()
  const monthDiff = academicStart.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && academicStart.getDate() < dob.getDate())) {
    age--
  }

  if (age < 3) return '未就學'
  if (age > 17) return '已畢業'
  return GRADE_LABELS[age] ?? null
}

export function computeGradeLevel(dateOfBirth: string | Date, referenceDate?: Date): string | null {
  return computeGrade(dateOfBirth, referenceDate)
}
```

**驗證：** `pnpm --filter @94cram/shared typecheck` → 0 errors

---

### Task 3: Backend — QR 綁定 Token API（CRUD）

**Files:**
- Create: `apps/manage-backend/src/routes/admin/binding-tokens.ts`

新增 Hono router `bindingTokensRoutes`，掛載在 admin routes 下：

| 端點 | 功能 |
|------|------|
| POST `/students/:id/binding-token` | 生成 token（body: `{ expiresIn: '7d' \| '30d' \| 'forever' }`） |
| GET `/students/:id/binding-token` | 查詢該學生目前有效的 token |
| DELETE `/students/:id/binding-token` | 作廢（軟刪除：設 used_at = now, used_by_line_id = 'revoked'） |

**實作要點：**
- 使用 `crypto.randomBytes(32).toString('hex')` 生成 64 字元 token
- POST 時先 DELETE 舊的未使用 token（一生一碼）
- expiresIn 換算：'7d' → `NOW() + INTERVAL '7 days'`，'30d' → 30 days，'forever' → NULL
- GET 回傳 token + QR URL（`https://94cram.com/bind/{token}` 或 demo 時 `http://localhost:3200/bind/{token}`）
- Permission: `STUDENTS_READ` (GET), `STUDENTS_WRITE` (POST/DELETE)

**Modify:** `apps/manage-backend/src/routes/admin/index.ts` — 新增 import + route

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

### Task 4: Backend — 公開綁定執行 API

**Files:**
- Create: `apps/manage-backend/src/routes/bind.ts`

此路由**不需要 JWT 認證**，掛載在 app root（不在 `/api/admin` 下）：

| 端點 | 功能 |
|------|------|
| GET `/api/bind/:token` | 驗證 token → 回傳 `{ valid, studentName, tenantName }` |
| POST `/api/bind/:token` | 執行綁定（body: `{ lineUserId }`） |

**GET 驗證邏輯：**
1. 查詢 `manage_binding_tokens WHERE token = :token AND used_at IS NULL`
2. 檢查 `expires_at IS NULL OR expires_at > NOW()`
3. JOIN `manage_students` 取學生姓名
4. 回傳 `{ valid: true, studentName, tenantName }` 或 `{ valid: false, reason: 'expired' | 'used' | 'not_found' }`

**POST 綁定邏輯：**
1. 同上驗證
2. 原子更新：`UPDATE manage_binding_tokens SET used_at = NOW(), used_by_line_id = :lineUserId WHERE token = :token AND used_at IS NULL`
3. 檢查 affected rows = 1（防止競態）
4. 同時更新 `inclass_parents` 或 `parent_students` 關聯（若存在）
5. 回傳 `{ success: true, studentName }`

**Modify:** `apps/manage-backend/src/index.ts`（或 routes 入口）— 掛載 `/api/bind` 路由（不經過 authMiddleware）

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

### Task 5: Backend — 學生 API 增強（dateOfBirth + computedGrade）

**Files:**
- Modify: `apps/manage-backend/src/routes/admin/students.ts`

**GET `/students` 增強：**
- SQL SELECT 加入 `s.date_of_birth`
- 回傳資料加上 `computed_grade` 欄位（後端計算）：

```typescript
import { computeGrade } from '@94cram/shared/utils/grade-calculator'

// 在回傳時加入 computed_grade
const studentsWithGrade = studentRows.map(s => ({
  ...s,
  computed_grade: s.date_of_birth ? computeGrade(s.date_of_birth) : null,
}))
```

**PUT `/students/:id` 增強：**
- `updateStudentSchema` 加入 `dateOfBirth: z.string().optional()`（ISO date string）
- SQL UPDATE 加入 `date_of_birth` 欄位
- 若有 dateOfBirth，同時自動更新 `grade_level` 為 `computeGrade(dateOfBirth)`

**GET `/students/grade-upgrade-preview`（新端點）：**
- 查詢所有有 `date_of_birth` 的學生
- 計算當前年級 vs 以「下個 9/1」為基準的年級
- 回傳將升級的學生列表

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

### Task 6: Frontend — 學生表單增強（出生日期 + 即時年級計算）

**Files:**
- Modify: `apps/manage-dashboard/src/app/students/page.tsx`

**表單修改：**
- `emptyForm` 加入 `dateOfBirth: ''`
- 編輯時從 student 帶入 `date_of_birth`
- Modal 表單新增「出生日期」date input（在年級下拉前面）
- 輸入出生日期後，即時顯示計算出的年級（用前端 `computeGrade` 函式）
- 年級下拉：有 dateOfBirth 時變為唯讀（顯示自動計算結果 + 「自動」標籤），無 dateOfBirth 時保持手動下拉

**列表修改：**
- 年級欄位顯示 `computed_grade ?? grade_level`
- 自動計算的年級旁顯示 `<span className="text-xs text-[#6B9BD2]">自動</span>`

**需安裝：** 不需要額外套件，`computeGrade` 是純函式可在前端直接用

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

### Task 7: Frontend — 學生詳情頁 QR Code 區塊

**Files:**
- Modify: `apps/manage-dashboard/src/app/students/[id]/page.tsx`

**新增「家長綁定」區塊**（在基本資料下方）：

```
┌───────────────────────────────────┐
│  家長綁定 QR Code                  │
│                                   │
│  ┌─────────┐  狀態：有效           │
│  │ QR Code │  過期：2026/03/12     │
│  │  (SVG)  │  綁定：尚未綁定       │
│  └─────────┘                      │
│                                   │
│  [生成 QR Code] [列印] [作廢]      │
└───────────────────────────────────┘
```

**實作：**
- 安裝 `qrcode` 套件：`pnpm --filter @94cram/manage-dashboard add qrcode @types/qrcode`
- 頁面載入時 GET `/api/admin/students/:id/binding-token` 查詢現有 token
- 有 token → 用 `QRCode.toDataURL()` 生成 QR 圖片，URL 為 `https://94cram.com/bind/{token}`
- 「生成 QR Code」按鈕 → Modal 選擇時效（7天/30天/永久）→ POST API
- 「列印」按鈕 → 開新視窗，只含 QR 圖片 + 學生姓名 + 補習班名稱，`window.print()`
- 「作廢」按鈕 → 確認後 DELETE API
- 已使用的 token 顯示綁定的 LINE ID + 綁定時間

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

### Task 8: Frontend — 綁定確認頁面 `/bind/[token]`

**Files:**
- Create: `apps/manage-dashboard/src/app/bind/[token]/page.tsx`
- Create: `apps/manage-dashboard/src/app/bind/[token]/layout.tsx`（不需 AppLayout，公開頁面）

**流程：**
1. 頁面載入 → GET `/api/bind/:token` 驗證
2. token 有效 → 顯示「確認綁定」頁面：學生姓名 + 補習班名稱 + 「確認綁定」按鈕
3. token 無效 → 顯示錯誤訊息（過期/已使用/不存在）
4. 點擊「確認綁定」→ 需要家長輸入 LINE userId（或未來接 LIFF 自動帶入）
5. Demo 模式：直接模擬綁定成功

**頁面風格：** 全螢幕置中卡片，莫蘭迪色系，適合手機瀏覽（LINE 內建瀏覽器）

**Layout：** 不使用 AppLayout（無 sidebar），純公開頁面：

```typescript
export default function BindLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F5F0EB]">{children}</div>
}
```

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

### Task 9: Demo 數據更新

**Files:**
- Modify: `apps/manage-dashboard/src/lib/demo-data.ts`

**STUDENTS 增強：**
- 每個 demo 學生加上 `date_of_birth`：
  - 陳小利：`2013-05-15`（→ 國一）
  - 王大明：`2012-08-20`（→ 國二）
  - 林美琪：`2013-11-03`（→ 國一）
  - 張志豪：`2011-03-10`（→ 國三）
  - 李宜庭：`2014-07-22`（→ 小六）
  - 黃柏翰：`2012-04-18`（→ 國二）
  - 劉思涵：`2013-09-25`（→ 國一）
  - 吳承恩：`2011-12-01`（→ 國三）
- 回傳加上 `computed_grade` 欄位

**新增 DEMO_BINDING_TOKENS：**
```typescript
const DEMO_BINDING_TOKENS = [
  { id: 'bt1', student_id: 's1', token: 'demo-token-chen', expires_at: '2026-03-12T00:00:00Z', used_at: null, used_by_line_id: null, status: 'active' },
  { id: 'bt2', student_id: 's2', token: 'demo-token-wang', expires_at: '2026-02-20T00:00:00Z', used_at: null, used_by_line_id: null, status: 'expired' },
  { id: 'bt3', student_id: 's3', token: 'demo-token-lin', expires_at: null, used_at: '2026-02-28T10:00:00Z', used_by_line_id: 'U1234567890', status: 'used' },
]
```

**新增 demo handlers：**
- GET `students/:id/binding-token` → 回傳對應 token
- POST `students/:id/binding-token` → 回傳新 token
- DELETE `students/:id/binding-token` → 回傳成功
- GET `bind/:token` → 驗證 demo token
- POST `bind/:token` → 模擬綁定成功
- GET `students/grade-upgrade-preview` → 回傳升級預覽

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

### Task 10: Typecheck 全系統驗證

- `pnpm --filter @94cram/shared typecheck` → 0 errors
- `pnpm --filter @94cram/manage-backend typecheck` → 0 errors
- `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

## 設計決策

1. **QR = Token URL** — 不依賴 LIFF，純 URL + LINE 內建瀏覽器即可運作
2. **Token 可設定時效** — 7天/30天/永久，行政自選
3. **年級用即時計算** — 不存 computed_grade 到 DB，每次查詢時算，9/1 自動升級
4. **雙軌並行** — 有生日用自動算，沒生日用手動 grade，不強制遷移
5. **前端 QR 生成** — 用 `qrcode` npm 在瀏覽器端生成，不需後端圖片 API
6. **LINE Bot 多子切換暫緩** — bot-gateway 已有 Telegram 切換機制，LINE 側留待後續

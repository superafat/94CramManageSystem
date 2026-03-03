# 講師管理增強 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 擴充 94Manage 講師管理功能，新增完整個資、匯款資訊、教授科目與年級欄位。

**Architecture:** 在現有 `teachers` 表直接新增欄位（方案 A），科目/年級使用 PostgreSQL `text[]` 陣列。前端表單改為分區式佈局，後端 SQL 和 Zod 驗證同步擴充。

**Tech Stack:** Drizzle ORM (schema) + Hono (API) + Next.js (frontend) + PostgreSQL (text[])

---

## Task 1: DB Schema — 新增 `date` 匯出 + 講師欄位

**Files:**
- Modify: `packages/shared/src/db/connection.ts:9`
- Modify: `packages/shared/src/db/schema/manage.ts:60-74`

**Step 1: 在 connection.ts 加入 `date` 匯出**

在第 9 行的 re-export 加入 `date`：

```typescript
export { pgTable, serial, varchar, uuid, timestamp, boolean, text, integer, decimal, jsonb, index, primaryKey, uniqueIndex, date } from 'drizzle-orm/pg-core';
```

**Step 2: 在 manage.ts 的 manageTeachers 表新增欄位**

把第 60-74 行的 `manageTeachers` 定義替換為：

```typescript
// 老師
export const manageTeachers = pgTable('manage_teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  expertise: text('expertise'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  // --- 新增：個人資料 ---
  idNumber: varchar('id_number', { length: 10 }),
  birthday: date('birthday'),
  address: text('address'),
  emergencyContact: varchar('emergency_contact', { length: 50 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  // --- 新增：匯款資訊 ---
  bankName: varchar('bank_name', { length: 50 }),
  bankBranch: varchar('bank_branch', { length: 50 }),
  bankAccount: varchar('bank_account', { length: 20 }),
  bankAccountName: varchar('bank_account_name', { length: 50 }),
  // --- 新增：教授能力 ---
  subjects: text('subjects').array(),
  gradeLevels: text('grade_levels').array(),
  // --- 既有 ---
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_teachers_tenant_id_idx').on(table.tenantId),
}));
```

注意：import 行需加入 `date`：
```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, uniqueIndex, index, date } from '../connection';
```

**Step 3: 同步資料庫 schema**

```bash
pnpm --filter @94cram/shared drizzle-kit push
```

Expected: Schema 同步成功，新增 11 個欄位到 manage_teachers 表。

**Step 4: Commit**

```bash
git add packages/shared/src/db/connection.ts packages/shared/src/db/schema/manage.ts
git commit -m "feat(shared): add teacher profile fields to manage_teachers schema"
```

---

## Task 2: Backend — 更新 Zod 驗證 Schema

**Files:**
- Modify: `apps/manage-backend/src/utils/validation.ts:106-126`

**Step 1: 定義科目和年級常數 + 更新 createTeacherSchema**

在 `teacherStatusSchema` (第 108 行) 之後，加入常數定義並替換 schema：

```typescript
export const teacherStatusSchema = z.enum(['active', 'inactive', 'resigned'])

// 科目與年級固定選項
export const SUBJECT_OPTIONS = [
  '國文', '英文', '數學', '理化', '物理', '化學',
  '生物', '地科', '歷史', '地理', '公民', '自然',
  '社會', '作文', '閱讀', '程式設計',
] as const

export const GRADE_LEVEL_OPTIONS = ['國小', '國中', '高中'] as const

export const subjectSchema = z.enum(SUBJECT_OPTIONS)
export const gradeLevelSchema = z.enum(GRADE_LEVEL_OPTIONS)

export const createTeacherSchema = z.object({
  userId: uuidSchema.optional().nullable(),
  tenantId: uuidSchema,
  branchId: uuidSchema,
  name: nonEmptyString.max(50),
  title: z.string().max(20).default('教師'),
  phone: phoneSchema,
  email: emailSchema,
  ratePerClass: z.coerce.number().positive('Rate must be positive'),
  // 個人資料
  idNumber: z.string().max(10).optional(),
  birthday: dateStringSchema.optional(),
  address: z.string().max(200).optional(),
  emergencyContact: z.string().max(50).optional(),
  emergencyPhone: phoneSchema,
  // 匯款資訊
  bankName: z.string().max(50).optional(),
  bankBranch: z.string().max(50).optional(),
  bankAccount: z.string().max(20).optional(),
  bankAccountName: z.string().max(50).optional(),
  // 教授能力
  subjects: z.array(subjectSchema).optional(),
  gradeLevels: z.array(gradeLevelSchema).optional(),
})

export const updateTeacherSchema = z.object({
  name: z.string().max(50).optional(),
  title: z.string().max(20).optional(),
  phone: phoneSchema,
  email: emailSchema,
  ratePerClass: z.coerce.number().positive().optional(),
  status: teacherStatusSchema.optional(),
  // 個人資料
  idNumber: z.string().max(10).optional().nullable(),
  birthday: dateStringSchema.optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  emergencyContact: z.string().max(50).optional().nullable(),
  emergencyPhone: phoneSchema.nullable(),
  // 匯款資訊
  bankName: z.string().max(50).optional().nullable(),
  bankBranch: z.string().max(50).optional().nullable(),
  bankAccount: z.string().max(20).optional().nullable(),
  bankAccountName: z.string().max(50).optional().nullable(),
  // 教授能力
  subjects: z.array(subjectSchema).optional().nullable(),
  gradeLevels: z.array(gradeLevelSchema).optional().nullable(),
})
```

**Step 2: Commit**

```bash
git add apps/manage-backend/src/utils/validation.ts
git commit -m "feat(manage): add teacher profile fields to Zod validation schemas"
```

---

## Task 3: Backend — 更新 API 路由 SQL

**Files:**
- Modify: `apps/manage-backend/src/routes/w8.ts:119-172`

**Step 1: 更新 POST /teachers 的 INSERT 語句（第 124-129 行）**

將 INSERT 語句替換為：

```typescript
w8Routes.post('/teachers', requireRole(Role.ADMIN, Role.MANAGER), zValidator('json', createTeacherSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const user = c.get('user')

    const result = await db.execute(sql`
      INSERT INTO teachers (
        user_id, tenant_id, branch_id, name, title, phone, email, rate_per_class,
        id_number, birthday, address, emergency_contact, emergency_phone,
        bank_name, bank_branch, bank_account, bank_account_name,
        subjects, grade_levels
      )
      VALUES (
        ${body.userId || null}, ${user?.tenant_id ?? body.tenantId}, ${body.branchId},
        ${sanitizeString(body.name)}, ${sanitizeString(body.title)}, ${body.phone || null}, ${body.email || null}, ${body.ratePerClass},
        ${body.idNumber || null}, ${body.birthday ? sql`${body.birthday}::date` : null}, ${body.address ? sanitizeString(body.address) : null},
        ${body.emergencyContact ? sanitizeString(body.emergencyContact) : null}, ${body.emergencyPhone || null},
        ${body.bankName ? sanitizeString(body.bankName) : null}, ${body.bankBranch ? sanitizeString(body.bankBranch) : null},
        ${body.bankAccount || null}, ${body.bankAccountName ? sanitizeString(body.bankAccountName) : null},
        ${body.subjects ? sql`${body.subjects}::text[]` : null}, ${body.gradeLevels ? sql`${body.gradeLevels}::text[]` : null}
      )
      RETURNING *
    `)

    return success(c, { teacher: first(result) }, 201)
  } catch (error) {
    logger.error({ err: error }, 'Error creating teacher:')
    if (error instanceof Error && (error as Error & { code?: string }).code === '23505') {
      return conflict(c, 'Teacher already exists')
    }
    return internalError(c, error)
  }
})
```

**Step 2: 更新 PUT /teachers/:id 的 UPDATE 語句（第 141-172 行）**

將 UPDATE 語句替換為：

```typescript
w8Routes.put('/teachers/:id', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateTeacherSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')

      const result = await db.execute(sql`
        UPDATE teachers
        SET name = COALESCE(${body.name != null ? sanitizeString(body.name) : null}, name),
            title = COALESCE(${body.title != null ? sanitizeString(body.title) : null}, title),
            phone = COALESCE(${body.phone ?? null}, phone),
            email = COALESCE(${body.email ?? null}, email),
            rate_per_class = COALESCE(${body.ratePerClass ?? null}, rate_per_class),
            status = COALESCE(${body.status ?? null}, status),
            id_number = COALESCE(${body.idNumber ?? null}, id_number),
            birthday = COALESCE(${body.birthday != null ? sql`${body.birthday}::date` : null}, birthday),
            address = COALESCE(${body.address != null ? sanitizeString(body.address) : null}, address),
            emergency_contact = COALESCE(${body.emergencyContact != null ? sanitizeString(body.emergencyContact) : null}, emergency_contact),
            emergency_phone = COALESCE(${body.emergencyPhone ?? null}, emergency_phone),
            bank_name = COALESCE(${body.bankName != null ? sanitizeString(body.bankName) : null}, bank_name),
            bank_branch = COALESCE(${body.bankBranch != null ? sanitizeString(body.bankBranch) : null}, bank_branch),
            bank_account = COALESCE(${body.bankAccount ?? null}, bank_account),
            bank_account_name = COALESCE(${body.bankAccountName != null ? sanitizeString(body.bankAccountName) : null}, bank_account_name),
            subjects = COALESCE(${body.subjects ? sql`${body.subjects}::text[]` : null}, subjects),
            grade_levels = COALESCE(${body.gradeLevels ? sql`${body.gradeLevels}::text[]` : null}, grade_levels),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `)

      const teacher = first(result)
      if (!teacher) {
        return notFound(c, 'Teacher')
      }

      return success(c, { teacher })
    } catch (error) {
      logger.error({ err: error }, 'Error updating teacher:')
      return internalError(c, error)
    }
  }
)
```

**Step 3: Commit**

```bash
git add apps/manage-backend/src/routes/w8.ts
git commit -m "feat(manage): update teacher API routes with new profile fields"
```

---

## Task 4: Frontend — 擴充表單與列表

**Files:**
- Modify: `apps/manage-dashboard/src/app/teachers/page.tsx`

**Step 1: 更新 Teacher interface 和 form state**

替換第 7-15 行的 interface 和第 32 行的 form state：

```typescript
interface Teacher {
  id: string
  name: string
  title: string
  phone: string
  email: string
  rate_per_class: string
  status: string
  // 個人資料
  id_number?: string
  birthday?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  // 匯款資訊
  bank_name?: string
  bank_branch?: string
  bank_account?: string
  bank_account_name?: string
  // 教授能力
  subjects?: string[]
  grade_levels?: string[]
}

const SUBJECT_OPTIONS = [
  '國文', '英文', '數學', '理化', '物理', '化學',
  '生物', '地科', '歷史', '地理', '公民', '自然',
  '社會', '作文', '閱讀', '程式設計',
]

const GRADE_LEVEL_OPTIONS = ['國小', '國中', '高中']

const EMPTY_FORM = {
  name: '', title: '教師', phone: '', email: '', rate_per_class: '',
  id_number: '', birthday: '', address: '',
  emergency_contact: '', emergency_phone: '',
  bank_name: '', bank_branch: '', bank_account: '', bank_account_name: '',
  subjects: [] as string[],
  grade_levels: [] as string[],
}
```

**Step 2: 更新 form state 初始化和 openEdit/openAdd**

```typescript
const [form, setForm] = useState(EMPTY_FORM)
```

openAdd 用 `setForm({ ...EMPTY_FORM, subjects: [], grade_levels: [] })`

openEdit 用：
```typescript
const openEdit = (teacher: Teacher) => {
  setEditingTeacher(teacher)
  setForm({
    name: teacher.name,
    title: teacher.title,
    phone: teacher.phone || '',
    email: teacher.email || '',
    rate_per_class: teacher.rate_per_class,
    id_number: teacher.id_number || '',
    birthday: teacher.birthday || '',
    address: teacher.address || '',
    emergency_contact: teacher.emergency_contact || '',
    emergency_phone: teacher.emergency_phone || '',
    bank_name: teacher.bank_name || '',
    bank_branch: teacher.bank_branch || '',
    bank_account: teacher.bank_account || '',
    bank_account_name: teacher.bank_account_name || '',
    subjects: teacher.subjects || [],
    grade_levels: teacher.grade_levels || [],
  })
  setShowModal(true)
}
```

**Step 3: 更新 handleSubmit body**

在 `body: JSON.stringify({...})` 中加入所有新欄位，將空字串轉 null：

```typescript
body: JSON.stringify({
  name: form.name,
  title: form.title,
  phone: form.phone || undefined,
  email: form.email || undefined,
  ratePerClass: form.rate_per_class,
  idNumber: form.id_number || undefined,
  birthday: form.birthday || undefined,
  address: form.address || undefined,
  emergencyContact: form.emergency_contact || undefined,
  emergencyPhone: form.emergency_phone || undefined,
  bankName: form.bank_name || undefined,
  bankBranch: form.bank_branch || undefined,
  bankAccount: form.bank_account || undefined,
  bankAccountName: form.bank_account_name || undefined,
  subjects: form.subjects.length > 0 ? form.subjects : undefined,
  gradeLevels: form.grade_levels.length > 0 ? form.grade_levels : undefined,
  tenant_id: getTenantId(),
  branch_id: getBranchId(),
})
```

**Step 4: 擴充 Modal 表單 UI**

將 Modal 內的 form 改為分區式佈局，使用 `max-h-[80vh] overflow-y-auto` 讓長表單可滾動：

```tsx
<div className="bg-surface rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
  <h2 className="text-lg font-semibold text-text mb-4">
    {editingTeacher ? '編輯講師' : '新增講師'}
  </h2>
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* 基本資料 */}
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-primary mb-2">基本資料</legend>
      {/* name, title, phone, email, rate_per_class 欄位 */}
    </fieldset>

    {/* 個人資料 */}
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-primary mb-2">個人資料</legend>
      {/* id_number, birthday, address, emergency_contact, emergency_phone */}
    </fieldset>

    {/* 匯款資訊 */}
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-primary mb-2">匯款資訊</legend>
      {/* bank_name, bank_branch, bank_account, bank_account_name */}
    </fieldset>

    {/* 教授科目 */}
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-primary mb-2">教授科目</legend>
      <div className="grid grid-cols-4 gap-2">
        {SUBJECT_OPTIONS.map((subject) => (
          <label key={subject} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={form.subjects.includes(subject)}
              onChange={(e) => {
                setForm({
                  ...form,
                  subjects: e.target.checked
                    ? [...form.subjects, subject]
                    : form.subjects.filter((s) => s !== subject),
                })
              }}
              className="rounded border-border text-primary"
            />
            {subject}
          </label>
        ))}
      </div>
    </fieldset>

    {/* 教授年級 */}
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-primary mb-2">教授年級</legend>
      <div className="flex gap-4">
        {GRADE_LEVEL_OPTIONS.map((level) => (
          <label key={level} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={form.grade_levels.includes(level)}
              onChange={(e) => {
                setForm({
                  ...form,
                  grade_levels: e.target.checked
                    ? [...form.grade_levels, level]
                    : form.grade_levels.filter((l) => l !== level),
                })
              }}
              className="rounded border-border text-primary"
            />
            {level}
          </label>
        ))}
      </div>
    </fieldset>

    {/* 按鈕 */}
    <div className="flex gap-3 pt-2">...</div>
  </form>
</div>
```

**Step 5: 更新列表卡片顯示科目和年級**

在每張卡片下方（teacher.phone 之後）顯示 tags：

```tsx
{(teacher.subjects?.length > 0 || teacher.grade_levels?.length > 0) && (
  <div className="flex flex-wrap gap-1 mt-2">
    {teacher.grade_levels?.map((level) => (
      <span key={level} className="px-1.5 py-0.5 bg-accent/10 text-accent text-xs rounded">
        {level}
      </span>
    ))}
    {teacher.subjects?.map((subject) => (
      <span key={subject} className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-xs rounded">
        {subject}
      </span>
    ))}
  </div>
)}
```

**Step 6: Commit**

```bash
git add apps/manage-dashboard/src/app/teachers/page.tsx
git commit -m "feat(manage): expand teacher form with profile, bank, and subject fields"
```

---

## Task 5: 驗證 + TypeCheck

**Step 1: 執行型別檢查**

```bash
pnpm typecheck
```

Expected: 0 errors

**Step 2: 手動驗證（如有本機可執行）**

1. 啟動 manage-dashboard + manage-backend
2. 進入講師管理頁面
3. 點「+ 新增」，確認表單有 5 個分區
4. 勾選科目和年級 checkbox
5. 送出後確認列表正確顯示 tags

**Step 3: Final commit (如有修正)**

```bash
git add -A
git commit -m "fix(manage): address typecheck issues in teacher profile enhancement"
```

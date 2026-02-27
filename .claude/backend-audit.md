# 94CramManageSystem Backend 全面審計報告

**審計日期**: 2026-02-27
**審計範圍**: manage-backend, inclass-backend, stock-backend, bot-gateway

---

## 🔍 發現摘要

### 重要問題數量統計
- **高嚴重度**: 8 項
- **中嚴重度**: 12 項
- **低嚴重度**: 6 項
- **總計**: 26 項

---

## 📋 詳細發現

### 1️⃣ 效能瓶頸 - 無限查詢（高嚴重度）

#### 1.1 manage-backend/routes/bot-ext/data.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/bot-ext/data.ts`

| 行號 | 問題 | 嚴重度 |
|------|------|--------|
| 16 | `db.select().from(manageStudents).where(...)` - 無 `.limit()`，會載入所有學生 | 🔴 高 |
| 32 | `db.select().from(manageCourses).where(...)` - 無 `.limit()`，會載入所有課程 | 🔴 高 |

**影響**: Bot 請求會強制載入整個租戶的學生/課程表，在大型補習班會導致 OOM 或超時。

**建議修復**:
```typescript
// 第 16-17 行改為
const students = await db.select().from(manageStudents)
  .where(eq(manageStudents.tenantId, tenantId))
  .limit(1000)  // 設定上限

// 第 32-33 行改為
const courses = await db.select().from(manageCourses)
  .where(eq(manageCourses.tenantId, tenantId))
  .limit(500)   // 設定上限
```

---

#### 1.2 manage-backend/routes/enrollment.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/enrollment.ts`

| 行號 | 問題 | 嚴重度 |
|------|------|--------|
| 132 | `db.select().from(manageLeads).where(...)` - 查詢報表時無分頁 | 🔴 高 |
| 221 | `db.select().from(manageLeads).where(...)` - 查詢報表時無分頁 | 🔴 高 |
| 389 | `db.select().from(manageLeads).where(...)` - 查詢報表時無分頁 | 🔴 高 |
| 503 | `db.select().from(manageLeads).where(...)` - 查詢報表時無分頁 | 🔴 高 |

**影響**: 招生漏斗報表 (GET /funnel, /conversion-stats) 會載入所有 leads，沒有分頁機制。

**建議修復**: 加入 `limit()` 或分頁邏輯，例如:
```typescript
const leads = await db.select().from(manageLeads)
  .where(...)
  .limit(5000)
  .offset((pageNumber - 1) * pageSize)
```

---

#### 1.3 manage-backend/routes/bot-ext/finance.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/bot-ext/finance.ts`

| 行號 | 問題 | 嚴重度 |
|------|------|--------|
| 19, 22, 28, 108, 111, 120 | 多處 `db.select().from(manageStudents).where(...)` 無 limit | 🔴 高 |
| 41, 86, 126 | `db.select().from(manageEnrollments/Payments).where(...)` 無 limit | 🟡 中 |

**影響**: 財務查詢 (POST /payment, /summary, /history) 在大型補習班會超時或記憶體溢位。

---

#### 1.4 inclass-backend/routes 多個檔案
**文件**:
- `/Users/dali/Github/94CramManageSystem/apps/inclass-backend/src/routes/admin.ts:17`
- `/Users/dali/Github/94CramManageSystem/apps/inclass-backend/src/routes/classes.ts:30`
- `/Users/dali/Github/94CramManageSystem/apps/inclass-backend/src/routes/exams.ts:36`

| 問題 | 嚴重度 |
|------|--------|
| `db.select().from(users).where(...)` - 無 limit | 🟡 中 |
| `db.select().from(manageCourses).where(...)` - 無 limit | 🟡 中 |
| `db.select().from(inclassExams).where(...)` - 無 limit | 🟡 中 |

**建議**: 所有列表查詢加 `.limit(100 ~ 1000)` 或分頁邏輯。

---

#### 1.5 stock-backend/routes 多個檔案
**文件**:
- `/Users/dali/Github/94CramManageSystem/apps/stock-backend/src/routes/categories.ts:23`
- `/Users/dali/Github/94CramManageSystem/apps/stock-backend/src/routes/classes.ts:42`
- `/Users/dali/Github/94CramManageSystem/apps/stock-backend/src/routes/inventory-counts.ts:20`

| 問題 | 嚴重度 |
|------|--------|
| `db.select().from(stockCategories)` - 無 limit | 🟡 中 |
| `db.select().from(stockClasses)` - 無 limit | 🟡 中 |
| `db.select().from(stockInventoryCounts)` - 無 limit | 🟡 中 |

---

### 2️⃣ 錯誤處理不足（中嚴重度）

#### 2.1 manage-backend/routes/parent-ext.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/parent-ext.ts`

| 行號 | 問題 | 嚴重度 |
|------|------|--------|
| 51-52 | `catch (error) { return c.json(...) }` - 無 logger | 🟡 中 |
| 其他 catch | 同樣模式，無 error logging | 🟡 中 |

**影響**: 生產環境無法診斷 API 失敗原因。

**建議**:
```typescript
catch (error) {
  logger.error({ err: error }, '[Parent API] Error detail')
  return c.json({ success: false, error: 'internal' }, 500)
}
```

---

#### 2.2 manage-backend/routes/notifications.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/notifications.ts`

| 行號 | 問題 | 備註 |
|------|------|------|
| 多處 | `catch (error)` 無詳細 logging | 🟡 中 |

**TODO 註記** (行 91):
```
* TODO: Add rate limiting - max 100 notifications per minute
```

---

#### 2.3 inclass-backend/routes/students.ts 等
**文件**:
- `/Users/dali/Github/94CramManageSystem/apps/inclass-backend/src/routes/students.ts:43-45, 74-76, 88-90`
- `/Users/dali/Github/94CramManageSystem/apps/inclass-backend/src/routes/classes.ts` 多處

| 問題 | 嚴重度 |
|------|--------|
| `catch (e) { logger.error(..., 'message') }` - 錯誤處理模式 | 🟡 中 |

例如:
```typescript
catch (e) {
  logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `...`)  ✅ 正確
  return c.json({ error: 'Failed to fetch students' }, 500)
}
```

---

### 3️⃣ 缺少速率限制（中嚴重度）

#### 3.1 manage-backend/routes/notifications.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/notifications.ts:91`

**問題**:
```typescript
/**
 * TODO: Add rate limiting - max 100 notifications per minute
 */
```

**影響**: Admin 可以無限制發送通知，存在 DoS 風險。

**建議**: 使用共用的 Redis 或 Firestore 速率限制器（如 manage-backend/app.ts 中的 `checkRateLimit`）。

---

### 4️⃣ Middleware 配置問題（中嚴重度）

#### 4.1 stock-backend/routes/auth.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/stock-backend/src/routes/auth.ts:154`

**FIXME 註記**:
```typescript
// FIXME: tenant bootstrap should be owned by manage system orchestration.
```

**影響**: Stock 系統自行處理租戶初始化，應由 manage 系統統一控制。

---

#### 4.2 bot-gateway 未實作 Pub/Sub
**文件**: `/Users/dali/Github/94CramManageSystem/apps/bot-gateway/src/utils/broadcast-queue.ts:126`

**TODO 註記**:
```typescript
// TODO: Implement Pub/Sub version when Cloud Pub/Sub is configured
```

**現狀**: 使用本機記憶體或 Firestore 實現廣播，無法跨 Cloud Run 實例同步。

---

### 5️⃣ 潛在的 N+1 查詢（中嚴重度）

#### 5.1 manage-backend/routes/enrollment.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/enrollment.ts`

**潛在問題**: 在 leads 迴圈中查詢關聯資料（如果存在）。未見明顯證據，但需檢查轉換統計邏輯。

---

### 6️⃣ 大型路由檔案（低嚴重度）

#### 6.1 manage-backend/routes/admin.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/admin.ts`
- **行數**: 2012 行
- **問題**: 單一檔案過大，難以維護

**建議**: 拆分為:
```
admin/
  ├── knowledge.ts    (ingest 邏輯)
  ├── tenants.ts      (租戶管理)
  ├── students.ts     (學生管理)
  ├── reports.ts      (報表生成)
  └── index.ts        (路由集合)
```

---

#### 6.2 manage-backend/routes/enrollment.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/enrollment.ts`
- **行數**: 527 行
- **問題**: 招生管理邏輯集中在單一檔案

**建議**: 拆分為:
```
enrollment/
  ├── leads.ts        (Lead 管理)
  ├── conversion.ts   (轉換統計)
  └── index.ts
```

---

#### 6.3 manage-backend/routes/line.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/manage-backend/src/routes/line.ts`
- **行數**: 911 行
- **問題**: LINE 整合邏輯過於複雜

**建議**: 提取至 `/services/line` 並依功能分模組。

---

### 7️⃣ 驗證和安全（低嚴重度）

#### 7.1 stock-backend/routes/categories.ts
**文件**: `/Users/dali/Github/94CramManageSystem/apps/stock-backend/src/routes/categories.ts:21-27`

**良好實踐**: ✅ 使用 Zod schema 驗證所有輸入

---

### 8️⃣ 缺失的 API 端點文件（低嚴重度）

#### 8.1 各 backend 缺少 API 文件
- manage-backend: `/routes/docs.ts` (515 行) - 假設為文件
- 其他 backend 無對應文件

**建議**: 使用 OpenAPI/Swagger 自動化文件生成。

---

## 📊 Backend 路由對照表

### manage-backend (port 3100)

| 路由 | 檔案 | 行數 | 狀態 |
|------|------|------|------|
| `/api/auth` | auth.ts | 607 | ✅ |
| `/api/admin` | admin.ts | 2012 | ⚠️ 太大 |
| `/api` (users) | users.ts | 425 | ✅ |
| `/api/bot` | bot.ts | 97 | ✅ |
| `/api/bot-ext` | bot-ext/ | 多個 | ⚠️ 無限查詢 |
| `/api/notifications` | notifications.ts | 543 | ⚠️ 無速率限制 |
| `/api/w8` | w8.ts | 753 | ✅ |
| `/api/line` | line.ts | 911 | ⚠️ 太大 |
| `/api/parent-ext` | parent-ext.ts | 174 | ⚠️ 無 logging |

### inclass-backend (port 3102)

| 路由 | 檔案 | 狀態 |
|------|------|------|
| `/api/auth` | auth.ts | ✅ |
| `/api/students` | students.ts | ⚠️ 無限查詢 |
| `/api/classes` | classes.ts | ⚠️ 無限查詢 |
| `/api/attendance` | attendance.ts | ⚠️ 無限查詢 |
| `/api/exams` | exams.ts | ⚠️ 無限查詢 |
| `/api/admin` | admin.ts | ✅ |
| `/api/parent-ext` | parent-ext.ts | ✅ |

### stock-backend (port 3101)

| 路由 | 檔案 | 狀態 |
|------|------|------|
| `/api/auth` | auth.ts | ⚠️ 租戶初始化 FIXME |
| `/api/categories` | categories.ts | ⚠️ 無限查詢 |
| `/api/items` | items.ts | ✅ |
| `/api/inventory` | inventory.ts | ⚠️ 無限查詢 |
| `/api/inventory-counts` | inventory-counts.ts | ⚠️ 無限查詢 |

### bot-gateway (port 3000)

| 路由 | 檔案 | 狀態 |
|------|------|------|
| `/webhook/telegram` | webhooks/telegram.ts | ✅ |
| `/webhook/telegram-parent` | webhooks/telegram-parent.ts | ✅ |
| `/api/*` | api/index.ts | ⚠️ 無 Pub/Sub TODO |

---

## 🎯 修復優先順序

### 第一優先（立即修復 - 1-2 天）
1. **無限查詢問題** - manage-backend bot-ext 和 enrollment
   - 影響: 生產環境 OOM/超時風險
   - 修復: 加 `.limit()` 和分頁

2. **無 error logging** - parent-ext, notifications 等
   - 影響: 無法診斷故障
   - 修復: 加 `logger.error({ err: ... })`

### 第二優先（本週修復）
3. **速率限制** - notifications admin 端點
4. **Middleware 配置** - stock auth tenant bootstrap FIXME
5. **Pub/Sub 實作** - bot-gateway 廣播隊列

### 第三優先（優化重構 - 本月內）
6. **拆分大型路由檔案** - admin.ts, enrollment.ts, line.ts
7. **API 文件化** - OpenAPI/Swagger
8. **N+1 查詢檢查** - enrollment 轉換統計邏輯

---

## ✅ 驗證清單

- [ ] 所有 `db.select()` 查詢加 `.limit()`
- [ ] 所有 `catch` block 有 `logger.error()`
- [ ] Admin 端點有速率限制
- [ ] 無 FIXME/TODO 在關鍵路徑
- [ ] 路由檔案 < 600 行
- [ ] 單位測試覆蓋率 > 70%
- [ ] 生產環境 Slow Query Log 監控

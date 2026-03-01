# 94 教育生態系 — 統一架設規劃書
> 版本: v3.0 | 2026-02-22 | 姜子牙 擬
> 變更：v2.0 → v3.0 — 三個系統合併至 94CramManageSystem monorepo

---

## 一、核心決策

| 項目 | 決策 |
|------|------|
| **GCP Project** | 🆕 `cram94-manage-system`（三系統共用，GCP ID 不能數字開頭） |
| **GitHub Repo** | 🆕 `superafat/94CramManageSystem`（monorepo） |
| **原始碼結構** | pnpm workspace monorepo |
| **Region** | `asia-east1`（台灣） |
| **Database** | 新 Cloud SQL `94platform-db` → DB `94platform` |
| **部署** | 每個 app 獨立 Cloud Run |
| **CI/CD** | GitHub Actions + path filter（各 app 獨立觸發） |
| **統一入口** | `apps/portal` — 圖標選擇器 |
| **SSO** | 共用 JWT_SECRET + users 表 |
| **Billing** | `010ED6-0628BE-09B2D4` |
| **域名** | `94cram.app` |
| **月預算** | NT$300（~$10 USD） |
| **94LineBot** | 不遷入，未來獨立為 `94CramLineBot` |

---

## 二、Monorepo 結構

```
94CramManageSystem/
├── pnpm-workspace.yaml
├── package.json                    ← root scripts
├── turbo.json                      ← turborepo (optional)
├── .github/
│   └── workflows/
│       ├── deploy-manage.yml       ← apps/manage-backend/** trigger
│       ├── deploy-inclass.yml      ← apps/inclass-backend/** trigger
│       ├── deploy-stock.yml        ← apps/stock-backend/** trigger
│       └── deploy-portal.yml       ← apps/portal/** trigger
├── packages/
│   └── shared/                     ← @94cram/shared
│       ├── package.json
│       └── src/
│           ├── db/
│           │   ├── connection.ts   ← Drizzle connection factory
│           │   └── schema/
│           │       ├── common.ts   ← tenants/users/branches/permissions
│           │       ├── manage.ts   ← manage_* tables
│           │       ├── inclass.ts  ← inclass_* tables
│           │       └── stock.ts    ← stock_* tables
│           ├── auth/
│           │   ├── jwt.ts          ← JWT sign/verify (共用 secret)
│           │   └── middleware.ts   ← Hono auth middleware
│           ├── types/
│           │   └── index.ts        ← 共用 TypeScript types
│           └── utils/
│               └── internal-api.ts ← X-Internal-Key helper
├── apps/
│   ├── manage-backend/             ← 從 94Manage/backend 搬入
│   │   ├── package.json            ← depends on @94cram/shared
│   │   ├── Dockerfile
│   │   └── src/
│   ├── manage-dashboard/           ← 從 94Manage/dashboard 搬入
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   ├── manage-miniapp/             ← 從 94Manage/miniapp 搬入
│   │   └── ...
│   ├── inclass-backend/            ← 從 94inClass/backend 搬入
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   ├── inclass-dashboard/          ← 從 94inClass/dashboard 搬入
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   ├── stock-backend/              ← 從 94Stock/backend 搬入
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   ├── stock-dashboard/            ← 從 94Stock/frontend 搬入
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   └── portal/                     ← 統一入口（Phase 5）
│       └── ...
├── infra/
│   ├── gcp-setup.sh                ← Phase 0 GCP 設定腳本
│   ├── sql/
│   │   └── init.sql                ← 初始 DB schema
│   └── secrets.example.env         ← 環境變數範本
└── docs/
    ├── 94_ECOSYSTEM_PLAN.md        ← 本文件
    ├── MIGRATION_GUIDE.md          ← 舊 repo 遷移指南
    └── DEV_RULES.md                ← 開發鐵律
```

---

## 三、共享核心設計（packages/shared）

### 3.1 共用資料表

```sql
-- ===== 共用核心（packages/shared/src/db/schema/common.ts）=====
tenants            -- 補習班（多租戶）
branches           -- 分校
users              -- 統一帳號
user_permissions   -- RBAC
audit_logs         -- 操作日誌

-- ===== manage_（packages/shared/src/db/schema/manage.ts）=====
manage_courses, manage_course_schedules, manage_course_pricing
manage_enrollments, manage_students, manage_parents
manage_teachers, manage_classrooms
manage_leave_requests, manage_makeup_sessions
manage_conversations, manage_knowledge_chunks
manage_notifications, manage_notification_preferences

-- ===== inclass_（packages/shared/src/db/schema/inclass.ts）=====
inclass_attendances, inclass_exams, inclass_exam_scores
inclass_schedules, inclass_nfc_cards, inclass_notifications

-- ===== stock_（packages/shared/src/db/schema/stock.ts）=====
stock_categories, stock_items, stock_warehouses, stock_inventory
stock_suppliers, stock_purchase_orders, stock_purchase_items
stock_transactions, stock_audit_logs
stock_classes, stock_class_materials, stock_material_distributions
stock_notification_settings, stock_notifications
stock_ai_predictions, stock_historical_usage
stock_integration_settings
stock_inventory_counts, stock_inventory_count_items, stock_barcodes
```

### 3.2 SSO

```
JWT Payload:
{
  "userId": "uuid",
  "tenantId": "uuid",
  "role": "admin|teacher|staff|parent|student",
  "permissions": ["manage:read", "inclass:read", "stock:admin"],
  "systems": ["94manage", "94inclass", "94stock"],
  "iat": ..., "exp": ...
}

Cookie domain: .94cram.app → 三個子系統自動帶入
```

### 3.3 跨服務內部 API

```
路徑: /api/internal/*
認證: X-Internal-Key header
限制: Cloud Run 內部流量 only

packages/shared/src/utils/internal-api.ts 提供 helper：
  internalFetch(service, path, options)
```

---

## 四、遷移步驟（舊 repo → monorepo）

### 4.0 原則
- Git history 不保留（太複雜且價值低），直接複製檔案
- 舊 repo 保留但標記 archived
- 一個系統搬完、跑通，再搬下一個

### 4.1 搬移清單

| 來源 | 目標 | 注意事項 |
|------|------|---------|
| `94Manage/backend/` | `apps/manage-backend/` | 移除 DB schema → 改 import @94cram/shared |
| `94Manage/dashboard/` | `apps/manage-dashboard/` | 更新 API base URL |
| `94Manage/miniapp/` | `apps/manage-miniapp/` | 更新 API base URL |
| `94inClass/backend/` | `apps/inclass-backend/` | 重構 schema → inclass_ 前綴 |
| `94inClass/dashboard/` | `apps/inclass-dashboard/` | 如有 dashboard 的話 |
| `94Stock/backend/` | `apps/stock-backend/` | 已用 stock_ 前綴 ✅ |
| `94Stock/frontend/` | `apps/stock-dashboard/` | 更新 API base URL |

---

## 五、執行計畫

### Phase 0：Monorepo 骨架 + GCP 環境 ⏱️ 1 天
- [ ] 初始化 `94CramManageSystem` monorepo（pnpm workspace + root config）
- [ ] 建立 `packages/shared` 骨架（db/auth/types）
- [ ] 建立 GCP Project `94cram-manage-system`
- [ ] 啟用 API（Cloud Run/SQL/Build/Artifact Registry/Secret Manager）
- [ ] 建立 Cloud SQL `94platform-db` → DB `94platform`
- [ ] 建立 Service Account + key
- [ ] 設定 Billing Alert（$5 USD/月）
- [ ] 建立 GitHub repo `superafat/94CramManageSystem`
- [ ] Push 初始骨架

### Phase 1：94Stock 搬入 + 上線 ⏱️ 1-2 天
- [ ] 複製 `94Stock/backend` → `apps/stock-backend`
- [ ] 複製 `94Stock/frontend` → `apps/stock-dashboard`
- [ ] stock schema 移至 `packages/shared/src/db/schema/stock.ts`
- [ ] 共用表（tenants/users）移至 common.ts
- [ ] 建立 Dockerfile（stock-backend + stock-dashboard）
- [ ] 建立 GitHub Actions `deploy-stock.yml`
- [ ] 部署 Cloud Run → 驗證

### Phase 2：94Manage 搬入 + 遷移 ⏱️ 2-3 天
- [ ] 複製 `94Manage/backend` → `apps/manage-backend`
- [ ] 複製 `94Manage/dashboard` → `apps/manage-dashboard`
- [ ] 複製 `94Manage/miniapp` → `apps/manage-miniapp`
- [ ] 重構 schema → manage_ 前綴 + import @94cram/shared
- [ ] 從舊 `94-ai-homework` pg_dump → 匯入新 DB
- [ ] 建立 GitHub Actions `deploy-manage.yml`
- [ ] 部署 → 驗證 → DNS 切換

### Phase 3：94inClass 搬入 + 遷移 ⏱️ 2-3 天
- [ ] 複製 `94inClass/backend` → `apps/inclass-backend`
- [ ] 複製 `94inClass/dashboard` → `apps/inclass-dashboard`
- [ ] 重構 schema → inclass_ 前綴 + import @94cram/shared
- [ ] 從舊 `cch-ai-homework` pg_dump → 匯入新 DB
- [ ] 部署 → 驗證 → 關閉舊 services

### Phase 4：SSO + 跨系統整合 ⏱️ 2-3 天
- [ ] 統一 JWT_SECRET + auth middleware
- [ ] 實作 /api/internal/* 跨服務 API
- [ ] 94Stock 改接真正的 94Manage API
- [ ] 94inClass 出勤資料回流 94Manage
- [ ] 各 dashboard sidebar 加跨系統連結

### Phase 5：94Portal 統一入口 ⏱️ 1-2 天
- [ ] 建立 `apps/portal`（Next.js）
- [ ] 系統圖標選擇器 + 登入頁
- [ ] 根據帳號權限顯示授權系統
- [ ] 部署到 Cloud Run
- [ ] 域名設定 `94cram.app`

### Phase 6：收尾 ⏱️ 1 天
- [ ] 舊 repo archive（94Manage / 94inClass / 94Stock）
- [ ] 關閉舊 GCP Projects（確認無誤後）
- [ ] 更新所有文件
- [ ] 端對端測試

---

## 六、Cloud Run 服務清單

| # | Service | Source (monorepo) | Port |
|---|---------|-------------------|------|
| 1 | `94manage-backend` | apps/manage-backend | 3100 |
| 2 | `94manage-dashboard` | apps/manage-dashboard | 3200 |
| 3 | `94inclass-backend` | apps/inclass-backend | 3102 |
| 4 | `94inclass-dashboard` | apps/inclass-dashboard | 3201 |
| 5 | `94stock-backend` | apps/stock-backend | 3101 |
| 6 | `94stock-dashboard` | apps/stock-dashboard | 3000 |
| 7 | `94portal` | apps/portal | 3000 |

---

## 七、成本預估

| 項目 | 月費 (USD) |
|------|-----------|
| Cloud SQL db-f1-micro（24h） | ~$7-9 |
| Cloud Run × 7 services | ~$0（免費層） |
| Artifact Registry | ~$0 |
| 域名 94cram.app | ~$1/月 |
| **總計** | **~$8-10/月** |

---

## 八、GitHub Actions CI/CD（path filter 範例）

```yaml
# .github/workflows/deploy-stock.yml
name: Deploy 94Stock
on:
  push:
    branches: [main]
    paths:
      - 'apps/stock-backend/**'
      - 'apps/stock-dashboard/**'
      - 'packages/shared/**'
jobs:
  deploy-backend:
    if: contains(github.event.commits[*].modified, 'apps/stock-backend/') || contains(github.event.commits[*].modified, 'packages/shared/')
    # ... build & deploy stock-backend
  deploy-dashboard:
    if: contains(github.event.commits[*].modified, 'apps/stock-dashboard/') || contains(github.event.commits[*].modified, 'packages/shared/')
    # ... build & deploy stock-dashboard
```

---

## 九、開發鐵律（DEV_RULES.md）

1. **開發寫 Code 只能用 MiniMax (M2.5)**，絕對禁止 Claude Sonnet/Opus
2. **規劃書先寫好，一個做好再做下一個**
3. **派工不自己做**（姜子牙規劃 → 子代理執行）
4. **改 openclaw.json**：備份→驗證→老闆確認→才重啟
5. **收費資源**：老闆授權才能用

---

**v3.0 規劃書完成。開始執行 Phase 0。**

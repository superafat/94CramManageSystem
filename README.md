# 94 教育生態系 (94CramManageSystem)

> 補習班統一管理平台 — 三系統合一

## 🏫 系統

| 系統 | 說明 | Port |
|------|------|------|
| 📚 94Manage | 學員管理、課程排班、繳費 | 3100/3200 |
| ✋ 94inClass | 上課點名、出勤統計 | 3102/3201 |
| 📦 94Stock | 教材庫存、進貨管理 | 3101/3000 |
| 🏫 94Portal | 統一入口 | 3300 |

## 📁 架構

```
94CramManageSystem/
├── apps/
│   ├── manage-backend/      ← Hono API (port 3100)
│   ├── manage-dashboard/    ← Next.js (port 3200)
│   ├── manage-miniapp/      ← Vite PWA
│   ├── inclass-backend/     ← Hono API (port 3102)
│   ├── inclass-dashboard/   ← Next.js (port 3201)
│   ├── stock-backend/       ← Hono API (port 3101)
│   ├── stock-dashboard/     ← Next.js (port 3000)
│   └── portal/              ← Next.js (port 3300)
├── packages/
│   ├── shared/              ← 共用 DB + Auth + Types
│   ├── manage-types/
│   ├── manage-errors/
│   └── manage-api-client/
└── .github/workflows/       ← CI/CD (per-app deploy)
```

## 🔐 SSO
登入一次，三系統通用。JWT 統一使用 `jose` library，Cookie domain `.94cram.app`。

## 🛠️ 技術棧
- **Backend**: Hono + Drizzle ORM + PostgreSQL
- **Frontend**: Next.js + Tailwind CSS
- **DB**: Cloud SQL PostgreSQL 15 (`platform94-db`)
- **Deploy**: Cloud Run × 8 services
- **CI/CD**: GitHub Actions (path-filtered)
- **Design**: 莫蘭迪色系 (Morandi palette)

## 🚀 開發

```bash
pnpm install
pnpm dev        # 啟動所有 apps
```

## 📋 域名
- `94cram.app` — Portal
- `manage.94cram.app` — 學員管理
- `inclass.94cram.app` — 點名系統
- `stock.94cram.app` — 庫存管理

---
© 2026 94cram.app

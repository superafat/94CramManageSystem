# 94CramManageSystem - Claude Code 專案設定

> 由姜子牙 (OpenClaw L1) 設定 @ 2026-02-24

## 系統概述

補習班管理生態系三合一 monorepo：

- **94Manage** — 學員管理（apps/manage-backend + apps/manage-dashboard）
- **94inClass** — 點名系統（apps/inclass-backend + apps/inclass-dashboard）
- **94Stock** — 庫存管理（apps/stock-backend + apps/stock-dashboard）
- **94Portal** — 統一入口（apps/portal）
- **94LineBot** — LINE Bot（apps/bot-gateway）

## 技術棧

- **Package Manager**: pnpm monorepo（>=8.0.0），不用 npm/yarn
- **Runtime**: Node.js >=20.0.0
- **Frontend**: Next.js + TypeScript + Tailwind CSS（莫蘭迪色系）
- **Backend**: Express + TypeScript
- **ORM**: Drizzle ORM（`drizzle-kit push` 同步 schema）
- **Database**: PostgreSQL on Google Cloud SQL
  - Host: 35.221.144.161（`platform94-db`）
  - Database: `94platform`
- **Auth**: JWT（jose library）+ 共用 users 表，SSO 三系統通用
- **Shared Package**: `@94cram/shared`（packages/shared）

## 部署環境

- **GCP Project**: `cram94-manage-system`
- **Billing Account**: `010ED6-0628BE-09B2D4`
- **Artifact Registry**: `cram94`（asia-east1）
- **Cloud Run**: `cram94-*` 前綴（⚠️ 不能數字開頭）
- **Domain**: `94cram.com`
- **SA**: `deploy94@cram94-manage-system.iam.gserviceaccount.com`
- **SA Key**: `~/gcp-sa-key.json`
- **GitHub**: `superafat/94CramManageSystem`（public monorepo）

## 🚨 開發鐵律

1. **Docker build** 必須加 `--platform linux/amd64`（本機是 Apple Silicon ARM）
2. **不得直接修改生產 DB**，先在本機驗證
3. **Cloud Run 命名**不能數字開頭，用 `cram94-` 前綴
4. **月預算限制 NT$300**（~$10 USD），任何新資源創建前先確認費用
5. **pnpm** 管理所有套件，不用 npm/yarn
6. **共用表**（tenants/users/branches/user_permissions）不隨意修改 schema
7. **前綴隔離**：manage_ / inclass_ / stock_ 各系統互不干擾

## Apps 端口對照

| App | Path | Port |
|-----|------|------|
| manage-backend | apps/manage-backend | 3100 |
| manage-dashboard | apps/manage-dashboard | 3200 |
| inclass-backend | apps/inclass-backend | 3102 |
| inclass-dashboard | apps/inclass-dashboard | 3201 |
| stock-backend | apps/stock-backend | 3101 |
| stock-dashboard | apps/stock-dashboard | 3000 |
| portal | apps/portal | 3300 |

## 常用指令

```bash
# 安裝依賴
pnpm install

# 全部 build
pnpm build

# 型別檢查
pnpm typecheck

# 同步 DB schema
pnpm --filter @94cram/shared drizzle-kit push

# Docker build（Cloud Run 用）
docker build --platform linux/amd64 -t [image-name] .
```

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction: update `.claude/lessons.md` with the pattern
- Write rules that prevent the same mistake
- Review lessons at session start

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Run `pnpm typecheck` — must be 0 errors before calling done
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: implement the elegant solution instead
- Skip this for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `.claude/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `.claude/todo.md`
6. **Capture Lessons**: Update `.claude/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **月預算 NT$300**: 任何新 Cloud 資源建立前先評估費用影響

## Packages

| Package | 用途 |
|---------|------|
| @94cram/shared | 共用 DB schema + JWT auth + types |
| @94cram/types | 94Manage 型別 |
| @94cram/errors | 94Manage 錯誤處理 |
| @94cram/api-client | 94Manage API client |

## DB Schema 分組

- **共用表（5）**: tenants, users, branches, user_permissions, [系統設定]
- **manage_ (5)**: 學員相關
- **inclass_ (4)**: 點名相關
- **stock_ (8)**: 庫存相關

# 94BOT Dashboard Design

> Date: 2026-03-06

## Overview

New `apps/bot-dashboard` — a Next.js frontend for tenant admins (館長/行政) to manage their AI LINE Bot (聞太師), view conversation records, manage parent bindings, and purchase LINE message quotas.

## Architecture

```
apps/bot-dashboard (Next.js, standalone)
  /api/* → rewrites() proxy to bot-gateway
  Auth: shared JWT (same as manage/inclass)
  Demo: same demo tenant interception pattern
  Theme: 莫蘭迪色系 Tailwind
```

Backend: existing `apps/bot-gateway` (Hono) — already has most APIs needed.

## Pages

```
/landing                    — Product landing page (SEO)
/login                      — Login (shared auth)
/demo                       — Demo experience

/dashboard                  — Overview (stats cards)
/dashboard/conversations    — Conversation records
/dashboard/bindings         — Parent binding management
/dashboard/line-bot         — 聞太師 settings
/dashboard/plans            — LINE message quota plans
```

## Sidebar

```
94BOT
├── 總覽              /dashboard
├── 對話紀錄           /dashboard/conversations
├── 綁定管理           /dashboard/bindings
├── 聞太師設定          /dashboard/line-bot
└── 方案加購           /dashboard/plans
```

## Page Details

### /dashboard — Overview

Four stat cards:
- 本月 AI 回覆數 (from bot_parent_conversations)
- 已綁定家長數 (from bot_parent_bindings)
- LINE Push 用量 / 額度 (from bot_usage + bot_subscriptions)
- 機器人狀態 on/off

### /dashboard/conversations — Conversation Records

- List: timestamp, parent name, message preview, bot reply, intent tag
- Filters: date range, parent name search, intent category
- Click to expand full conversation
- Data: Firestore `bot_parent_conversations` (API exists)

### /dashboard/bindings — Binding Management

Two sections:
- **Bound parents list**: parent name, linked children, bind time, unbind button
- **Invite code management**: generate new codes (per student), view history, used/expired status
- Data: existing `/api/parent-bindings` and `/api/parent-invites` APIs

### /dashboard/line-bot — 聞太師 Settings

- Bot on/off toggle (`parent_bot_active`)
- Custom welcome message
- AI reply tone setting (reserved for future)
- LINE Channel info (read-only)
- Data: existing `/api/settings` and `/api/subscriptions` APIs

### /dashboard/plans — LINE Message Quota Plans

#### Pricing Tiers

| Plan | AI Reply/mo | Push/mo | Monthly | Yearly (per mo) |
|------|------------|---------|---------|-----------------|
| 體驗版 | 100 | 50 | NT$299 | NT$249 |
| 標準版 | 500 | 200 | NT$599 | NT$499 |
| 專業版 | 2,000 | 1,000 | NT$999 | NT$849 |
| 旗艦版 | 5,000 | 3,000 | NT$1,899 | NT$1,599 |
| 企業版 | Unlimited | Unlimited | Contact us | Contact us |

#### Page Layout

1. **Usage dashboard** (top)
   - Two progress bars: AI reply usage + Push usage
   - Estimated depletion date
   - Over-quota warning

2. **Plan cards** (middle)
   - Current plan highlighted
   - Upgrade/downgrade buttons → NewebPay payment
   - Yearly discount badge

3. **Billing history** (bottom)
   - Payment history
   - Invoice download (e-invoice via NewebPay)
   - Next billing date

#### Over-quota Behavior
- Not hard-cut; delayed response + upgrade prompt
- Encourages natural upgrade

#### Payment Integration — NewebPay (藍新金流)

Supported methods:
- Credit card (recurring / one-time)
- ATM virtual account
- CVS (convenience store) payment

Flow: Select plan → NewebPay checkout → Callback confirm → Activate plan

#### Data Model

```typescript
// Firestore: bot_subscriptions
interface BotSubscription {
  tenant_id: string
  plan: 'trial' | 'standard' | 'pro' | 'flagship' | 'enterprise'
  ai_reply_limit: number
  push_limit: number
  billing_cycle: 'monthly' | 'yearly'
  payment_method: 'credit_card' | 'atm' | 'cvs'
  newebpay_merchant_id: string
  current_period_start: Date
  current_period_end: Date
  status: 'active' | 'cancelled' | 'past_due'
  auto_renew: boolean
}
```

## Demo Mode

- Demo account: boss (admin role)
- Mock data: 10 fake conversations, 5 fake bindings, usage 120/500
- Same demo tenant interception pattern as manage/inclass

## New Backend APIs Needed

bot-gateway additions:
- `GET /api/conversations` — list conversations (paginated, filterable)
- `GET /api/conversations/:id` — single conversation detail
- `GET /api/plans` — available plans
- `GET /api/billing` — billing history
- `POST /api/billing/checkout` — initiate NewebPay checkout
- `POST /api/billing/callback` — NewebPay payment callback

Existing APIs (no changes needed):
- `/api/auth/verify`
- `/api/subscriptions`
- `/api/settings`
- `/api/parent-bindings`
- `/api/parent-invites`
- `/api/usage`
- `/api/bindings`

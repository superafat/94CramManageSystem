# UX / Mobile Upgrade Design — 94Manage Dashboard

**Date:** 2026-03-06
**Approach:** Foundation-first (Approach A)
**Scope:** Full — Navigation, List pages, Modals, Dashboard, Visual consistency

---

## Background & Problem Statement

- 兩種行動端使用者：**館長/行政 (admin/staff)** 與 **教師 (teacher)**，需求不同
- 所有 E 點痛點均需解決：
  - 表格頁面手機橫向溢出
  - 彈窗在手機操作困難
  - MobileHeader 頁面標題不完整（多頁顯示「蜂神榜」）
  - 「更多」grid 操作不直覺

---

## Architecture Overview

```
行動端（< lg）
├── MobileHeader（頂部固定）
│   ├── [≡ 漢堡按鈕] → 開啟 MobileDrawer
│   ├── 頁面標題（usePageTitle hook）
│   └── 使用者名稱 + 下拉
├── MobileDrawer（左滑抽屜）
│   ├── 使用者身份卡片
│   ├── 完整 role-based 導覽（同 Sidebar）
│   └── 登出按鈕
└── 主內容（無底部 Tab）

桌面（≥ lg）── 完全不動
└── Sidebar（維持現狀）
```

**刪除元件：** `MobileNav.tsx`（底部 Tab）
**改造元件：** `MobileHeader.tsx`（加漢堡按鈕）
**新增元件：** `MobileDrawer.tsx`
**改造元件：** `AppLayout.tsx`（移除 MobileNav）

---

## Section 1: Navigation Infrastructure

### `nav-items.ts`（新）
提取共用導覽定義，Sidebar 與 MobileDrawer 共同 import：

```typescript
// src/components/layout/nav-items.ts
export const navItems: NavItem[] = [
  { href: '/dashboard', icon: '📊', label: '總覽', roles: [...] },
  // ...全部項目
]
```

### `MobileDrawer.tsx`（新）
- 從左側滑入（`translate-x` transition）
- 寬度：`w-72`（288px），最大 80vw
- 背景半透明 overlay，點擊關閉
- 路由切換後自動關閉（`usePathname` effect）
- 內容與 Sidebar 一致，role-based 過濾

### `usePageTitle.ts`（新 hook）
完整補齊所有路由標題：
```typescript
const pageTitles: Record<string, string> = {
  '/dashboard': '行政總覽',
  '/students': '學生管理',
  '/finance': '帳務管理',
  '/reports': '報表中心',
  '/enrollment': '招生管理',
  '/teachers': '講師名單',
  '/scheduling-center': '排課中心',
  '/teacher-attendance': '師資出缺勤',
  '/salary': '薪資管理',
  '/my-salary': '我的薪資條',
  '/dashboard/settings': '系統設定',
  '/dashboard/audit': '異動日誌',
  '/dashboard/analytics': '數據分析',
  '/headquarters': '總部管理',
  // 動態路由：以前綴匹配
}
```

### `MobileHeader.tsx`（改造）
- 左側加漢堡 icon 按鈕（SVG，三橫線），點擊 toggle Drawer
- 頁面標題改用 `usePageTitle()`
- 使用者下拉維持現狀

### `AppLayout.tsx`（改造）
- 移除 `<MobileNav />` 渲染
- 加入 `<MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />`
- `pb-20 lg:pb-0` → `pb-4 lg:pb-0`（移除底部 nav 的 padding）

---

## Section 2: Shared Component Layer

### `BottomSheet.tsx`（新）
行動端 Modal 替代方案：

```typescript
interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}
```

行為：
- 從底部滑入（`translate-y-full → translate-y-0`，300ms ease-out）
- 頂部 drag handle（可視化把手）
- 內容區 `overflow-y-auto`，最大高度 `90vh`
- 點擊背景關閉
- `body` overflow hidden 防背景捲動

桌面端：透過 `useIsMobile()` hook 決定渲染方式；桌面維持原有 `fixed inset-0` Modal。

### `useIsMobile.ts`（新 hook）
```typescript
export function useIsMobile(breakpoint = 1024) {
  // SSR-safe，監聽 resize
}
```

---

## Section 3: Page-Level Changes

### 列表頁行動化（表格 → 卡片）

適用：`/students`、`/teachers`、`/teacher-attendance`

Pattern：
```tsx
{/* 桌面表格 */}
<div className="hidden sm:block">
  <table>...</table>
</div>

{/* 手機卡片 */}
<div className="sm:hidden space-y-3">
  {items.map(item => <XxxCard key={item.id} item={item} onEdit={...} />)}
</div>
```

**StudentCard** 欄位：
- 姓名（大）+ 年級 badge + 狀態 badge
- 在讀課程（折疊，展開顯示）
- 操作：編輯（右側 icon button，44px touch target）

**TeacherCard** 欄位：
- 姓名 + 科目 badge
- 電話/信箱（可點擊）
- 操作：編輯、薪資

### 彈窗行動化（Modal → BottomSheet）

`CreateScheduleModal` 與 `EditScheduleModal`：
- 手機：`BottomSheet` + 步驟分頁
  - Step 1：課程基本資訊（課程、日期、時間、教室、老師）
  - Step 2：學生選擇（StudentPicker）
- 桌面：維持現有 `max-w-3xl` Modal

步驟導覽：上方進度條 `Step 1/2`，「下一步」/「上一步」/「完成」按鈕。

### Dashboard 快速行動區塊

首頁 `StatCard` 區下方新增 Quick Actions：

```tsx
// admin/staff 看到：
<QuickActions items={[
  { label: '今日課表', href: '/scheduling-center', badge: todayCount },
  { label: '待收款', href: '/finance', badge: unpaidCount },
  { label: '新增學生', action: 'openAddStudent' },
]} />

// teacher 看到：
<QuickActions items={[
  { label: '今日我的課', href: '/scheduling-center' },
  { label: '薪資條', href: '/my-salary' },
]} />
```

### 視覺一致性

`globals.css` 補充（不破壞現有 token）：
```css
/* 觸控最小尺寸（用於按鈕 min-h/min-w） */
--touch-target: 44px;

/* 卡片陰影 */
--shadow-card: 0 1px 3px rgba(90, 85, 80, 0.08), 0 1px 2px rgba(90, 85, 80, 0.04);

/* 統一頁面標題字號 */
/* 使用 text-lg font-semibold text-text（已有，補文件） */
```

按鈕觸控優化（補全現有 Button 元件）：
- 行動端所有 icon-only 按鈕加 `min-w-[44px] min-h-[44px]`
- 表單 input `py-2.5`（稍增，觸控友善）

---

## File Change Summary

| 檔案 | 操作 |
|------|------|
| `src/components/layout/nav-items.ts` | 新增 |
| `src/components/layout/MobileDrawer.tsx` | 新增 |
| `src/components/layout/MobileHeader.tsx` | 改造（加漢堡 + usePageTitle） |
| `src/components/layout/MobileNav.tsx` | 刪除 |
| `src/components/layout/AppLayout.tsx` | 改造（換 Drawer，移 Nav） |
| `src/components/layout/Sidebar.tsx` | 改造（import nav-items） |
| `src/hooks/usePageTitle.ts` | 新增 |
| `src/hooks/useIsMobile.ts` | 新增 |
| `src/components/ui/BottomSheet.tsx` | 新增 |
| `src/app/students/page.tsx` | 改造（加卡片模式） |
| `src/app/teachers/page.tsx` | 改造（加卡片模式） |
| `src/app/teacher-attendance/page.tsx` | 改造（加卡片模式） |
| `src/app/scheduling-center/components/CreateScheduleModal.tsx` | 改造（BottomSheet + steps） |
| `src/app/scheduling-center/components/EditScheduleModal.tsx` | 改造（BottomSheet + steps） |
| `src/app/dashboard/page.tsx` | 改造（Quick Actions） |
| `src/app/globals.css` | 補充 tokens |

---

## Constraints

- 桌面端（≥ lg）任何頁面均不改動
- 權限邏輯（role-based filtering）完全不變
- 現有 API、後端邏輯均不影響
- 莫蘭迪色系維持，不引入新顏色

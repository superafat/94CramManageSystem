# 排課中心 / 年級自動計算 / 出缺勤補課 設計文件

> 日期：2026-03-05
> 狀態：已確認，待實作

## 概述

三階段功能優化，涵蓋學生管理、排課中心、出缺勤三個模組。

---

## Phase 1 — 學生年級自動計算

### 問題

目前學生年級需手動從下拉選單選擇，容易出錯且每學年需人工更新。

### 設計

**前端變更（students/page.tsx）**：
- 移除年級下拉選單，改為根據生日自動顯示計算年級
- 新增「校正」按鈕，點擊展開 ±2 年範圍下拉選單供手動覆寫
- 已覆寫的學生顯示「已手動校正」標籤
- 顯示邏輯：`grade_override ?? computeGrade(date_of_birth)`

**資料模型**：
- `manage_students` 新增 `grade_override` 欄位（varchar, nullable）
- 有值時覆蓋自動計算結果

**後端變更**：
- PUT `/api/students/:id` 接受 `grade_override` 參數
- GET 回傳 `date_of_birth` + `grade_override`

**computeGrade 修正**：
- 台灣學制以 9/1 為分界
- 正確對應：大班、小一～小六、國一～國三、高一～高三

---

## Phase 2 — 排課中心功能優化

### 2A. 新增排課彈窗加入學生選擇

**問題**：新增排課無法同時將學生加入班級。

**設計**：
- 新增排課 Modal 最後一步加入「學生名單」區塊
- 複用 RosterModal 的學生選擇邏輯，內嵌為表單區塊
- 團班/安親：多選學生，顯示已選人數
- 個指：單選學生
- 選填，可先建課再加人
- 儲存時：`POST /api/w8/schedules` + `POST /api/w8/schedules/:id/students`

### 2B. 編輯排課 Modal

**問題**：現有 DetailDrawer 為唯讀，無法編輯。

**設計**：
- 新增 `EditScheduleModal`，從 DetailDrawer「編輯」按鈕開啟
- 欄位與新增 Modal 相同：課程名稱、老師、教室、時段、學生名單
- 額外顯示：建立日期、最後修改日期
- 學生名單區塊內嵌 StudentPicker（可增刪學生）
- 呼叫 `PUT /api/w8/schedules/:id`

### 2C. 補課排程 + 計費整合

**問題**：補課只能從「補課管理」操作，排課中心無法安排。

**設計**：
- DetailDrawer 新增「安排補課」按鈕
- 開啟 `MakeupScheduleModal`：選日期、時段、老師、教室
- 「是否收費」開關（預設關閉）
  - 開啟：顯示費用欄位，預填 `fee_per_session`，可手動修改
  - 關閉：不產生帳務記錄
- 儲存：寫入 `manage_makeup_classes`，收費時同步寫入帳務

---

## Phase 3 — 出缺勤安排補課

### 問題

出缺勤頁面標記缺席/請假後，要跳到補課管理另外操作，流程斷裂。

### 設計

- 缺席/請假學生行右側新增「安排補課」按鈕
- 開啟共用 `MakeupScheduleModal`（與 Phase 2C 同元件）
- 自動帶入：學生姓名、原課程、缺席日期
- 操作者填入：補課日期、時段、老師、教室
- 「是否收費」開關，邏輯與 Phase 2C 一致
- 儲存後出缺勤記錄標記「已安排補課」

---

## 共用元件

| 元件 | 用途 | 使用位置 |
|------|------|----------|
| `StudentPicker` | 學生搜尋 + 選擇（從 RosterModal 抽出） | 新增排課、編輯排課 |
| `ScheduleForm` | 排課表單欄位組件 | 新增排課、編輯排課 |
| `MakeupScheduleModal` | 補課排程 + 計費彈窗 | 排課中心 DetailDrawer、出缺勤頁面 |

## 實作優先順序

P1 → P2A → P2B → P2C → P3（循序漸進，每階段可獨立交付）

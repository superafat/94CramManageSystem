# 三大突破性功能設計文件

> 日期：2026-03-07
> 狀態：已確認，待實作

---

## 總覽

將三大突破性功能加入 94CramManageSystem 四個網站系統，並更新各系統首頁。

| 突破性功能 | 歸屬系統 | 定位 |
|-----------|---------|------|
| 即時課堂互動引擎 | 94inClass | 從管理工具升級為教學平台 |
| LINE Bot AI 助教（神算子） | 94BOT | 學生端 24hr AI 家教 |
| 經營智慧中樞 | 94Manage | CEO 駕駛艙，數據驅動決策 |

另含 Phase 0：串接 bot-gateway `proactive-notifications.ts` 的推播管道。

---

## Phase 0：串接推播（1-2 天）

### 目標
將 `bot-gateway/src/scheduler/proactive-notifications.ts` 中的 6 個排程任務從 `console.log` 模擬改為實際推播。

### 串接對照

| 排程任務 | 推播管道 | 串接方式 |
|---------|---------|---------|
| 每日繳費提醒（管理端） | Telegram 千里眼 | `dispatchTextNotification` -> `telegram.ts` sendMessage |
| 每週繳費提醒（家長端） | LINE 順風耳 | `dispatchFlexNotification` -> `line.ts` push API + `billingCard` Flex 模板 |
| AI 課程推薦推播 | LINE 順風耳 | `dispatchFlexNotification` -> `recommendationCarousel` 模板 |
| 聯絡簿推播 | LINE 順風耳 | internal API `/contact-book/pending-push` -> mark pushed |
| 出勤異常通知 | LINE 順風耳 | 連續 2 天缺席或月出勤率 < 70% 時自動通知 |
| 月度學習報告 | LINE 順風耳 | 每月 1 日彙整學習摘要推送（新增） |

---

## Phase 1：94BOT — LINE Bot AI 助教「神算子」（1-2 週）

### 後端（bot-gateway）

#### AI Engine 擴展
- 新增第三個 Bot 角色 `student`（神算子）
- System Prompt：「你是補習班的 AI 助教，根據課程知識庫回答學生的課業問題。回答清楚易懂，適合國中/高中程度。不確定時誠實說不知道。」
- 知識來源：現有 `knowledge-base.ts` (Firestore) + 該租戶的課程資料
- 老師可在 bot-dashboard 設定「允許回答的科目」

#### 新增意圖路由

| Intent | 觸發 | 行為 |
|--------|------|------|
| `student.ask_question` | 學生問課業問題 | RAG 搜尋知識庫 -> Gemini 生成回答 |
| `student.weakness` | 「我哪裡比較弱」 | 從 inclass_exam_scores + ai_analysis 彙整弱點報告 |
| `student.homework_help` | 拍照傳作業 | Gemini Vision 辨識題目 -> 提供解題思路（不直接給答案） |
| `student.schedule` | 「我的課表」 | 查 inclass_schedules 回傳本週課表 |
| `student.grades` | 「我的成績」 | 查 inclass_exam_scores 回傳最近成績 |

#### Webhook 入口
- `POST /webhook/telegram-student` — 學生端 Telegram Bot
- LINE 複用現有 `/webhook/line`，在 `platform-adapter.ts` 依 channel binding role 區分

#### 學生綁定流程
- 復用 `parent-invites.ts` 模式 -> 新增 `student-invites.ts`
- 學生掃 QR Code / 輸入邀請碼 -> 綁定到 tenant + student record
- 存 `user_channel_bindings` 加 `role: 'student'`

#### Firestore 新增模組
- `student-bindings.ts` — 學生綁定記錄
- `student-invites.ts` — 學生邀請碼
- `ai-tutor-settings.ts` — AI 助教設定（允許科目、回答風格、每日額度）

### 前端（bot-dashboard）

#### 新增頁面
| 路徑 | 用途 |
|------|------|
| `/dashboard/ai-tutor` | 神算子 AI 助教管理主頁 |
| `/dashboard/ai-tutor/settings` | 設定允許科目、回答風格、每日額度 |
| `/dashboard/ai-tutor/conversations` | 查看學生問答紀錄 |
| `/dashboard/ai-tutor/analytics` | 使用分析（熱門問題、問答量趨勢） |
| `/dashboard/ai-tutor/invites` | 學生邀請碼管理 |

#### 首頁更新
- 新增 FeatureCard：AI 課業助教 — 神算子
- 新增 FeatureCard：拍照解題
- 整合流程圖加入學生端
- 價格方案加入學生問答額度

---

## Phase 2：94Manage — 經營智慧中樞（2-3 週）

### 後端（manage-backend）

#### 新增 Schema

**manage_student_learning_profiles**
- id, tenantId, branchId, studentId
- attendanceRate30d — 近30天出勤率
- avgScoreTrend — 成績趨勢 (improving/stable/declining)
- latestAvgScore — 最近平均分
- paymentStatus — paid/partial/overdue
- contactBookReadRate — 聯絡簿已讀率
- churnRiskScore — 流失風險分
- renewalProbability — 續班機率 0-100%
- aiSummary — Gemini 生成的學生全貌摘要
- updatedAt

**manage_teacher_performance**
- id, tenantId, teacherId, period (monthly/quarterly)
- periodStart, periodEnd
- studentProgressRate — 學生成績進步率 (30%)
- classAttendanceRate — 班級出勤率 (20%)
- parentSatisfaction — 家長滿意度 (25%)
- studentRetentionRate — 學生續班率 (15%)
- teacherAttendanceRate — 教師出勤率 (10%)
- overallScore — 綜合績效分數
- updatedAt

**manage_revenue_forecasts**
- id, tenantId, branchId
- forecastMonth — 預測月份
- expectedRevenue — 預期營收
- churnAdjustment — 流失扣減
- seasonalFactor — 季節係數
- confidence — 信心度 0-100%
- createdAt

#### 新增路由 `src/routes/admin/intelligence.ts`

| 端點 | 用途 |
|------|------|
| GET /intelligence/dashboard | 經營智慧中樞主儀表板 |
| GET /intelligence/learning-profiles | 學生學習軌跡列表 |
| GET /intelligence/learning-profiles/:studentId | 單一學生全貌 |
| POST /intelligence/learning-profiles/refresh | 手動觸發聚合更新 |
| GET /intelligence/renewal-predictions | 續班率預測列表 |
| GET /intelligence/renewal-predictions/summary | 預測摘要 |
| GET /intelligence/teacher-performance | 教師績效排行 |
| GET /intelligence/teacher-performance/:teacherId | 單一教師績效 |
| GET /intelligence/revenue-forecast | 未來 3 個月營收預測 |
| GET /intelligence/health-score | 經營健康分數 |

#### 服務層 `src/services/intelligence.ts`

1. **學習軌跡聚合** — 跨系統查詢 inclass internal API，彙整到 learning_profiles
2. **續班率預測** — 擴展 churn-v2，加入 endDate 到期 + 出勤/成績趨勢
3. **教師績效計算** — SQL 聚合五項指標加權
4. **營收預測** — active enrollments x 費用 - 流失扣減 + 季節係數
5. **健康分數** — 綜合 KPI 加權（營收 25%、續班 25%、出勤 20%、滿意度 15%、教師 15%）

#### 排程任務
- 每日 03:00 — 更新 learning profiles
- 每週一 04:00 — 更新 teacher performance
- 每月 1 日 05:00 — 更新 revenue forecast

### 前端（manage-dashboard）

#### 新增頁面
| 路徑 | 用途 |
|------|------|
| /intelligence | 經營智慧中樞主頁（CEO 駕駛艙） |
| /intelligence/students | 學生學習軌跡總覽 |
| /intelligence/students/[id] | 單一學生全貌（雷達圖+時間軸） |
| /intelligence/renewal | 續班預測儀表板 |
| /intelligence/teachers | 教師績效排行 |
| /intelligence/revenue | 營收預測 |

#### 首頁更新
- 新增 FeatureCard：經營智慧中樞
- 更新 AI 分析卡片描述
- AI 版價格方案加入智慧中樞功能
- 比較表新增續班預測、經營智慧中樞兩行

---

## Phase 3：94inClass — 即時課堂互動（2-4 週）

### 後端（inclass-backend）

#### 新增 Schema

**inclass_classroom_sessions**
- id, tenantId, scheduleId, teacherId, courseId
- sessionDate, status (active/ended)
- createdAt, endedAt

**inclass_classroom_activities**
- id, tenantId, sessionId
- type (poll/quiz/random_pick/rush_answer)
- question, options (jsonb)
- correctAnswer — quiz 用
- results (jsonb) — 作答結果統計
- winnerId — 搶答/抽問的學生
- status (active/closed)
- createdAt, closedAt

**inclass_student_responses**
- id, tenantId, activityId, studentId
- answer, responseTime (ms) — 搶答用
- isCorrect
- createdAt

#### 新增路由 `src/routes/classroom.ts`

| 端點 | 用途 |
|------|------|
| POST /classroom/session/start | 教師開始 session |
| POST /classroom/session/end | 結束 session |
| GET /classroom/session/:id | 取得 session 狀態 |
| POST /classroom/activity | 建立活動 |
| POST /classroom/activity/:id/close | 關閉活動 |
| POST /classroom/activity/:id/respond | 學生提交回答 |
| GET /classroom/activity/:id/results | 取得即時結果 |
| GET /classroom/session/:id/activities | session 活動歷史 |

#### 即時通訊：SSE (Server-Sent Events)

| SSE 端點 | 用途 |
|---------|------|
| GET /classroom/session/:id/stream | 學生端訂閱 |
| GET /classroom/session/:id/teacher-stream | 教師端訂閱 |

選 SSE 而非 WebSocket 的原因：
- Cloud Run 對 SSE 支援更好（普通 HTTP 連線）
- 單向推送足夠，學生回答用 POST
- 不需要 `--session-affinity`

### 前端（inclass-dashboard）

#### 新增頁面
| 路徑 | 用途 |
|------|------|
| /classroom | 教師選擇課程/班級開始互動 |
| /classroom/[sessionId] | 教師互動控制台 |
| /classroom/student | 學生加入頁面（QR Code / session code） |
| /classroom/student/[sessionId] | 學生作答介面 |

#### 首頁更新
- 新增 FeatureCard：即時課堂互動
- 整合區塊 inClass 項目加入「即時課堂互動」

---

## 94Stock 首頁更新

- 修改「系統整合」卡片描述：提及與經營智慧中樞整合
- 新增 FeatureCard：智慧經營整合

---

## 實作優先序

```
Phase 0（1-2 天）：串接推播
Phase 1（1-2 週）：94BOT AI 助教
Phase 2（2-3 週）：94Manage 經營智慧中樞
Phase 3（2-4 週）：94inClass 即時課堂互動
每個 Phase 同步更新對應首頁
```

## 預算影響估算（月預算 NT$2,000 內）

| 項目 | 月增成本 |
|------|---------|
| Gemini API（AI 助教 + 智慧中樞） | NT$150-350 |
| SSE 連線（課堂互動） | NT$200-500 |
| LINE Push 超額 | 補習班自付 |
| 總計 | NT$350-850 |

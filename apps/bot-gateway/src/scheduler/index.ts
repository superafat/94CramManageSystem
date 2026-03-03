/**
 * 排程系統進入點
 *
 * 匯出 initScheduler 供 bot-gateway 啟動時呼叫，
 * 以及 scheduleAIRecommendationPush 供外部事件（如聯絡簿發送 webhook）直接觸發。
 */

export {
  initScheduler,
  clearAllSchedulers,
  scheduleDailyBillingReminder,
  scheduleWeeklyParentBillingReminder,
  scheduleAIRecommendationPush,
} from './proactive-notifications';

export type {
  ContactBookData,
  UnpaidStudent,
  TenantAdminContact,
  WeakSubjectAnalysis,
} from './proactive-notifications';

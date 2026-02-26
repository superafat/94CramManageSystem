// 蜂神榜 AI 補習班助手系統 Dashboard — Mock Data (Phase 2)
// 所有資料為假資料，API 尚未建立（Phase 3）

// ============================================================
// 千里眼 (Admin Bot) — @cram94_bot
// ============================================================

export interface BindingCode {
  code: string;
  status: 'pending' | 'used' | 'expired';
  createdAt: string;
  usedBy: string | null;
}

export interface BoundUser {
  telegramUsername: string;
  role: string;
  boundAt: string;
  lastActiveAt: string;
}

export const adminBotStatus = {
  enabled: true,
  boundUsers: 8,
  todayOperations: 42,
};

export const bindingCodes: BindingCode[] = [
  { code: '482916', status: 'used', createdAt: '2026-02-25 09:15', usedBy: '王老師' },
  { code: '731054', status: 'expired', createdAt: '2026-02-24 14:30', usedBy: null },
  { code: '295837', status: 'used', createdAt: '2026-02-24 10:00', usedBy: '陳主任' },
  { code: '618402', status: 'pending', createdAt: '2026-02-25 11:20', usedBy: null },
  { code: '547293', status: 'used', createdAt: '2026-02-23 16:45', usedBy: '李助教' },
];

export const boundUsers: BoundUser[] = [
  { telegramUsername: '@wang_teacher', role: '管理員', boundAt: '2026-01-15', lastActiveAt: '2026-02-25 10:30' },
  { telegramUsername: '@chen_director', role: '管理員', boundAt: '2026-01-16', lastActiveAt: '2026-02-25 09:15' },
  { telegramUsername: '@li_assistant', role: '教師', boundAt: '2026-01-20', lastActiveAt: '2026-02-24 18:00' },
  { telegramUsername: '@zhang_math', role: '教師', boundAt: '2026-02-01', lastActiveAt: '2026-02-25 08:45' },
  { telegramUsername: '@liu_english', role: '教師', boundAt: '2026-02-05', lastActiveAt: '2026-02-23 14:20' },
  { telegramUsername: '@huang_admin', role: '行政', boundAt: '2026-02-10', lastActiveAt: '2026-02-25 11:00' },
  { telegramUsername: '@wu_science', role: '教師', boundAt: '2026-02-12', lastActiveAt: '2026-02-24 16:30' },
  { telegramUsername: '@lin_reception', role: '櫃台', boundAt: '2026-02-18', lastActiveAt: '2026-02-25 10:00' },
];

export const moduleToggles = {
  manage: true,
  inclass: true,
  stock: false,
};

// ============================================================
// 順風耳 (Parent Bot) — @Cram94_VIP_bot
// ============================================================

export interface InvitationCode {
  code: string;
  studentName: string;
  status: 'pending' | 'used' | 'expired';
  createdAt: string;
}

export interface BoundParent {
  telegramUsername: string;
  studentName: string;
  boundAt: string;
}

export const parentBotStatus = {
  enabled: true,
  invitedParents: 35,
  boundParents: 23,
};

export const invitationCodes: InvitationCode[] = [
  { code: 'P-38271', studentName: '王小明', status: 'used', createdAt: '2026-02-24 09:00' },
  { code: 'P-94510', studentName: '陳美玲', status: 'pending', createdAt: '2026-02-25 10:30' },
  { code: 'P-62038', studentName: '林志豪', status: 'expired', createdAt: '2026-02-22 14:00' },
  { code: 'P-17493', studentName: '張雅婷', status: 'used', createdAt: '2026-02-23 11:15' },
  { code: 'P-85624', studentName: '黃俊傑', status: 'pending', createdAt: '2026-02-25 08:45' },
  { code: 'P-40189', studentName: '李宜庭', status: 'used', createdAt: '2026-02-21 16:00' },
];

export const boundParents: BoundParent[] = [
  { telegramUsername: '@wang_mama', studentName: '王小明', boundAt: '2026-02-01' },
  { telegramUsername: '@chen_papa', studentName: '陳美玲', boundAt: '2026-02-03' },
  { telegramUsername: '@zhang_parent', studentName: '張雅婷', boundAt: '2026-02-05' },
  { telegramUsername: '@li_mama', studentName: '李宜庭', boundAt: '2026-02-08' },
  { telegramUsername: '@wu_papa', studentName: '吳柏翰', boundAt: '2026-02-10' },
  { telegramUsername: '@hong_parent', studentName: '洪瑋琪', boundAt: '2026-02-11' },
  { telegramUsername: '@xu_mama', studentName: '許家豪', boundAt: '2026-02-13' },
  { telegramUsername: '@yang_papa', studentName: '楊詩涵', boundAt: '2026-02-14' },
];

export const parentNotificationSettings = {
  arrival: true,
  departure: true,
  gradeUpdate: false,
  paymentReminder: true,
};

// ============================================================
// 用量統計 (Usage)
// ============================================================

export interface DailyUsage {
  date: string;
  aiCalls: number;
  apiCalls: number;
}

export interface OperationLog {
  time: string;
  user: string;
  intent: string;
  status: 'success' | 'failed';
}

export const usageSummary = {
  aiCalls: 342,
  aiCallsLimit: 500,
  apiCalls: 1580,
  successRate: 96.8,
  activeUsers: 12,
};

// 過去 30 天的每日用量
export const dailyUsage: DailyUsage[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 25 - (29 - i));
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const base = isWeekend ? 4 : 10;
  return {
    date: `${mm}/${dd}`,
    aiCalls: base + Math.floor(Math.random() * 8),
    apiCalls: (base + Math.floor(Math.random() * 8)) * 4,
  };
});

// 固定種子的 mock — 避免 hydration mismatch
export const dailyUsageFixed: DailyUsage[] = [
  { date: '01/27', aiCalls: 5, apiCalls: 20 },
  { date: '01/28', aiCalls: 12, apiCalls: 48 },
  { date: '01/29', aiCalls: 14, apiCalls: 52 },
  { date: '01/30', aiCalls: 11, apiCalls: 44 },
  { date: '01/31', aiCalls: 6, apiCalls: 24 },
  { date: '02/01', aiCalls: 4, apiCalls: 16 },
  { date: '02/02', aiCalls: 13, apiCalls: 56 },
  { date: '02/03', aiCalls: 15, apiCalls: 60 },
  { date: '02/04', aiCalls: 10, apiCalls: 40 },
  { date: '02/05', aiCalls: 12, apiCalls: 48 },
  { date: '02/06', aiCalls: 8, apiCalls: 32 },
  { date: '02/07', aiCalls: 5, apiCalls: 20 },
  { date: '02/08', aiCalls: 3, apiCalls: 12 },
  { date: '02/09', aiCalls: 14, apiCalls: 56 },
  { date: '02/10', aiCalls: 16, apiCalls: 64 },
  { date: '02/11', aiCalls: 11, apiCalls: 44 },
  { date: '02/12', aiCalls: 13, apiCalls: 52 },
  { date: '02/13', aiCalls: 9, apiCalls: 36 },
  { date: '02/14', aiCalls: 7, apiCalls: 28 },
  { date: '02/15', aiCalls: 4, apiCalls: 16 },
  { date: '02/16', aiCalls: 15, apiCalls: 60 },
  { date: '02/17', aiCalls: 17, apiCalls: 68 },
  { date: '02/18', aiCalls: 12, apiCalls: 48 },
  { date: '02/19', aiCalls: 14, apiCalls: 56 },
  { date: '02/20', aiCalls: 10, apiCalls: 40 },
  { date: '02/21', aiCalls: 6, apiCalls: 24 },
  { date: '02/22', aiCalls: 5, apiCalls: 20 },
  { date: '02/23', aiCalls: 13, apiCalls: 52 },
  { date: '02/24', aiCalls: 11, apiCalls: 44 },
  { date: '02/25', aiCalls: 8, apiCalls: 32 },
];

export const operationLogs: OperationLog[] = [
  { time: '2026-02-25 11:20', user: '王老師', intent: '查詢學生出席紀錄', status: 'success' },
  { time: '2026-02-25 11:15', user: '陳主任', intent: '匯出本月繳費報表', status: 'success' },
  { time: '2026-02-25 11:00', user: '黃行政', intent: '查詢庫存數量', status: 'success' },
  { time: '2026-02-25 10:45', user: '李助教', intent: '新增學生資料', status: 'success' },
  { time: '2026-02-25 10:30', user: '王老師', intent: '點名作業', status: 'success' },
  { time: '2026-02-25 10:15', user: '張老師', intent: '查詢班級成績', status: 'failed' },
  { time: '2026-02-25 10:00', user: '林櫃台', intent: '登記繳費', status: 'success' },
  { time: '2026-02-25 09:45', user: '劉老師', intent: '請假登記', status: 'success' },
  { time: '2026-02-25 09:30', user: '陳主任', intent: '查看今日出席', status: 'success' },
  { time: '2026-02-25 09:15', user: '王老師', intent: '發送家長通知', status: 'success' },
  { time: '2026-02-24 18:00', user: '李助教', intent: '查詢補課時間', status: 'success' },
  { time: '2026-02-24 17:30', user: '黃行政', intent: '盤點庫存', status: 'success' },
  { time: '2026-02-24 17:00', user: '王老師', intent: '更新學生成績', status: 'failed' },
  { time: '2026-02-24 16:30', user: '吳老師', intent: '查詢教室安排', status: 'success' },
  { time: '2026-02-24 16:00', user: '林櫃台', intent: '查詢學費餘額', status: 'success' },
  { time: '2026-02-24 15:30', user: '張老師', intent: '登記補考成績', status: 'success' },
  { time: '2026-02-24 15:00', user: '陳主任', intent: '查看月報表', status: 'success' },
  { time: '2026-02-24 14:30', user: '李助教', intent: '新增課程排程', status: 'success' },
  { time: '2026-02-24 14:00', user: '王老師', intent: '查詢學生聯繫方式', status: 'success' },
  { time: '2026-02-24 13:30', user: '黃行政', intent: '申請採購教材', status: 'success' },
];

// ============================================================
// 設定 (Settings)
// ============================================================

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanInfo {
  tier: PlanTier;
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

export const currentPlan: PlanTier = 'basic';

export const plans: PlanInfo[] = [
  {
    tier: 'free',
    name: '免費體驗',
    price: 'NT$0/月',
    features: ['千里眼 Bot 基本功能', '每月 50 次 AI Calls', '最多 3 位管理員', '社群支援'],
  },
  {
    tier: 'basic',
    name: '基礎方案',
    price: 'NT$299/月',
    features: ['千里眼 Bot 全功能', '每月 500 次 AI Calls', '最多 10 位管理員', '信箱客服支援', '操作紀錄保留 30 天'],
    highlighted: true,
  },
  {
    tier: 'pro',
    name: '專業方案',
    price: 'NT$799/月',
    features: ['千里眼 + 順風耳 Bot', '每月 2000 次 AI Calls', '無限管理員', '優先客服支援', '操作紀錄保留 90 天', 'Webhook 整合', '自訂通知模板'],
  },
  {
    tier: 'enterprise',
    name: '企業方案',
    price: '聯繫我們',
    features: ['所有專業方案功能', '無限 AI Calls', '專屬客服經理', '操作紀錄永久保留', 'API 存取', 'SLA 保證', '客製化開發'],
  },
];

export const webhookSettings = {
  url: '',
  events: {
    operationComplete: false,
    dailySummary: false,
    anomalyAlert: false,
  },
};

export const notificationPreferences = {
  email: true,
  telegram: true,
};

// ============================================================
// 共用：學生清單（順風耳邀請碼用）
// ============================================================

export const studentList = [
  '王小明', '陳美玲', '林志豪', '張雅婷', '黃俊傑',
  '李宜庭', '吳柏翰', '洪瑋琪', '許家豪', '楊詩涵',
  '劉怡君', '蔡承翰', '鄭佳蓉', '謝宗翰', '郭雅琪',
];

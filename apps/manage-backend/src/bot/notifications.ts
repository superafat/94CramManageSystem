// src/bot/notifications.ts - 通知系統
import { Bot } from 'grammy';
import schedule from 'node-schedule';
import { logger } from '../utils/logger'

// ==================== 類型定義 ====================

interface Lead {
  id: number;
  name: string;
  phone: string;
  student_name: string;
  student_grade: string;
  interest_subjects: string;
  status: 'new' | 'contacted' | 'trial_scheduled' | 'trial_completed' | 'enrolled' | 'lost';
  follow_up_date?: string;
  trial_date?: string;
  trial_time?: string;
  created_at: string;
}

interface ConversionStats {
  newLeads: number;
  trialScheduled: number;
  trialCompleted: number;
  enrolled: number;
  conversionRate: number;
}

// ==================== 配置 ====================

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_ID || ''; // 教室長的 Telegram ID
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3100';

// ==================== 通知函式 ====================

/**
 * 發送新 Lead 通知給教室長
 */
export async function notifyNewLead(bot: Telegraf, lead: Lead) {
  if (!ADMIN_CHAT_ID) {
    logger.warn('未設定 ADMIN_TELEGRAM_ID，無法發送通知');
    return;
  }
  
  try {
    const message = `
🆕 **新諮詢來了！**

👤 **家長姓名：** ${lead.name}
📱 **電話：** ${lead.phone}
👶 **學生：** ${lead.student_name} (${lead.student_grade})
📚 **興趣科目：** ${lead.interest_subjects}
🕐 **諮詢時間：** ${new Date(lead.created_at).toLocaleString('zh-TW')}

${lead.trial_date ? `📅 **試聽預約：** ${lead.trial_date} ${lead.trial_time || ''}` : ''}

請盡快跟進！💪
    `.trim();
    
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, message, { 
      parse_mode: 'Markdown' 
    });
    
    logger.info(`新 lead 通知已發送: ${lead.name}`);
  } catch (error) {
    logger.error({ err: error }, '發送新 lead 通知失敗:');
  }
}

/**
 * 發送試聽提醒（給家長）
 */
export async function sendTrialReminder(
  bot: Telegraf, 
  chatId: number, 
  lead: Lead,
  daysBefore: number
) {
  try {
    let message = '';
    
    if (daysBefore === 1) {
      // 前一天提醒
      message = `
👋 ${lead.name} 您好！

明天就是 ${lead.student_name} 的試聽課囉！

📅 **時間：** ${lead.trial_date} ${lead.trial_time}
📍 **地點：** 蜂神榜補習班（地址...）

**試聽當天請記得：**
✅ 攜帶學生證或相關證件
✅ 提前 10 分鐘抵達
✅ 可攜帶學校課本

期待明天見到您！如有任何問題，歡迎隨時聯絡 😊
      `.trim();
    } else {
      // 當天早上提醒
      message = `
☀️ 早安！${lead.name}

今天是 ${lead.student_name} 的試聽日！

📅 **時間：** 今日 ${lead.trial_time}
📍 **地點：** 蜂神榜補習班

我們已經準備好了！期待等等見面 🎉

如需更改時間或有任何問題，請立即告知我們。
      `.trim();
    }
    
    await bot.telegram.sendMessage(chatId, message);
    logger.info(`試聽提醒已發送: ${lead.name} (${daysBefore} 天前)`);
  } catch (error) {
    logger.error({ err: error }, '發送試聽提醒失敗:');
  }
}

/**
 * 發送跟進提醒（給教室長）
 */
export async function sendFollowUpReminder(bot: Telegraf, leads: Lead[]) {
  if (!ADMIN_CHAT_ID || leads.length === 0) return;
  
  try {
    let message = '📋 **今日待跟進名單**\n\n';
    
    leads.forEach((lead, idx) => {
      message += `**${idx + 1}. ${lead.name}** (${lead.student_name})\n`;
      message += `   📱 ${lead.phone}\n`;
      message += `   📚 ${lead.interest_subjects}\n`;
      message += `   📊 狀態: ${getStatusText(lead.status)}\n`;
      message += `   📅 跟進日: ${lead.follow_up_date}\n\n`;
    });
    
    message += `共 ${leads.length} 位需要跟進，加油！💪`;
    
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, message, {
      parse_mode: 'Markdown'
    });
    
    logger.info(`跟進提醒已發送: ${leads.length} 筆`);
  } catch (error) {
    logger.error({ err: error }, '發送跟進提醒失敗:');
  }
}

/**
 * 發送轉換率週報
 */
export async function sendWeeklyReport(bot: Telegraf, stats: ConversionStats) {
  if (!ADMIN_CHAT_ID) return;
  
  try {
    const message = `
📊 **本週招生報告**

📈 **漏斗數據：**
• 新諮詢：${stats.newLeads} 人
• 預約試聽：${stats.trialScheduled} 人 (${((stats.trialScheduled / stats.newLeads) * 100).toFixed(1)}%)
• 完成試聽：${stats.trialCompleted} 人 (${((stats.trialCompleted / stats.trialScheduled) * 100).toFixed(1)}%)
• 正式報名：${stats.enrolled} 人 (${((stats.enrolled / stats.trialCompleted) * 100).toFixed(1)}%)

🎯 **整體轉換率：** ${(stats.conversionRate * 100).toFixed(1)}%

${stats.conversionRate > 0.3 ? '🎉 表現優異！' : stats.conversionRate > 0.2 ? '✅ 穩定成長中' : '⚠️ 需要加強跟進'}

繼續努力，下週更好！💪
    `.trim();
    
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, message, {
      parse_mode: 'Markdown'
    });
    
    logger.info('週報已發送');
  } catch (error) {
    logger.error({ err: error }, '發送週報失敗:');
  }
}

// ==================== 資料查詢函式 ====================

/**
 * 獲取需要提醒的試聽（前一天）
 */
async function getUpcomingTrials(daysAhead: number): Promise<Lead[]> {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const dateString = targetDate.toISOString().split('T')[0];
    
    // 這裡應該查詢資料庫
    // 暫時回傳空陣列
    // const response = await fetch(`${API_BASE_URL}/api/admin/leads?trial_date=${dateString}&status=trial_scheduled`);
    // return await response.json();
    
    return [];
  } catch (error) {
    logger.error({ err: error }, '獲取試聽名單失敗:');
    return [];
  }
}

/**
 * 獲取逾期跟進的 leads
 */
async function getOverdueFollowUps(): Promise<Lead[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/leads/overdue`);
    return await response.json();
  } catch (error) {
    logger.error({ err: error }, '獲取逾期跟進名單失敗:');
    return [];
  }
}

/**
 * 獲取本週轉換統計
 */
async function getWeeklyStats(): Promise<ConversionStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/enrollment/conversion?period=week`);
    return await response.json();
  } catch (error) {
    logger.error({ err: error }, '獲取週報數據失敗:');
    return {
      newLeads: 0,
      trialScheduled: 0,
      trialCompleted: 0,
      enrolled: 0,
      conversionRate: 0
    };
  }
}

// ==================== 定時任務 ====================

/**
 * 設定所有通知排程
 */
export function setupNotificationSchedules(bot: Telegraf) {
  // 每天 9:00 - 發送當天試聽提醒
  schedule.scheduleJob('0 9 * * *', async () => {
    logger.info('執行當天試聽提醒...');
    const todayTrials = await getUpcomingTrials(0);
    
    for (const lead of todayTrials) {
      // 假設我們有 chatId（實際應該從資料庫取得）
      // await sendTrialReminder(bot, lead.chatId, lead, 0);
    }
  });
  
  // 每天 18:00 - 發送明天試聽提醒
  schedule.scheduleJob('0 18 * * *', async () => {
    logger.info('執行明日試聽提醒...');
    const tomorrowTrials = await getUpcomingTrials(1);
    
    for (const lead of tomorrowTrials) {
      // await sendTrialReminder(bot, lead.chatId, lead, 1);
    }
  });
  
  // 每天 8:30 - 發送跟進提醒給教室長
  schedule.scheduleJob('30 8 * * *', async () => {
    logger.info('執行跟進提醒...');
    const overdueLeads = await getOverdueFollowUps();
    
    if (overdueLeads.length > 0) {
      await sendFollowUpReminder(bot, overdueLeads);
    }
  });
  
  // 每週一 9:00 - 發送週報
  schedule.scheduleJob('0 9 * * 1', async () => {
    logger.info('執行週報發送...');
    const stats = await getWeeklyStats();
    await sendWeeklyReport(bot, stats);
  });
  
  logger.info('✅ 通知排程已設定');
}

// ==================== 輔助函式 ====================

function getStatusText(status: Lead['status']): string {
  const statusMap: Record<Lead['status'], string> = {
    'new': '🆕 新諮詢',
    'contacted': '📞 已聯絡',
    'trial_scheduled': '📅 已預約試聽',
    'trial_completed': '✅ 試聽完成',
    'enrolled': '🎓 已報名',
    'lost': '❌ 流失'
  };
  
  return statusMap[status] || status;
}

// ==================== 手動觸發函式（測試用） ====================

/**
 * 手動發送測試通知
 */
export async function sendTestNotification(bot: Telegraf, type: string) {
  const testLead: Lead = {
    id: 999,
    name: '測試家長',
    phone: '0912345678',
    student_name: '小明',
    student_grade: '國一',
    interest_subjects: '數學, 英文',
    status: 'trial_scheduled',
    trial_date: new Date().toISOString().split('T')[0],
    trial_time: '18:00-19:30',
    follow_up_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  
  const testStats: ConversionStats = {
    newLeads: 10,
    trialScheduled: 7,
    trialCompleted: 5,
    enrolled: 3,
    conversionRate: 0.3
  };
  
  switch (type) {
    case 'new_lead':
      await notifyNewLead(bot, testLead);
      break;
    case 'trial_reminder':
      await sendTrialReminder(bot, parseInt(ADMIN_CHAT_ID), testLead, 1);
      break;
    case 'follow_up':
      await sendFollowUpReminder(bot, [testLead]);
      break;
    case 'weekly_report':
      await sendWeeklyReport(bot, testStats);
      break;
    default:
      logger.info('未知的通知類型');
  }
}

// ==================== Webhook 整合（給 API 呼叫） ====================

/**
 * 當新 lead 建立時呼叫
 */
export async function onLeadCreated(bot: Telegraf, leadId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/leads/${leadId}`);
    const lead: Lead = await response.json();
    
    await notifyNewLead(bot, lead);
  } catch (error) {
    logger.error({ err: error }, '處理新 lead 通知失敗:');
  }
}

/**
 * 當試聽預約時呼叫
 */
export async function onTrialScheduled(bot: Telegraf, leadId: number, chatId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/leads/${leadId}`);
    const lead: Lead = await response.json();
    
    // 立即發送確認訊息
    const confirmMessage = `
✅ **試聽預約確認**

親愛的 ${lead.name}，

您已成功預約 ${lead.student_name} 的試聽課程！

📅 **日期：** ${lead.trial_date}
🕐 **時間：** ${lead.trial_time}
📍 **地點：** 蜂神榜補習班

我們會在試聽前一天再次提醒您。
期待與您見面！😊

如需更改，請隨時聯絡我們。
    `.trim();
    
    await bot.telegram.sendMessage(chatId, confirmMessage);
    
    // 通知教室長
    await notifyNewLead(bot, lead);
  } catch (error) {
    logger.error({ err: error }, '處理試聽預約通知失敗:');
  }
}

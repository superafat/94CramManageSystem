/**
 * 主動推播排程系統
 *
 * 排程任務：
 * 1. 每日繳費提醒（提醒分校行政人員）
 * 2. 每週繳費提醒（提醒家長端）
 * 3. 聯絡簿發送時的 AI 課程推薦推播
 * 4. 月度學習報告推播（預留）
 *
 * 架構說明：
 * - 以 setInterval 實現週期性執行，不依賴外部 cron daemon
 * - 每個任務都捕捉例外，確保單一任務失敗不影響其他任務
 * - 發送端目前以 console.log 模擬，標記 TODO 待串接實際通知管道
 */

import { config } from '../config';
import { logger } from '../utils/logger';
import {
  billingCard,
  recommendationCarousel,
  flexToPlainText,
  type BillingItem,
  type RecommendationCardData,
  type LineFlexMessage,
} from '../templates/line-flex-messages';
import { sendMessage } from '../utils/telegram';
import { sendLinePushMessage } from '../services/line';
import { getAllAdminChatIds } from '../firestore/admin-lookup';

// ─── 內部型別 ─────────────────────────────────────────────────────────────────

interface UnpaidStudent {
  student_id: string;
  student_name: string;
  tenant_id: string;
  branch_name: string;
  /** 未繳金額（元） */
  unpaid_amount: number;
  /** 逾期天數 */
  overdue_days: number;
  /** 家長 Telegram chat_id（若有綁定） */
  parent_chat_id?: string;
  /** 未繳費項目清單 */
  unpaid_items: BillingItem[];
  /** 已繳費總額（元） */
  paid_amount: number;
}

interface TenantAdminContact {
  tenant_id: string;
  /** 分校行政人員 Telegram chat_id */
  admin_chat_id: string;
  branch_name: string;
}

interface ContactBookData {
  student_id: string;
  student_name: string;
  tenant_id: string;
  /** 今日成績快照（科目 -> 分數） */
  today_scores: Record<string, number>;
  /** 過去一個月成績（科目 -> 分數陣列，新到舊排列） */
  monthly_scores: Record<string, number[]>;
  /** 家長反饋文字陣列（最近） */
  parent_feedbacks: string[];
  /** 歷史聯絡簿小叮嚀陣列（最近） */
  previous_notes: string[];
  /** 家長 Telegram chat_id */
  parent_chat_id: string;
}

interface WeakSubjectAnalysis {
  subject: string;
  avg_score: number;
  trend: 'improving' | 'declining' | 'stable';
  recommended_focus: string;
}

// ─── 輔助：呼叫 manage-backend 內部 API ──────────────────────────────────────

async function callInternalApi(
  service: 'manage' | 'inclass',
  path: string,
  tenantId?: string,
  options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> }
): Promise<{ success: boolean; data?: Record<string, unknown>; message?: string }> {
  const baseUrl = service === 'manage' ? config.MANAGE_URL : config.INCLASS_URL;
  const url = `${baseUrl}/api/internal${path}`;
  const method = options?.method ?? 'GET';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    if (config.INTERNAL_API_KEY) {
      headers['X-Internal-Key'] = config.INTERNAL_API_KEY;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(options?.body ?? {}) : undefined,
    });

    if (!res.ok) {
      logger.warn(`[Scheduler] Internal API ${service}${path} returned HTTP ${res.status}`);
      return { success: false, message: `HTTP ${res.status}` };
    }

    return await res.json() as { success: boolean; data?: Record<string, unknown>; message?: string };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '未知錯誤';
    logger.error(
      { err: error instanceof Error ? error : new Error(msg) },
      `[Scheduler] callInternalApi ${service}${path} 失敗`
    );
    return { success: false, message: msg };
  }
}

// ─── 輔助：發送 LINE Flex Message（Push API） ─────────────────────────────────

/**
 * 透過 LINE Push API 發送 Flex Message 給指定 userId
 */
async function sendLineFlexMessage(to: string, flex: LineFlexMessage): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    logger.error('[Scheduler] LINE_CHANNEL_ACCESS_TOKEN 未設定，無法發送 Flex Message');
    return;
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ to, messages: [flex] }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error(
        { status: res.status, body, to },
        '[Scheduler] LINE Flex Message push 失敗'
      );
    }
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err : new Error(String(err)), to },
      '[Scheduler] LINE Flex Message push 例外'
    );
  }
}

// ─── 輔助：發送通知（實際管道） ───────────────────────────────────────────────

/**
 * 發送文字通知。
 * - admin 頻道 → Telegram sendMessage（使用 admin bot）
 * - parent 頻道 → LINE Push text message
 */
async function dispatchTextNotification(chatId: string, text: string, channel: 'admin' | 'parent'): Promise<void> {
  try {
    if (channel === 'admin') {
      await sendMessage(chatId, text, undefined, 'admin');
      logger.info({ chatId, channel }, '[Scheduler] Telegram 文字通知已發送');
    } else {
      await sendLinePushMessage(chatId, [{ type: 'text', text }]);
      logger.info({ chatId, channel }, '[Scheduler] LINE 文字通知已發送');
    }
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err : new Error(String(err)), chatId, channel },
      '[Scheduler] dispatchTextNotification 失敗'
    );
  }
}

/**
 * 發送 Flex Message 通知。
 * - parent 頻道 → LINE Push Flex Message
 * - admin 頻道 → Telegram 以 altText 降級發送
 */
async function dispatchFlexNotification(
  chatId: string,
  flex: ReturnType<typeof billingCard> | ReturnType<typeof recommendationCarousel>,
  channel: 'admin' | 'parent'
): Promise<void> {
  const altText = flexToPlainText(flex);
  try {
    if (channel === 'parent') {
      await sendLineFlexMessage(chatId, flex);
      logger.info({ chatId, channel }, '[Scheduler] LINE Flex Message 已發送');
    } else {
      // admin 頻道（Telegram）以純文字降級
      await sendMessage(chatId, altText, undefined, 'admin');
      logger.info({ chatId, channel }, '[Scheduler] Telegram Flex 降級文字已發送');
    }
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err : new Error(String(err)), chatId, channel },
      '[Scheduler] dispatchFlexNotification 失敗'
    );
  }
}

// ─── 輔助：AI 弱科分析 ────────────────────────────────────────────────────────

/**
 * 根據今日成績、過去一個月成績，分析學生的相對弱科。
 * 回傳排序後的弱科列表（分數最低、下降趨勢優先）。
 */
function analyzeWeakSubjects(data: ContactBookData): WeakSubjectAnalysis[] {
  const analyses: WeakSubjectAnalysis[] = [];

  const allSubjects = new Set<string>([
    ...Object.keys(data.today_scores),
    ...Object.keys(data.monthly_scores),
  ]);

  for (const subject of allSubjects) {
    const monthlyScores = data.monthly_scores[subject] ?? [];
    const todayScore = data.today_scores[subject];

    // 合併今日 + 月份成績
    const allScores = todayScore !== undefined
      ? [todayScore, ...monthlyScores]
      : monthlyScores;

    if (allScores.length === 0) continue;

    const avg_score = Math.round(
      allScores.reduce((sum, s) => sum + s, 0) / allScores.length
    );

    // 計算趨勢：比較前半段與後半段平均
    let trend: WeakSubjectAnalysis['trend'] = 'stable';
    if (allScores.length >= 4) {
      const mid = Math.floor(allScores.length / 2);
      const recentAvg = allScores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
      const olderAvg = allScores.slice(mid).reduce((s, v) => s + v, 0) / (allScores.length - mid);
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }

    // 推薦焦點：依趨勢與弱科分類
    let recommended_focus = '持續鞏固基礎概念';
    if (avg_score < 60) {
      recommended_focus = '建議從基礎概念重新建立，需加強練習量';
    } else if (avg_score < 75) {
      recommended_focus = '重點加強應用題與易錯題型';
    } else if (trend === 'declining') {
      recommended_focus = '近期成績有下滑趨勢，建議提前預習並加強複習';
    }

    analyses.push({ subject, avg_score, trend, recommended_focus });
  }

  // 排序：分數低且趨勢下滑排最前
  return analyses.sort((a, b) => {
    const trendWeight = (t: WeakSubjectAnalysis['trend']) =>
      t === 'declining' ? -2 : t === 'stable' ? -1 : 0;
    return (a.avg_score + trendWeight(a.trend) * 10) - (b.avg_score + trendWeight(b.trend) * 10);
  });
}

/**
 * 根據弱科分析結果，產生聯絡簿推薦課程理由文字
 */
function buildWeakSubjectNote(
  studentName: string,
  analysis: WeakSubjectAnalysis,
  parentFeedbacks: string[]
): string {
  const feedbackHint =
    parentFeedbacks.length > 0
      ? `家長反饋顯示「${parentFeedbacks[0]}」，`
      : '';

  const trendLabel =
    analysis.trend === 'declining' ? '（近期下滑）' :
    analysis.trend === 'improving' ? '（近期進步中）' : '';

  return (
    `根據 ${studentName} 近一個月的成績分析，${analysis.subject} 平均 ${analysis.avg_score} 分${trendLabel}。` +
    `${feedbackHint}${analysis.recommended_focus}。`
  );
}

// ─── 分校主管逾期通知 ─────────────────────────────────────────────────────────

/**
 * 通知分校主管逾期帳款摘要（廣播給該 tenant 所有已綁定的管理員）
 */
async function notifyBranchManagerOverdue(tenantId: string, unpaidCount: number, maxOverdueDays: number): Promise<void> {
  const message = `【帳款提醒】貴校有 ${unpaidCount} 筆待繳帳款，最長逾期 ${Math.floor(maxOverdueDays)} 天，請儘速處理。`;
  try {
    const chatIds = await getAllAdminChatIds(tenantId);
    if (chatIds.length === 0) {
      logger.warn({ tenantId }, '[Scheduler][逾期提醒] 找不到任何已綁定的管理員');
      return;
    }
    await Promise.all(
      chatIds.map((chatId) =>
        sendMessage(chatId, message, undefined, 'admin').catch((err: unknown) => {
          logger.error(
            { err: err instanceof Error ? err : new Error(String(err)), chatId, tenantId },
            '[Scheduler][逾期提醒] Telegram 發送失敗'
          );
        })
      )
    );
    logger.info({ tenantId, chatIds, unpaidCount, maxOverdueDays }, '[Scheduler][逾期提醒] 通知已發送');
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err : new Error(String(err)), tenantId },
      '[Scheduler][逾期提醒] notifyBranchManagerOverdue 失敗'
    );
  }
}

// ─── 任務一：每日繳費提醒（通知分校行政人員） ────────────────────────────────

/**
 * 每日繳費提醒
 *
 * 邏輯：
 * 1. 呼叫 manage-backend 取得所有租戶的未繳費學生列表
 * 2. 按租戶分組，組合提醒文字
 * 3. 通知各分校行政人員
 *
 * 執行時間：每日 09:00（由 initScheduler 控制）
 */
export async function scheduleDailyBillingReminder(): Promise<void> {
  logger.info('[Scheduler] 開始執行每日繳費提醒任務');

  try {
    // 步驟 1：取得所有未繳費學生
    // TODO: 後端需實作 GET /api/internal/billing/unpaid-all 端點
    //       回傳格式：{ success: true, data: { students: UnpaidStudent[], admins: TenantAdminContact[] } }
    const res = await callInternalApi('manage', '/billing/unpaid-all');

    if (!res.success || !res.data) {
      logger.warn('[Scheduler][每日繳費] 無法取得未繳費學生資料，跳過本次執行');
      return;
    }

    const students = (res.data.students ?? []) as UnpaidStudent[];
    const admins = (res.data.admins ?? []) as TenantAdminContact[];

    if (students.length === 0) {
      logger.info('[Scheduler][每日繳費] 目前無未繳費學生，略過通知');
      return;
    }

    // 步驟 2：依 tenant_id 分組
    const byTenant = new Map<string, { students: UnpaidStudent[]; admin?: TenantAdminContact }>();

    for (const student of students) {
      if (!byTenant.has(student.tenant_id)) {
        byTenant.set(student.tenant_id, { students: [] });
      }
      byTenant.get(student.tenant_id)!.students.push(student);
    }
    for (const admin of admins) {
      const entry = byTenant.get(admin.tenant_id);
      if (entry) entry.admin = admin;
    }

    // 步驟 3：發送通知
    for (const [tenantId, { students: tenantStudents, admin }] of byTenant) {
      if (!admin) {
        logger.warn(`[Scheduler][每日繳費] tenant ${tenantId} 找不到行政人員聯絡資訊，略過`);
        continue;
      }

      const overdueCount = tenantStudents.filter((s) => s.overdue_days > 7).length;
      const studentListLines = tenantStudents
        .map((s) => {
          const overdueFlag = s.overdue_days > 7 ? ` ⚠️（逾期 ${s.overdue_days} 天）` : '';
          return `  • ${s.student_name}　NT$${s.unpaid_amount.toLocaleString()}${overdueFlag}`;
        })
        .join('\n');

      const message =
        `📋 每日繳費提醒\n` +
        `─────────────────\n` +
        `以下 ${tenantStudents.length} 位學生尚未繳費：\n\n` +
        `${studentListLines}\n\n` +
        `逾期 > 7 天：${overdueCount} 人\n` +
        `請盡速聯繫家長處理。\n\n` +
        `📅 統計時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;

      await dispatchTextNotification(admin.admin_chat_id, message, 'admin');

      // 通知分校主管逾期帳款摘要
      const maxOverdueDays = tenantStudents.length > 0
        ? Math.max(...tenantStudents.map((s) => s.overdue_days))
        : 0;
      await notifyBranchManagerOverdue(tenantId, tenantStudents.length, maxOverdueDays);
    }

    logger.info(
      { totalStudents: students.length, totalTenants: byTenant.size },
      '[Scheduler][每日繳費] 任務完成'
    );
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      '[Scheduler][每日繳費] 任務執行失敗'
    );
  }
}

// ─── 任務二：每週繳費提醒（通知家長） ────────────────────────────────────────

/**
 * 每週繳費提醒（每週一執行）
 *
 * 邏輯：
 * 1. 取得所有有未繳費且家長已綁定 Bot 的學生
 * 2. 對每位家長發送 billingCard Flex Message
 *
 * 執行時間：每週一 10:00（由 initScheduler 控制）
 */
export async function scheduleWeeklyParentBillingReminder(): Promise<void> {
  logger.info('[Scheduler] 開始執行每週家長繳費提醒任務');

  try {
    // 步驟 1：取得有未繳費且家長已綁定的學生
    // TODO: 後端需實作 GET /api/internal/billing/unpaid-with-parent-binding 端點
    //       回傳格式：{ success: true, data: { students: UnpaidStudent[] } }
    const res = await callInternalApi('manage', '/billing/unpaid-with-parent-binding');

    if (!res.success || !res.data) {
      logger.warn('[Scheduler][每週家長繳費] 無法取得資料，跳過本次執行');
      return;
    }

    const students = (res.data.students ?? []) as UnpaidStudent[];

    if (students.length === 0) {
      logger.info('[Scheduler][每週家長繳費] 目前無需提醒的家長，略過');
      return;
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const student of students) {
      if (!student.parent_chat_id) continue;

      try {
        // 使用 billingCard Flex Message 模板
        const flex = billingCard({
          childName: student.student_name,
          totalUnpaid: student.unpaid_amount,
          totalPaid: student.paid_amount,
          unpaidItems: student.unpaid_items,
        });

        await dispatchFlexNotification(student.parent_chat_id, flex, 'parent');
        sentCount++;
      } catch (sendErr: unknown) {
        const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        errors.push(`${student.student_name}: ${errMsg}`);
        logger.warn(
          { err: sendErr instanceof Error ? sendErr : new Error(errMsg), studentId: student.student_id },
          '[Scheduler][每週家長繳費] 發送通知失敗'
        );
      }
    }

    logger.info(
      { sentCount, errorCount: errors.length },
      '[Scheduler][每週家長繳費] 任務完成'
    );
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      '[Scheduler][每週家長繳費] 任務執行失敗'
    );
  }
}

// ─── 任務三：聯絡簿發送後的 AI 課程推薦推播 ──────────────────────────────────

/**
 * 聯絡簿發送後，AI 分析弱科並推播推薦課程（由外部事件觸發，非定期）
 *
 * 觸發時機：補習班教師在 manage-dashboard 發送聯絡簿後，
 *           由後端 webhook 呼叫此函式（或由排程定期掃描待推播佇列）
 *
 * 邏輯：
 * 1. 分析今日及過去一個月成績，找出弱科
 * 2. 呼叫 manage-backend 取得對應的推薦課程
 * 3. 組合 recommendationCarousel，推播給家長
 *
 * @param studentId - 學生 ID
 * @param contactBookData - 聯絡簿相關資料（成績、家長反饋、歷史小叮嚀）
 */
export async function scheduleAIRecommendationPush(
  studentId: string,
  contactBookData: ContactBookData
): Promise<void> {
  logger.info(
    { studentId, studentName: contactBookData.student_name },
    '[Scheduler] 開始執行 AI 課程推薦推播'
  );

  try {
    // 步驟 1：AI 弱科分析
    const weakSubjects = analyzeWeakSubjects(contactBookData);

    if (weakSubjects.length === 0) {
      logger.info(
        { studentId },
        '[Scheduler][AI 推薦] 無足夠成績資料，略過推薦'
      );
      return;
    }

    // 取前兩個最弱科目
    const topWeakSubjects = weakSubjects.slice(0, 2);

    logger.info(
      {
        studentId,
        weakSubjects: topWeakSubjects.map((w) => `${w.subject}(${w.avg_score}分,${w.trend})`),
      },
      '[Scheduler][AI 推薦] 弱科分析完成'
    );

    // 步驟 2：取得推薦課程
    // TODO: 後端需實作 POST /api/internal/courses/recommend 端點
    //       請求格式：{ student_id, tenant_id, weak_subjects: string[] }
    //       回傳格式：{ success: true, data: { courses: RecommendationCardData[] } }
    const recommendRes = await callInternalApi(
      'manage',
      '/courses/recommend',
      contactBookData.tenant_id,
      {
        method: 'POST',
        body: {
          student_id: studentId,
          tenant_id: contactBookData.tenant_id,
          weak_subjects: topWeakSubjects.map((w) => w.subject),
        },
      }
    );

    let recommendationItems: RecommendationCardData[];

    if (recommendRes.success && recommendRes.data) {
      // 後端回傳真實課程資料
      const courses = (recommendRes.data.courses ?? []) as Array<{
        courseName: string;
        teacherName: string;
        fee: number;
        feeUnit?: string;
        detailUrl?: string;
        trialUrl?: string;
      }>;

      recommendationItems = courses.map((course, idx) => {
        const weakInfo = topWeakSubjects[idx] ?? topWeakSubjects[0];
        return {
          courseName: course.courseName,
          teacherName: course.teacherName,
          fee: course.fee,
          feeUnit: course.feeUnit ?? '元/月',
          weakSubjectNote: buildWeakSubjectNote(
            contactBookData.student_name,
            weakInfo!,
            contactBookData.parent_feedbacks
          ),
          detailUrl: course.detailUrl,
          trialUrl: course.trialUrl,
        };
      });
    } else {
      // 後端尚未實作時，以弱科資料組合示範卡片
      logger.warn(
        { studentId },
        '[Scheduler][AI 推薦] 課程推薦 API 未回傳資料，使用弱科示範卡片'
      );

      recommendationItems = topWeakSubjects.map((weak) => ({
        courseName: `${weak.subject}強化班`,
        teacherName: '請洽分校',
        fee: 0,
        feeUnit: '元/月（請洽詢）',
        weakSubjectNote: buildWeakSubjectNote(
          contactBookData.student_name,
          weak,
          contactBookData.parent_feedbacks
        ),
      }));
    }

    if (recommendationItems.length === 0) {
      logger.info({ studentId }, '[Scheduler][AI 推薦] 無可推薦課程，略過推播');
      return;
    }

    // 步驟 3：組合 Flex Message 並推播
    const flex = recommendationCarousel(recommendationItems);
    await dispatchFlexNotification(contactBookData.parent_chat_id, flex, 'parent');

    logger.info(
      { studentId, courseCount: recommendationItems.length },
      '[Scheduler][AI 推薦] 課程推薦推播完成'
    );
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), studentId },
      '[Scheduler][AI 推薦] 任務執行失敗'
    );
  }
}

// ─── 任務四：聯絡簿佇列定期掃描（觸發 AI 推薦） ─────────────────────────────

/**
 * 定期掃描聯絡簿推播佇列
 *
 * 邏輯：
 * 1. 呼叫 manage-backend 取得「已發送聯絡簿但尚未推播 AI 推薦」的佇列
 * 2. 對每筆記錄呼叫 scheduleAIRecommendationPush
 * 3. 標記為已處理
 *
 * 執行時間：每小時整點（由 initScheduler 控制）
 */
async function processContactBookPushQueue(): Promise<void> {
  logger.info('[Scheduler] 開始掃描聯絡簿推播佇列');

  try {
    // TODO: 後端需實作 GET /api/internal/contact-book/pending-push 端點
    //       回傳格式：{ success: true, data: { items: ContactBookData[] } }
    const res = await callInternalApi('manage', '/contact-book/pending-push');

    if (!res.success || !res.data) {
      logger.warn('[Scheduler][聯絡簿佇列] 無法取得佇列資料，跳過');
      return;
    }

    const items = (res.data.items ?? []) as ContactBookData[];

    if (items.length === 0) {
      logger.info('[Scheduler][聯絡簿佇列] 佇列為空，略過');
      return;
    }

    logger.info({ count: items.length }, '[Scheduler][聯絡簿佇列] 發現待推播項目');

    for (const item of items) {
      await scheduleAIRecommendationPush(item.student_id, item);

      // 標記為已推播
      // TODO: 後端需實作 POST /api/internal/contact-book/mark-pushed
      await callInternalApi(
        'manage',
        '/contact-book/mark-pushed',
        item.tenant_id,
        {
          method: 'POST',
          body: { student_id: item.student_id, tenant_id: item.tenant_id },
        }
      );
    }

    logger.info({ processed: items.length }, '[Scheduler][聯絡簿佇列] 佇列處理完成');
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      '[Scheduler][聯絡簿佇列] 掃描任務失敗'
    );
  }
}

// ─── 任務五：每週一五催繳通知（家長端）──────────────────────────────────────

/**
 * 每週一、五催繳通知
 * 透過 manage-backend 內部 API 查詢欠繳清單，按學生分組後呼叫通知 API
 * 執行時間：每週一、五 10:00
 */
export async function scheduleOverdueParentReminder(): Promise<void> {
  logger.info('[Scheduler] 開始執行週一五家長催繳通知');

  try {
    const res = await callInternalApi('manage', '/billing/overdue-by-student');

    if (!res.success || !res.data) {
      logger.warn('[Scheduler][催繳] 無法取得欠繳資料，跳過');
      return;
    }

    const items = (res.data as unknown as unknown[]) || [];
    if (items.length === 0) {
      logger.info('[Scheduler][催繳] 無欠繳學生，略過');
      return;
    }

    // 按學生分組
    const byStudent = new Map<string, { tenantId: string; studentName: string; unpaidItems: Array<{ courseName: string; amount: number }> }>();

    for (const row of items as any[]) {
      const key = row.student_id;
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          tenantId: row.tenant_id,
          studentName: row.student_name || '',
          unpaidItems: [],
        });
      }
      byStudent.get(key)!.unpaidItems.push({
        courseName: row.course_name || '',
        amount: Number(row.amount) || 0,
      });
    }

    let dispatched = 0;
    for (const [studentId, data] of byStudent) {
      await callInternalApi('manage', '/notify/billing-overdue', data.tenantId, {
        method: 'POST',
        body: {
          tenantId: data.tenantId,
          studentId,
          studentName: data.studentName,
          unpaidItems: data.unpaidItems,
        },
      });
      dispatched++;
    }

    logger.info({ dispatched }, '[Scheduler][催繳] 任務完成');
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      '[Scheduler][催繳] 任務執行失敗'
    );
  }
}

// ─── 任務六：月底 AI 學習總結 ─────────────────────────────────────────────────

/**
 * 每月最後一天 18:00 觸發 AI 月度學習總結
 * 呼叫 manage-backend /notify/monthly-summary
 */
export async function scheduleMonthlyAISummary(): Promise<void> {
  logger.info('[Scheduler] 開始執行月度 AI 學習總結');

  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const month = now.toISOString().slice(0, 7);

    const res = await callInternalApi('manage', '/notify/monthly-summary', undefined, {
      method: 'POST',
      body: { month },
    });

    if (res.success) {
      logger.info({ month }, '[Scheduler][月度總結] 任務完成');
    } else {
      logger.warn({ month, error: res.message }, '[Scheduler][月度總結] 任務回傳失敗');
    }
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      '[Scheduler][月度總結] 任務執行失敗'
    );
  }
}

// ─── 時間工具 ─────────────────────────────────────────────────────────────────

/** 取得台灣當地時間的小時（0–23） */
function getTaiwanHour(): number {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })
  ).getHours();
}

/** 取得台灣當地時間的星期幾（0=日, 1=一, …, 6=六） */
function getTaiwanDayOfWeek(): number {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })
  ).getDay();
}

// ─── 排程計時器清單（供 graceful shutdown 使用） ──────────────────────────────

const _timers: ReturnType<typeof setInterval>[] = [];

/** 清除所有排程計時器（供測試或 graceful shutdown 呼叫） */
export function clearAllSchedulers(): void {
  for (const timer of _timers) {
    clearInterval(timer);
  }
  _timers.length = 0;
  logger.info('[Scheduler] 所有排程計時器已清除');
}

// ─── initScheduler：初始化所有排程 ───────────────────────────────────────────

/**
 * 初始化所有主動推播排程
 *
 * 排程說明：
 * | 任務                     | 執行時間        | 間隔       |
 * |--------------------------|-----------------|------------|
 * | 每日繳費提醒（人員）      | 每日 09:00      | 每分鐘輪詢 |
 * | 每週繳費提醒（家長）      | 週一 10:00      | 每分鐘輪詢 |
 * | 聯絡簿 AI 推薦佇列掃描    | 每小時整點      | 每分鐘輪詢 |
 *
 * 實作方式：以每分鐘輪詢 + 時間條件判斷，模擬 cron 行為。
 * 不依賴 node-cron 套件，減少外部依賴。
 */
export function initScheduler(): void {
  logger.info('[Scheduler] 初始化主動推播排程系統');

  // 記錄各任務上次執行日期，避免同日重複觸發
  const lastRunDate: Record<string, string> = {};

  const CHECK_INTERVAL_MS = 60 * 1000; // 每分鐘檢查一次

  const timer = setInterval(() => {
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    const taiwanDate = new Date(now);
    const todayKey = taiwanDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const hour = taiwanDate.getHours();
    const dayOfWeek = taiwanDate.getDay();

    // ── 每日 09:00：繳費提醒（分校行政人員）──
    const dailyBillingKey = `daily-billing-${todayKey}`;
    if (hour === 9 && lastRunDate[dailyBillingKey] !== todayKey) {
      lastRunDate[dailyBillingKey] = todayKey;
      scheduleDailyBillingReminder().catch((err: unknown) => {
        logger.error(
          { err: err instanceof Error ? err : new Error(String(err)) },
          '[Scheduler] 每日繳費提醒執行錯誤'
        );
      });
    }

    // ── 每週一 10:00：繳費提醒（家長）──
    const weeklyBillingKey = `weekly-billing-${todayKey}`;
    if (dayOfWeek === 1 && hour === 10 && lastRunDate[weeklyBillingKey] !== todayKey) {
      lastRunDate[weeklyBillingKey] = todayKey;
      scheduleWeeklyParentBillingReminder().catch((err: unknown) => {
        logger.error(
          { err: err instanceof Error ? err : new Error(String(err)) },
          '[Scheduler] 每週家長繳費提醒執行錯誤'
        );
      });
    }

    // ── 每小時整點：掃描聯絡簿 AI 推薦佇列 ──
    const hourlyQueueKey = `contact-book-queue-${todayKey}-${hour}`;
    if (taiwanDate.getMinutes() === 0 && lastRunDate[hourlyQueueKey] !== `${todayKey}-${hour}`) {
      lastRunDate[hourlyQueueKey] = `${todayKey}-${hour}`;
      processContactBookPushQueue().catch((err: unknown) => {
        logger.error(
          { err: err instanceof Error ? err : new Error(String(err)) },
          '[Scheduler] 聯絡簿佇列掃描執行錯誤'
        );
      });
    }

    // ── 每週一、五 10:00：家長催繳通知 ──
    const overdueKey = `overdue-parent-${todayKey}`;
    if ((dayOfWeek === 1 || dayOfWeek === 5) && hour === 10 && lastRunDate[overdueKey] !== todayKey) {
      lastRunDate[overdueKey] = todayKey;
      scheduleOverdueParentReminder().catch((err: unknown) => {
        logger.error(
          { err: err instanceof Error ? err : new Error(String(err)) },
          '[Scheduler] 週一五催繳通知執行錯誤'
        );
      });
    }

    // ── 每月最後一天 18:00：AI 月度學習總結 ──
    const tomorrow = new Date(taiwanDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getMonth() !== taiwanDate.getMonth();
    const monthlySummaryKey = `monthly-summary-${todayKey}`;
    if (isLastDayOfMonth && hour === 18 && lastRunDate[monthlySummaryKey] !== todayKey) {
      lastRunDate[monthlySummaryKey] = todayKey;
      scheduleMonthlyAISummary().catch((err: unknown) => {
        logger.error(
          { err: err instanceof Error ? err : new Error(String(err)) },
          '[Scheduler] 月度 AI 學習總結執行錯誤'
        );
      });
    }
  }, CHECK_INTERVAL_MS);

  _timers.push(timer);

  logger.info(
    {
      tasks: [
        '每日 09:00 繳費提醒（分校行政人員）',
        '每週一 10:00 繳費提醒（家長 Flex）',
        '每小時整點 聯絡簿 AI 推薦佇列掃描',
        '每週一五 10:00 欠繳催繳通知（家長 LINE+Telegram）',
        '每月最後一天 18:00 AI 月度學習總結（家長 LINE+Telegram）',
      ],
    },
    '[Scheduler] 所有排程已啟動'
  );
}

// 重新導出 ContactBookData 型別供外部使用（例如 webhook 觸發時傳入）
export type { ContactBookData, UnpaidStudent, TenantAdminContact, WeakSubjectAnalysis };

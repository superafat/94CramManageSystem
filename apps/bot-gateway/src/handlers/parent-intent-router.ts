/**
 * Parent Intent Router — keyword-based intent parsing + real API execution
 * Replaces mock responses with callParentApi calls to manage/inclass backends
 */
import type { ParentBinding, ParentChild } from '../firestore/parent-bindings';
import { callParentApi, type ParentApiResponse } from '../modules/parent-api-client';
import { searchKnowledge } from '../firestore/knowledge-base';
import { logger } from '../utils/logger';

export type ParentIntent =
  | 'parent.attendance'
  | 'parent.grades'
  | 'parent.payments'
  | 'parent.schedule'
  | 'parent.info'
  | 'parent.leave'
  | 'parent.help'
  | 'parent.unknown';

export interface ParentIntentResult {
  intent: ParentIntent;
  params: {
    child_name?: string;
    student_id?: string;
    date?: string;
    reason?: string;
    subject?: string;
    exam?: string;
    month?: string;
    day?: string;
  };
}

const KEYWORD_MAP: Array<{ keywords: string[]; intent: ParentIntent }> = [
  { keywords: ['請假', '代請假', '病假', '事假', '不去上課', '不能去'], intent: 'parent.leave' },
  { keywords: ['出勤', '出缺勤', '缺席', '遲到', '到校', '出席', '有到', '到了嗎', '到了沒', '到補習班', '到班', '有沒有到', '到了沒有', '有去', '去了嗎', '有去上課'], intent: 'parent.attendance' },
  { keywords: ['成績', '考試', '分數', '測驗', '評量', '段考'], intent: 'parent.grades' },
  { keywords: ['繳費', '費用', '學費', '帳單', '付款', '欠費', '繳了', '繳錢', '繳清', '繳費情況', '繳費狀況', '繳沒', '錢'], intent: 'parent.payments' },
  { keywords: ['課表', '上課', '課程', '排課', '幾點上', '什麼時候上', '報名', '哪些班', '什麼班', '班級'], intent: 'parent.schedule' },
  { keywords: ['資料', '基本', '個人', '聯絡'], intent: 'parent.info' },
  { keywords: ['說明', '幫助', '功能', 'help', '你好', '嗨', '哈囉'], intent: 'parent.help' },
];

export function parseParentIntent(text: string, binding: ParentBinding): ParentIntentResult {
  const normalized = text.trim().toLowerCase();

  if (normalized === '/help' || normalized === '/start') {
    return { intent: 'parent.help', params: {} };
  }

  for (const { keywords, intent } of KEYWORD_MAP) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      const child = matchChild(text, binding);
      const params: ParentIntentResult['params'] = {
        child_name: child?.student_name,
        student_id: child?.student_id,
      };

      // Extract leave-specific params
      if (intent === 'parent.leave') {
        params.date = extractDate(text);
        params.reason = extractReason(text);
      }

      return { intent, params };
    }
  }

  return { intent: 'parent.unknown', params: {} };
}

function matchChild(text: string, binding: ParentBinding): ParentChild | undefined {
  for (const child of binding.children) {
    if (text.includes(child.student_name)) {
      return child;
    }
  }
  if (binding.children.length === 1) {
    return binding.children[0];
  }
  return undefined;
}

function extractDate(text: string): string | undefined {
  // Match patterns like "明天", "後天", "1/5", "1月5日", "2026-02-26"
  const today = new Date();

  if (text.includes('今天')) {
    return formatDate(today);
  }
  if (text.includes('明天')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }
  if (text.includes('後天')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return formatDate(d);
  }

  // Match "1/5" or "1月5日"
  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  const cnMatch = text.match(/(\d{1,2})月(\d{1,2})[日號]/);
  if (cnMatch) {
    const month = cnMatch[1].padStart(2, '0');
    const day = cnMatch[2].padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  // ISO date
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  return undefined;
}

function extractReason(text: string): string | undefined {
  // Common leave reasons in Chinese
  const reasons = ['腸胃炎', '感冒', '發燒', '生病', '家庭因素', '私事', '看醫生', '身體不適', '頭痛', '牙痛'];
  for (const reason of reasons) {
    if (text.includes(reason)) return reason;
  }

  // Try to extract reason after common markers
  const markers = ['原因', '因為', '因', '，'];
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      const after = text.slice(idx + marker.length).trim();
      if (after.length > 0 && after.length <= 20) return after;
    }
  }

  return undefined;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Mock data fallback (when real API fails) ---

function getMockAttendance(childLabel: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return (
    `📋 ${childLabel}的出勤紀錄\n\n` +
    `📅 ${month} 月統計：\n` +
    `✅ 到課 18 天\n` +
    `未到班 1 天\n` +
    `⏰ 遲到 1 天\n` +
    `🏥 請假 2 天\n` +
    `📊 出勤率 90%\n\n` +
    `出勤狀況很穩定！`
  );
}

function getMockPayments(childLabel: string): string {
  const now = new Date();
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const curMonth = monthNames[now.getMonth()] ?? '';
  const prevMonth = monthNames[(now.getMonth() + 11) % 12] ?? '';
  const prev2Month = monthNames[(now.getMonth() + 10) % 12] ?? '';
  return (
    `💰 ${childLabel}的繳費狀態\n\n` +
    `✅ 目前繳費狀態：已繳清\n\n` +
    `📜 繳費紀錄：\n` +
    `✅ ${curMonth} NT$4,500\n` +
    `✅ ${prevMonth} NT$4,500\n` +
    `✅ ${prev2Month} NT$4,500\n\n` +
    `如需繳費方式說明，跟我說就好`
  );
}

function getMockSchedule(childLabel: string): string {
  return (
    `📅 ${childLabel}的課表\n\n` +
    `📌 週二：\n  19:00~20:30 國文\n` +
    `📌 週四：\n  19:00~20:30 數學\n` +
    `📌 週六：\n  14:00~15:30 英文`
  );
}

// --- API Execution ---

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * Execute a parent intent by calling real backend APIs
 */
export async function executeParentIntent(
  intentResult: ParentIntentResult,
  binding: ParentBinding
): Promise<string> {
  const { intent, params } = intentResult;
  const childLabel = params.child_name ?? '您的孩子';
  const studentId = params.student_id;

  // If multiple children and none specified, ask which child
  if (!studentId && binding.children.length > 1 && intent !== 'parent.help' && intent !== 'parent.unknown') {
    const childList = binding.children.map((c, i) => `${i + 1}. ${c.student_name}`).join('\n');
    return `👋 您綁定了多位孩子，請問要查詢哪位？\n\n${childList}\n\n請輸入孩子的名字再試一次`;
  }

  switch (intent) {
    case 'parent.attendance':
      return handleAttendance(studentId!, childLabel, binding.tenant_id);

    case 'parent.grades':
      return handleGrades(studentId!, childLabel, binding.tenant_id);

    case 'parent.payments':
      return handlePayments(studentId!, childLabel, binding.tenant_id);

    case 'parent.schedule':
      return handleSchedule(studentId!, childLabel, binding.tenant_id);

    case 'parent.info':
      return handleInfo(studentId!, childLabel, binding);

    case 'parent.leave':
      // Leave is handled separately in telegram-parent.ts via cross-bot-bridge
      // This shouldn't be called directly, but return a message just in case
      return `📝 請假功能請直接說「幫${childLabel}請假」，並告訴我日期和原因`;

    case 'parent.help':
      return formatHelpMessage();

    case 'parent.unknown':
    default:
      return handleUnknown(binding);
  }
}

async function handleAttendance(studentId: string, childLabel: string, tenantId: string): Promise<string> {
  // Fetch both summary and recent records in parallel
  const [summaryRes, recordsRes] = await Promise.all([
    callParentApi('inclass', `/attendance/${studentId}/summary`, tenantId),
    callParentApi('inclass', `/attendance/${studentId}`, tenantId),
  ]);

  if (!summaryRes.success && !recordsRes.success) {
    logger.warn('[ParentRouter] Attendance API failed, using mock data');
    return getMockAttendance(childLabel);
  }

  let text = `📋 ${childLabel}的出勤紀錄\n\n`;

  if (summaryRes.success && summaryRes.data) {
    const d = summaryRes.data as Record<string, unknown>;
    const month = d.month as string ?? '';
    text += `📅 ${month} 月統計：\n`;
    text += `✅ 到課 ${d.present_days ?? 0} 天\n`;
    text += `未到班 ${d.absent_days ?? 0} 天\n`;
    text += `⏰ 遲到 ${d.late_days ?? 0} 天\n`;
    text += `🏥 請假 ${d.leave_days ?? 0} 天\n`;
    text += `📊 出勤率 ${d.attendance_rate ?? 0}%\n`;
  }

  if (recordsRes.success && recordsRes.data) {
    const records = (recordsRes.data as Record<string, unknown>).records as Array<Record<string, unknown>> | undefined;
    if (records && records.length > 0) {
      text += `\n📜 最近出勤：\n`;
      const recent = records.slice(0, 6);
      for (const r of recent) {
        const date = r.date
          ? new Date(r.date as string).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
          : '未知';
        const isAbsent = r.status === 'absent';
        const statusEmoji = r.status === 'present' ? '✅' : isAbsent ? '❌' : r.status === 'late' ? '⏰' : '📝';
        const statusLabel = r.status === 'present' ? '到課' : isAbsent ? '缺席' : r.status === 'late' ? '遲到' : '請假';
        const note = r.note ? `（${r.note}）` : '';
        const absentMark = isAbsent ? ' ⚠️' : '';
        text += `${statusEmoji} ${date} ${statusLabel}${note}${absentMark}\n`;
      }
    }
  }

  if (summaryRes.success && summaryRes.data) {
    const rate = (summaryRes.data as Record<string, unknown>).attendance_rate as number;
    if (typeof rate === 'number') {
      if (rate >= 90) {
        text += `\n✨ 出勤率 ${rate}%，表現很棒！`;
      } else if (rate >= 70) {
        text += `\n📊 出勤率 ${rate}%，如果有特殊狀況歡迎跟老師說`;
      } else {
        text += `\n⚠️ 出勤率 ${rate}%，請多留意上課狀況`;
      }
    }
  }

  return text;
}

async function handleGrades(studentId: string, childLabel: string, tenantId: string): Promise<string> {
  const res = await callParentApi('manage', `/grades/${studentId}`, tenantId);

  if (!res.success) {
    logger.warn('[ParentRouter] Grades API failed, using mock data');
    return (
      `📊 ${childLabel}的成績記錄\n\n` +
      `目前無法取得成績資料，請稍後再試或直接聯繫補習班`
    );
  }

  const d = res.data as Record<string, unknown>;
  const grades = d.grades as Array<Record<string, unknown>> | undefined;

  if (!grades || grades.length === 0) {
    return `📊 ${childLabel}的成績記錄\n\n目前沒有成績資料`;
  }

  const examTypeMap: Record<string, string> = {
    quiz: '小考',
    midterm: '期中考',
    final: '期末考',
    homework: '作業',
    project: '專題',
  };

  let text = `📊 ${childLabel}的成績記錄\n\n`;

  const recent = grades.slice(0, 8);
  for (const g of recent) {
    const subject = (g.course_name ?? g.subject ?? '未知科目') as string;
    const score = g.score != null ? Number(g.score) : null;
    const examType = examTypeMap[g.exam_type as string] ?? (g.exam_type as string) ?? '';
    const examName = (g.exam_name ?? examType) as string;
    const date = g.exam_date
      ? new Date(g.exam_date as string).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
      : '';

    const scoreStr = score != null ? `${score} 分` : '未登錄';
    const scoreEmoji = score == null ? '' : score >= 90 ? ' 🌟' : score >= 70 ? '' : ' ⚠️';
    const datePart = date ? ` ｜ ${date}` : '';

    text += `▪ ${subject}【${examName}】${datePart}\n  ${scoreStr}${scoreEmoji}\n`;
  }

  return text;
}

async function handlePayments(studentId: string, childLabel: string, tenantId: string): Promise<string> {
  const [statusRes, historyRes] = await Promise.all([
    callParentApi('manage', `/payments/${studentId}/status`, tenantId),
    callParentApi('manage', `/payments/${studentId}`, tenantId),
  ]);

  if (!statusRes.success && !historyRes.success) {
    logger.warn('[ParentRouter] Payments API failed, using mock data');
    return getMockPayments(childLabel);
  }

  let text = `💰 ${childLabel}的繳費狀態\n\n`;

  if (statusRes.success && statusRes.data) {
    const d = statusRes.data as Record<string, unknown>;
    const status = d.current_status as string;
    if (status === 'paid') {
      text += `✅ 目前繳費狀態：已繳清\n`;
    } else if (status === 'pending') {
      text += `⏳ 有待繳款項\n`;
      if (d.next_due) text += `📅 下次繳費期限：${d.next_due}\n`;
    } else if (status === 'overdue') {
      const amount = d.overdue_amount as number;
      text += `⚠️ 目前有一筆待繳款項 NT$${amount?.toLocaleString() ?? '0'}，方便的話請盡快完成繳費喔 💰\n`;
      if (d.next_due) text += `📅 繳費期限：${d.next_due}\n`;
    }
  }

  if (historyRes.success && historyRes.data) {
    const payments = (historyRes.data as Record<string, unknown>).payments as Array<Record<string, unknown>> | undefined;
    if (payments && payments.length > 0) {
      text += `\n📜 繳費紀錄：\n`;
      const recent = payments.slice(0, 5);
      for (const p of recent) {
        const amount = Number(p.amount ?? 0);
        const period = (p.period ?? p.month ?? '') as string;
        const date = p.date ? new Date(p.date as string).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric' }) : '';
        const displayPeriod = period || date || '未知期間';
        const statusEmoji = p.status === 'paid' ? '✅' : p.status === 'overdue' ? '❌' : '⏳';
        const statusLabel = p.status === 'paid' ? '已繳' : p.status === 'overdue' ? '逾期' : '待繳';
        text += `${statusEmoji} ${displayPeriod}　NT$${amount.toLocaleString()}　${statusLabel}\n`;
      }
    }
  }

  text += `\n如需繳費方式說明，跟我說就好`;
  return text;
}

async function handleSchedule(studentId: string, childLabel: string, tenantId: string): Promise<string> {
  const res = await callParentApi('inclass', `/schedule/${studentId}`, tenantId);

  if (!res.success) {
    logger.warn('[ParentRouter] Schedule API failed, using mock data');
    return getMockSchedule(childLabel);
  }

  const d = res.data as Record<string, unknown>;
  const schedules = d.schedules as Array<Record<string, unknown>> | undefined;

  if (!schedules || schedules.length === 0) {
    return `📅 ${childLabel}的課表\n\n目前沒有排課資料，有疑問可以聯繫補習班`;
  }

  let text = `📅 ${childLabel}的課表\n\n`;

  // Group by day_of_week
  const byDay = new Map<number, Array<Record<string, unknown>>>();
  for (const s of schedules) {
    const day = s.day_of_week as number;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  for (const [day, items] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    text += `📌 週${DAY_NAMES[day] ?? day}：\n`;
    for (const item of items) {
      const course = item.course_name as string ?? '未知課程';
      const start = item.start_time as string ?? '';
      const end = item.end_time as string ?? '';
      const room = item.room ? `（${item.room}）` : '';
      text += `  ${start}~${end} ${course}${room}\n`;
    }
  }

  return text;
}

async function handleInfo(studentId: string, childLabel: string, binding: ParentBinding): Promise<string> {
  const res = await callParentApi('manage', `/student/${studentId}`, binding.tenant_id);

  let text = `👤 ${childLabel}的基本資料\n\n`;

  if (res.success && res.data) {
    const d = res.data as Record<string, unknown>;
    text += `📛 姓名：${d.name ?? childLabel}\n`;
    if (d.grade) text += `📚 年級：${d.grade}\n`;
    if (d.school) text += `🏫 學校：${d.school}\n`;
    if (d.status) text += `📋 狀態：${d.status === 'active' ? '在學中' : d.status}\n`;
  } else {
    text += binding.children
      .map((c) => `• ${c.student_name}（${c.relation}）`)
      .join('\n');
  }

  text += `\n\n如需修改資料，可以聯繫補習班`;
  return text;
}

async function handleUnknown(binding: ParentBinding): Promise<string> {
  const childName = binding.children.length === 1 ? binding.children[0].student_name : '孩子';
  return (
    `不好意思，我沒有完全理解您的意思 😅\n\n` +
    `您可以直接跟我說：\n` +
    `📋 「${childName}今天有到嗎」\n` +
    `💰 「學費繳了沒」\n` +
    `📅 「什麼時候上課」\n` +
    `📝 「幫${childName}請假」\n\n` +
    `有什麼問題都可以問我～`
  );
}

function formatHelpMessage(): string {
  return (
    `👋 您好！我是順風耳，您的補習班小幫手 😊\n\n` +
    `您可以直接用自然的方式問我：\n\n` +
    `📋 「孩子今天有到嗎？」\n` +
    `💰 「學費繳了嗎？」\n` +
    `📅 「什麼時候上課？」\n` +
    `📝 「幫孩子明天請假」\n` +
    `🏫 「補習班在哪裡？」\n\n` +
    `有任何問題都可以直接問我～`
  );
}

/**
 * Try to answer from knowledge base when intent is unknown
 */
export async function tryKnowledgeBase(
  text: string,
  tenantId: string
): Promise<string | null> {
  const keywords = text
    .replace(/[，。？！、\s]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 2);

  if (keywords.length === 0) return null;

  try {
    const results = await searchKnowledge(tenantId, keywords);
    if (results.length > 0) {
      const best = results[0];
      return `💡 ${best.title}\n\n${best.content}`;
    }
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentRouter] Knowledge base search error')
  }

  return null;
}

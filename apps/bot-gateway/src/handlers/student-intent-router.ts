/**
 * Student Intent Router — AI tutor + student data API execution
 * Mirrors the parent-intent-router pattern for the student (神算子) role.
 */
import { parseStudentIntent, type StudentContext } from '../modules/ai-engine';
import { studentApiClient, type Schedule, type Grade, type WeaknessReport } from '../modules/student-api-client';
import type { MemoryContext } from '../memory/types.js';

export type StudentIntent =
  | 'student.ask_question'
  | 'student.weakness'
  | 'student.homework_help'
  | 'student.schedule'
  | 'student.grades'
  | 'student.help'
  | 'student.unknown';

export interface StudentIntentParams {
  message: string;
  studentContext: StudentContext;
  studentId: string;
  tenantId: string;
  memoryContext?: MemoryContext | null;
  imageUrl?: string;
}

// ─── Keyword-based intent classification ─────────────────────────────────────

const KEYWORD_MAP: Array<{ keywords: string[]; intent: StudentIntent }> = [
  {
    keywords: ['弱點', '弱科', '弱項', '哪裡弱', '哪科弱', '比較差', '比較弱', '最弱', '不擅長'],
    intent: 'student.weakness',
  },
  {
    keywords: ['課表', '今天有什麼課', '今天有課', '今天上什麼', '幾點上課', '什麼時候上課', '課程安排', '上課時間'],
    intent: 'student.schedule',
  },
  {
    keywords: ['成績', '考幾分', '幾分', '分數', '考試結果', '測驗', '段考', '期中', '期末'],
    intent: 'student.grades',
  },
  {
    keywords: ['功能', '說明', 'help', '你好', '嗨', '哈囉', '你能做什麼'],
    intent: 'student.help',
  },
];

/**
 * Classify the student's message into an intent.
 * Image messages always route to homework_help.
 */
export function classifyStudentIntent(text: string, hasImage: boolean): StudentIntent {
  if (hasImage) return 'student.homework_help';

  const normalized = text.trim().toLowerCase();

  if (normalized === '/help' || normalized === '/start') {
    return 'student.help';
  }

  for (const { keywords, intent } of KEYWORD_MAP) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return intent;
    }
  }

  // Default: route to AI tutor for general questions
  return 'student.ask_question';
}

// ─── Intent execution ─────────────────────────────────────────────────────────

/**
 * Execute a classified student intent and return a reply string.
 */
export async function executeStudentIntent(params: StudentIntentParams): Promise<string> {
  const intent = classifyStudentIntent(params.message, !!params.imageUrl);
  return routeStudentIntent(intent, params);
}

async function routeStudentIntent(
  intent: StudentIntent,
  params: StudentIntentParams
): Promise<string> {
  switch (intent) {
    case 'student.ask_question':
      return handleAskQuestion(params);

    case 'student.homework_help':
      return handleHomeworkHelp(params);

    case 'student.weakness':
      return handleWeakness(params);

    case 'student.schedule':
      return handleSchedule(params);

    case 'student.grades':
      return handleGrades(params);

    case 'student.help':
      return formatHelpMessage();

    case 'student.unknown':
    default:
      return handleUnknown();
  }
}

// ─── Handler implementations ──────────────────────────────────────────────────

async function handleAskQuestion(params: StudentIntentParams): Promise<string> {
  const result = await parseStudentIntent(
    params.message,
    params.studentContext,
    params.tenantId,
    params.memoryContext
  );
  return result.ai_response ?? '抱歉，我現在有點問題，請稍後再試，或直接問老師喔！';
}

async function handleHomeworkHelp(params: StudentIntentParams): Promise<string> {
  const ctxWithImage: StudentContext = {
    ...params.studentContext,
    imageUrl: params.imageUrl,
  };
  const result = await parseStudentIntent(
    params.message,
    ctxWithImage,
    params.tenantId,
    params.memoryContext
  );
  return result.ai_response ?? '抱歉，我無法處理這張圖片，請稍後再試，或直接問老師喔！';
}

async function handleWeakness(params: StudentIntentParams): Promise<string> {
  const weakness = await studentApiClient.getStudentWeakness(params.tenantId, params.studentId);
  return formatWeaknessReport(weakness);
}

async function handleSchedule(params: StudentIntentParams): Promise<string> {
  const schedules = await studentApiClient.getStudentSchedule(params.tenantId, params.studentId);
  return formatScheduleResponse(schedules, params.studentContext.studentName);
}

async function handleGrades(params: StudentIntentParams): Promise<string> {
  const grades = await studentApiClient.getStudentGrades(params.tenantId, params.studentId);
  return formatGradesResponse(grades, params.studentContext.studentName);
}

function handleUnknown(): string {
  return (
    '嗯，我沒完全聽懂你的意思 😅\n\n' +
    '你可以試著問我：\n' +
    '📚「這題怎麼解？」\n' +
    '📊「我有哪些弱科？」\n' +
    '📅「我的課表是什麼？」\n' +
    '📝「我最近的成績怎樣？」\n\n' +
    '或是直接拍下你的作業/考卷給我看！'
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * Format weakness analysis into readable Traditional Chinese text with emoji indicators.
 */
export function formatWeaknessReport(weakness: WeaknessReport): string {
  if (!weakness.weakSubjects || weakness.weakSubjects.length === 0) {
    return (
      '📊 弱點分析\n\n' +
      '目前還沒有足夠的成績資料來分析弱科，多上幾次考試後就能幫你分析囉！'
    );
  }

  let text = '📊 弱點分析\n\n';
  text += `根據你最近的學習紀錄，以下是需要加強的科目：\n\n`;

  weakness.weakSubjects.forEach((subject, i) => {
    const emoji = i === 0 ? '🔴' : i === 1 ? '🟠' : '🟡';
    text += `${emoji} ${subject}\n`;
  });

  if (weakness.summary) {
    text += `\n💡 建議：${weakness.summary}\n`;
  }

  text += '\n加油！有問題隨時問我 💪';
  return text;
}

/**
 * Format weekly schedule as a grouped text table.
 */
export function formatScheduleResponse(schedules: Schedule[], studentName: string): string {
  if (schedules.length === 0) {
    return (
      `📅 ${studentName}的課表\n\n` +
      '目前沒有排課資料，有疑問可以問老師喔！'
    );
  }

  let text = `📅 ${studentName}的課表\n\n`;

  // Group by dayOfWeek
  const byDay = new Map<number, Schedule[]>();
  for (const s of schedules) {
    const day = s.dayOfWeek ?? 0;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  for (const [day, items] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    text += `📌 週${DAY_NAMES[day] ?? day}：\n`;
    for (const item of items) {
      const start = item.startTime ?? '';
      const end = item.endTime ?? '';
      const room = item.roomName ? `（${item.roomName}）` : '';
      text += `  ${start}~${end} ${item.courseId}${room}\n`;
    }
  }

  return text;
}

/**
 * Format recent grades with subject, score, and class average.
 */
export function formatGradesResponse(grades: Grade[], studentName: string): string {
  if (grades.length === 0) {
    return (
      `📊 ${studentName}的成績記錄\n\n` +
      '目前沒有成績資料，等考試結果出來後就能查囉！'
    );
  }

  let text = `📊 ${studentName}的最近成績\n\n`;

  const recent = grades.slice(0, 8);
  for (const g of recent) {
    const examName = g.examName ?? '考試';
    const score = g.score;
    const total = g.totalScore ?? 100;
    const percentage = g.percentage != null ? g.percentage : Math.round((score / total) * 100);
    const date = g.examDate
      ? new Date(g.examDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
      : '';

    const scoreEmoji = percentage >= 90 ? '🌟' : percentage >= 70 ? '📝' : '⚠️';
    const datePart = date ? ` ｜ ${date}` : '';
    const avgPart = g.letterGrade ? ` ｜ 等第 ${g.letterGrade}` : '';

    text += `${scoreEmoji} 【${examName}】${datePart}\n`;
    text += `   ${score}/${total} 分（${percentage}%）${avgPart}\n`;
  }

  return text;
}

function formatHelpMessage(): string {
  return (
    '👋 嗨！我是神算子，你的 AI 課業助教 📚\n\n' +
    '你可以這樣問我：\n\n' +
    '📖「這題不懂，可以解釋一下嗎？」\n' +
    '📸「（拍照上傳）這道題怎麼解？」\n' +
    '📊「我有哪些弱科？」\n' +
    '📅「我的課表是什麼？」\n' +
    '📝「我最近的成績怎樣？」\n\n' +
    '有問題直接說，我在這裡 😊'
  );
}

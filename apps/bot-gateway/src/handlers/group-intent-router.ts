/**
 * Group Intent Router — handles group message intents
 * Most intents use AI response directly (marketing persona is expressive enough)
 * Private data requests are blocked and redirected to DM
 */
import { parseGroupIntent, type GroupContext, type IntentResult } from '../modules/ai-engine';
import { getKnowledge } from '../firestore/knowledge-base';
import { searchKnowledge } from '../firestore/knowledge-base';
import { logger } from '../utils/logger';

/** Intents that indicate a private data request — must be blocked in groups */
const PRIVATE_INTENTS = new Set([
  'group.private_redirect',
  'attendance.today',
  'attendance.report',
  'finance.status',
  'finance.history',
  'leave.request',
  'schedule.query',
]);

/** Check if an AI response mentions private-data keywords (safety net) */
function containsPrivateDataHint(text: string): boolean {
  const privateKeywords = [
    '出勤', '缺席', '遲到', '請假紀錄',
    '繳費紀錄', '繳了沒', '欠費',
    '成績', '分數', '考幾分',
    '個人課表',
  ];
  return privateKeywords.some((kw) => text.includes(kw));
}

export interface GroupIntentResponse {
  text: string;
  isPrivateRedirect: boolean;
}

/**
 * Process a group message: parse intent via AI, apply safety checks, return response
 */
export async function handleGroupIntent(
  userMessage: string,
  groupCtx: GroupContext,
  tenantId: string
): Promise<GroupIntentResponse> {
  // 1. Parse intent via AI
  let ai: IntentResult;
  try {
    ai = await parseGroupIntent(userMessage, groupCtx);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[GroupRouter] AI parsing failed');
    // Fallback: try knowledge base
    const kbAnswer = await tryGroupKnowledgeBase(userMessage, tenantId);
    if (kbAnswer) {
      return { text: kbAnswer, isPrivateRedirect: false };
    }
    return {
      text: '不好意思，我剛剛沒接住 😅 可以再問一次嗎？',
      isPrivateRedirect: false,
    };
  }

  // 2. Safety check: block private data intents
  if (PRIVATE_INTENTS.has(ai.intent)) {
    return buildPrivateRedirect(groupCtx.botUsername);
  }

  // 3. Safety net: even if AI didn't flag it, check the user's original message
  if (containsPrivateDataHint(userMessage)) {
    // Double-check with AI intent — if AI said it's a general/marketing question, trust AI
    if (!ai.intent.startsWith('group.')) {
      return buildPrivateRedirect(groupCtx.botUsername);
    }
  }

  // 4. Use AI response directly (the marketing persona handles most intents well)
  if (ai.ai_response) {
    return { text: ai.ai_response, isPrivateRedirect: false };
  }

  // 5. Fallback: knowledge base search
  const kbAnswer = await tryGroupKnowledgeBase(userMessage, tenantId);
  if (kbAnswer) {
    return { text: kbAnswer, isPrivateRedirect: false };
  }

  // 6. Generic fallback
  return {
    text: `歡迎詢問！您可以問我課程介紹、學費、上課時間、師資，或是升學讀書建議 📚\n\n想了解更多，也歡迎直接撥打補習班電話${groupCtx.tenantPhone ? ` ${groupCtx.tenantPhone}` : ''} 😊`,
    isPrivateRedirect: false,
  };
}

function buildPrivateRedirect(botUsername?: string): GroupIntentResponse {
  const botMention = botUsername ? ` 👉 @${botUsername}` : '';
  return {
    text: `😊 這類查詢涉及個人資料，為了保護隱私，請私訊我查詢唷！${botMention}\n\n私聊中我可以幫您查出缺勤、繳費狀況、課表等個人資訊～`,
    isPrivateRedirect: true,
  };
}

async function tryGroupKnowledgeBase(
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
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[GroupRouter] Knowledge base search error');
  }

  return null;
}

/**
 * Build GroupContext by loading knowledge base entries for a tenant
 */
export async function buildGroupContext(
  tenantName: string,
  tenantId: string,
  botUsername?: string
): Promise<GroupContext> {
  let knowledgeBase = '';

  try {
    const entries = await getKnowledge(tenantId);
    if (entries.length > 0) {
      knowledgeBase = entries
        .map((e) => `### ${e.title}\n${e.content}`)
        .join('\n\n');
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[GroupRouter] Failed to load knowledge base');
  }

  return {
    tenantName,
    knowledgeBase: knowledgeBase || undefined,
    botUsername,
  };
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { ConversationSummary, TenantFact, UserMemoryMessage } from './types.js';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const COMPACTION_PROMPT = `你是一個對話摘要助手。請將以下對話摘要成：
1. 一段簡短摘要（50字以內）
2. 關鍵事實列表（最多5項）

重點記錄：用戶經常問什麼、偏好、糾正過的錯誤、重要決定。

回傳 JSON：{ "summary": "...", "key_facts": ["...", "..."] }`;

const TENANT_FACT_EXTRACTION_PROMPT = `你是一個補習班記憶助手。請分析以下對話回合，判斷是否有值得記錄的補習班習慣或偏好。

只記錄明確的、可重複使用的資訊，例如：
- 班主任糾正了某個稱呼方式
- 班主任表達了某個操作偏好
- 發現了某個補習班特有的工作流程

如果沒有值得記錄的資訊，回傳 null。

回傳 JSON 格式：
{
  "key": "唯一識別鍵（英文snake_case）",
  "category": "preference | naming | workflow | policy | correction",
  "content": "具體描述",
  "confidence": 0.0-1.0
}

或回傳：null`;

interface CompactionResult {
  summary: string;
  key_facts: string[];
}

interface TenantFactExtraction {
  key: string;
  category: TenantFact['category'];
  content: string;
  confidence: number;
}

export async function compactConversation(messages: UserMemoryMessage[]): Promise<ConversationSummary> {
  const now = new Date();
  const periodStart = messages.length > 0 ? new Date(messages[0].timestamp) : now;
  const periodEnd = messages.length > 0 ? new Date(messages[messages.length - 1].timestamp) : now;

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? '用戶' : '助手'}：${m.content}`)
    .join('\n');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: conversationText }] }],
      systemInstruction: { role: 'system', parts: [{ text: COMPACTION_PROMPT }] },
    });

    const text = result.response.text();
    const parsed = JSON.parse(text) as CompactionResult;

    return {
      period_start: periodStart,
      period_end: periodEnd,
      summary: parsed.summary ?? '',
      key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts : [],
      message_count: messages.length,
      created_at: now,
    };
  } catch (err) {
    logger.warn({ err }, '[MemoryExtractor] compactConversation failed, using fallback summary');
    return {
      period_start: periodStart,
      period_end: periodEnd,
      summary: `對話摘要（${messages.length} 則訊息）`,
      key_facts: [],
      message_count: messages.length,
      created_at: now,
    };
  }
}

export async function extractTenantFact(
  userMessage: string,
  botResponse: string
): Promise<TenantFact | null> {
  const turnText = `用戶：${userMessage}\n助手：${botResponse}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: turnText }] }],
      systemInstruction: { role: 'system', parts: [{ text: TENANT_FACT_EXTRACTION_PROMPT }] },
    });

    const text = result.response.text().trim();

    // Model may return the literal string "null"
    if (text === 'null' || text === '') return null;

    const parsed = JSON.parse(text) as TenantFactExtraction | null;
    if (!parsed) return null;

    const now = new Date();
    return {
      key: parsed.key,
      category: parsed.category,
      content: parsed.content,
      confidence: parsed.confidence,
      source: 'conversation',
      last_used_at: now,
      created_at: now,
    };
  } catch (err) {
    logger.warn({ err }, '[MemoryExtractor] extractTenantFact failed');
    return null;
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import type { TenantCache } from '../firestore/cache';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export interface IntentResult {
  intent: string;
  confidence: number;
  params: Record<string, unknown>;
  need_clarification: boolean;
  clarification_question: string | null;
}

function buildSystemPrompt(cache: TenantCache | null): string {
  let prompt = `你是 94CramBot，一個補習班管理助手。你的工作是解析班主任的自然語言指令，判斷意圖並萃取參數。

可用的意圖：
- inclass.leave: 登記學生請假（需要：student_name, date, reason?）
- inclass.late: 登記學生遲到（需要：student_name, date）
- inclass.query: 查詢出缺勤（需要：class_name? 或 student_name?, date?）
- manage.payment: 登記繳費（需要：student_name, amount, payment_type?, date?）
- manage.add_student: 新增學生（需要：name, class_name?, parent_phone?, parent_name?）
- manage.query_student: 查學生資料（需要：student_name 或 keyword）
- manage.query_finance: 查財務報表（需要：start_date?, end_date?, payment_type?）
- stock.ship: 出貨（需要：item_name, quantity, destination）
- stock.restock: 進貨（需要：item_name, quantity）
- stock.query: 查庫存（需要：item_name?）
- system.switch: 切換補習班
- system.help: 查看使用說明
- unknown: 無法辨識

今天的日期是 ${new Date().toISOString().split('T')[0]}。
如果使用者說「今天」，date 就是今天。
如果使用者說「這個月」，start_date 是本月 1 號，end_date 是今天。

你必須輸出 JSON，格式如下：
{
  "intent": "意圖 ID",
  "confidence": 0.0-1.0,
  "params": { ... },
  "need_clarification": false,
  "clarification_question": null
}

如果資訊不足以確定意圖或參數，設 need_clarification 為 true 並提供 clarification_question。`;

  if (cache) {
    if (cache.students.length > 0) {
      prompt += `\n\n該補習班的學生名單：\n${cache.students.map((s) => `- ${s.name}（${s.class_name}，ID: ${s.id}）`).join('\n')}`;
    }
    if (cache.classes.length > 0) {
      prompt += `\n\n班級列表：${cache.classes.join('、')}`;
    }
    if (cache.items.length > 0) {
      prompt += `\n\n品項列表：\n${cache.items.map((i) => `- ${i.name}（庫存: ${i.stock}，ID: ${i.id}）`).join('\n')}`;
    }
    if (cache.warehouses.length > 0) {
      prompt += `\n\n倉庫/分校：\n${cache.warehouses.map((w) => `- ${w.name}（ID: ${w.id}）`).join('\n')}`;
    }
  }

  return prompt;
}

export async function parseIntent(
  userMessage: string,
  cache: TenantCache | null
): Promise<IntentResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const systemPrompt = buildSystemPrompt(cache);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  try {
    return JSON.parse(text) as IntentResult;
  } catch {
    return {
      intent: 'unknown',
      confidence: 0,
      params: {},
      need_clarification: true,
      clarification_question: '抱歉，我沒聽懂，可以再說一次嗎？',
    };
  }
}

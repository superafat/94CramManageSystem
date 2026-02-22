import type { Intent, LLMRoute } from './types'

/** Intent → model routing table */
const ROUTES: LLMRoute[] = [
  { intent: 'faq',        model: 'flash-lite', timeoutMs: 5000,  systemPrompt: '你是補習班 FAQ 助手。用繁體中文簡潔回答。' },
  { intent: 'schedule',   model: 'flash-lite', timeoutMs: 5000,  systemPrompt: '你是課程排班助手。回答課表與時間相關問題。' },
  { intent: 'attendance', model: 'flash-lite', timeoutMs: 5000,  systemPrompt: '你是出缺席查詢助手。' },
  { intent: 'billing',    model: 'flash',      timeoutMs: 8000,  systemPrompt: '你是帳務查詢助手。謹慎處理金額資訊。' },
  { intent: 'report',     model: 'flash',      timeoutMs: 15000, systemPrompt: '你是報表生成助手。用結構化格式輸出。' },
  { intent: 'homework',   model: 'flash',      timeoutMs: 8000,  systemPrompt: '你是作業管理助手。' },
  { intent: 'enrollment', model: 'sonnet',     timeoutMs: 12000, systemPrompt: '你是招生諮詢顧問。溫暖專業地回答家長問題。' },
  { intent: 'complaint',  model: 'sonnet',     timeoutMs: 12000, systemPrompt: '你是客訴處理專員。同理心優先，謹慎回覆。' },
  { intent: 'general',    model: 'flash',      timeoutMs: 8000,  systemPrompt: '你是補習班 AI 助手。用繁體中文回答。' },
]

const routeMap = new Map(ROUTES.map(r => [r.intent, r]))

export function getRoute(intent: Intent): LLMRoute {
  return routeMap.get(intent) ?? routeMap.get('general')!
}

/** Classify intent from user query using keyword matching (zero-cost) */
export function classifyIntent(query: string): Intent {
  const q = query.toLowerCase()
  const rules: [RegExp, Intent][] = [
    [/投訴|客訴|不滿|退費|抱怨|態度/, 'complaint'],
    [/報名|招生|試聽|入學|插班/, 'enrollment'],
    [/帳|費用|繳費|收據|發票|金額|學費/, 'billing'],
    [/報表|統計|分析|匯出/, 'report'],
    [/課表|排課|時間|幾點|星期/, 'schedule'],
    [/出席|缺席|請假|遲到|簽到/, 'attendance'],
    [/作業|功課|考卷|成績|分數/, 'homework'],
    [/什麼是|怎麼|如何|可以嗎|有沒有|請問/, 'faq'],
  ]
  for (const [re, intent] of rules) {
    if (re.test(q)) return intent
  }
  return 'general'
}

export interface ChatRequest {
  query: string
  branchId: string
  tenantId?: string
  userId?: string
  context?: Record<string, unknown>
  intent?: Intent
}

export interface ChatResponse {
  answer: string
  model: string
  intent: Intent
  latencyMs: number
  tokensUsed?: number
  sources?: RAGSource[]
}

export interface RAGSearchRequest {
  query: string
  branchId: string
  tenantId?: string
  topK?: number
  threshold?: number
}

export interface RAGSource {
  content: string
  score: number
  metadata: Record<string, unknown>
}

export type Intent =
  | 'faq'
  | 'schedule'
  | 'attendance'
  | 'billing'
  | 'report'
  | 'enrollment'
  | 'complaint'
  | 'homework'
  | 'general'

export interface LLMRoute {
  intent: Intent
  model: 'flash-lite' | 'flash' | 'sonnet'
  timeoutMs: number
  systemPrompt: string
}

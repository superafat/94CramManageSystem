export interface ChatParams {
  query: string
  systemPrompt: string
  conversationHistory?: ConversationMessage[]
  ragContext?: string
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
}

export interface ChatResult {
  content: string
  modelName: string
  tokensUsed?: number
  finishReason?: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'model'
  content: string
}

export interface RateLimitInfo {
  requestsPerMinute: number
  requestsPerDay: number
  currentMinuteUsage: number
  currentDayUsage: number
  isLimited: boolean
}

export interface ProviderConfig {
  apiKey: string
  endpoint?: string
  defaultTimeout?: number
  defaultMaxTokens?: number
  defaultTemperature?: number
}

export type ProviderName = 'gemini' | 'claude' | 'minimax'

export interface ProviderError extends Error {
  provider: ProviderName
  statusCode?: number
  retryable: boolean
  quotaExceeded?: boolean
}

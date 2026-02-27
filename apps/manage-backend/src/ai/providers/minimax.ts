import type { LLMProvider } from './interface'
import type { ChatParams, ChatResult, RateLimitInfo, ProviderConfig } from './types'

export class MiniMaxProvider implements LLMProvider {
  readonly name = 'minimax' as const
  private config: ProviderConfig
  private requestCount = { minute: 0, day: 0 }
  private lastMinuteReset = Date.now()
  private lastDayReset = Date.now()
  private healthScore = 100

  constructor(config: ProviderConfig) {
    this.config = config
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    this.updateRateLimits()
    
    const {
      query,
      systemPrompt,
      conversationHistory = [],
      timeoutMs = this.config.defaultTimeout || 10000,
      maxTokens = this.config.defaultMaxTokens || 300,
      temperature = this.config.defaultTemperature || 0.3,
    } = params

    const messages: Array<{ role: string; content: string }> = []
    
    messages.push({ role: 'system', content: systemPrompt })

    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    messages.push({ role: 'user', content: query })

    try {
      const resp = await fetch('https://api.minimax.chat/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.5',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })

      const data = await resp.json() as { base_resp?: { status_code?: number; status_msg?: string }; choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; usage?: { total_tokens?: number } }

      if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
        throw new Error(`MiniMax API error: ${data.base_resp.status_msg}`)
      }

      let content = data.choices?.[0]?.message?.content || ''
      
      // 移除 <think>...</think> reasoning 標籤
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

      if (!content) {
        throw new Error('MiniMax returned empty response')
      }

      this.requestCount.minute++
      this.requestCount.day++
      this.healthScore = Math.min(100, this.healthScore + 1)

      return {
        content,
        modelName: 'MiniMax-M2.5',
        tokensUsed: data.usage?.total_tokens,
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
      }
    } catch (error) {
      this.healthScore = Math.max(0, this.healthScore - 10)
      throw this.wrapError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && this.healthScore > 20
  }

  getRateLimitInfo(): RateLimitInfo {
    this.updateRateLimits()
    return {
      requestsPerMinute: 30,
      requestsPerDay: 500,
      currentMinuteUsage: this.requestCount.minute,
      currentDayUsage: this.requestCount.day,
      isLimited: this.requestCount.minute >= 30 || this.requestCount.day >= 500,
    }
  }

  estimateCost(params: ChatParams): number {
    // MiniMax M2.5 估算成本
    const estimatedInputTokens = (params.query.length + params.systemPrompt.length) / 4
    const estimatedOutputTokens = (params.maxTokens || 300)
    return (estimatedInputTokens * 0.10 + estimatedOutputTokens * 0.40) / 1_000_000
  }

  getHealthScore(): number {
    return this.healthScore
  }

  private updateRateLimits() {
    const now = Date.now()
    if (now - this.lastMinuteReset > 60000) {
      this.requestCount.minute = 0
      this.lastMinuteReset = now
    }
    if (now - this.lastDayReset > 86400000) {
      this.requestCount.day = 0
      this.lastDayReset = now
    }
  }

  private wrapError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error)
    const status = (error instanceof Error && 'status' in error) ? (error as Error & { status?: number }).status : undefined
    const err = new Error(`MiniMax error: ${message}`) as Error & { provider?: string; retryable?: boolean; quotaExceeded?: boolean; statusCode?: number }
    err.provider = 'minimax'
    err.retryable = message.includes('timeout') || message.includes('503')
    err.quotaExceeded = message.includes('quota') || message.includes('429')
    err.statusCode = status
    return err
  }
}

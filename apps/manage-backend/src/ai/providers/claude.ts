import type { LLMProvider } from './interface'
import type { ChatParams, ChatResult, RateLimitInfo, ProviderConfig } from './types'

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const
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
      timeoutMs = this.config.defaultTimeout || 12000,
      maxTokens = this.config.defaultMaxTokens || 300,
      temperature = this.config.defaultTemperature || 0.3,
    } = params

    const messages: Array<{ role: string; content: string }> = []

    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content,
      })
    }

    messages.push({ role: 'user', content: query })

    try {
      const endpoint = this.config.endpoint || 'https://api.anthropic.com/v1/messages'
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          system: systemPrompt,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`Claude API error ${resp.status}: ${errorText}`)
      }

      const data = await resp.json() as any

      const content = data.content?.[0]?.text || ''
      
      if (!content) {
        throw new Error('Claude returned empty response')
      }

      this.requestCount.minute++
      this.requestCount.day++
      this.healthScore = Math.min(100, this.healthScore + 1)

      return {
        content,
        modelName: 'claude-3-5-haiku-20241022',
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
        finishReason: data.stop_reason || 'stop',
      }
    } catch (error: any) {
      this.healthScore = Math.max(0, this.healthScore - 10)
      throw this.wrapError(error)
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && this.healthScore > 20
  }

  getRateLimitInfo(): RateLimitInfo {
    this.updateRateLimits()
    return {
      requestsPerMinute: 50,
      requestsPerDay: 1000,
      currentMinuteUsage: this.requestCount.minute,
      currentDayUsage: this.requestCount.day,
      isLimited: this.requestCount.minute >= 50 || this.requestCount.day >= 1000,
    }
  }

  estimateCost(params: ChatParams): number {
    // Claude 3.5 Haiku: $1.00 / 1M input, $5.00 / 1M output
    const estimatedInputTokens = (params.query.length + params.systemPrompt.length) / 4
    const estimatedOutputTokens = (params.maxTokens || 300)
    return (estimatedInputTokens * 1.00 + estimatedOutputTokens * 5.00) / 1_000_000
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

  private wrapError(error: any): Error {
    const err: any = new Error(`Claude error: ${error.message}`)
    err.provider = 'claude'
    err.retryable = error.message?.includes('timeout') || error.message?.includes('503') || error.message?.includes('529')
    err.quotaExceeded = error.message?.includes('quota') || error.message?.includes('429')
    err.statusCode = error.status
    return err
  }
}

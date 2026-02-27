import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider } from './interface'
import type { ChatParams, ChatResult, RateLimitInfo, ProviderConfig } from './types'

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const
  private client: GoogleGenerativeAI
  private config: ProviderConfig
  private requestCount = { minute: 0, day: 0 }
  private lastMinuteReset = Date.now()
  private lastDayReset = Date.now()
  private healthScore = 100

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new GoogleGenerativeAI(config.apiKey)
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    this.updateRateLimits()
    
    const {
      query,
      systemPrompt,
      conversationHistory = [],
      ragContext,
      timeoutMs = this.config.defaultTimeout || 10000,
      maxTokens = this.config.defaultMaxTokens || 300,
      temperature = this.config.defaultTemperature || 0.3,
    } = params

    let fullSystemPrompt = systemPrompt
    if (ragContext) {
      fullSystemPrompt += `\n\n【知識庫資料】\n${ragContext}`
    }

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: fullSystemPrompt,
    })

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

    for (const msg of conversationHistory) {
      const role = msg.role === 'assistant' ? 'model' : 'user'
      contents.push({
        role,
        parts: [{ text: msg.content }],
      })
    }

    contents.push({ role: 'user', parts: [{ text: query }] })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const result = await model.generateContent({ contents })
      const content = result.response.text()
      
      this.requestCount.minute++
      this.requestCount.day++
      this.healthScore = Math.min(100, this.healthScore + 1)

      return {
        content,
        modelName: 'gemini-2.5-flash-lite',
        finishReason: 'stop',
      }
    } catch (error) {
      this.healthScore = Math.max(0, this.healthScore - 10)
      throw this.wrapError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      clearTimeout(timer)
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && this.healthScore > 20
  }

  getRateLimitInfo(): RateLimitInfo {
    this.updateRateLimits()
    return {
      requestsPerMinute: 60,
      requestsPerDay: 1500,
      currentMinuteUsage: this.requestCount.minute,
      currentDayUsage: this.requestCount.day,
      isLimited: this.requestCount.minute >= 60 || this.requestCount.day >= 1500,
    }
  }

  estimateCost(params: ChatParams): number {
    // Gemini 2.5 Flash Lite: $0.075 / 1M input, $0.30 / 1M output
    const estimatedInputTokens = (params.query.length + params.systemPrompt.length) / 4
    const estimatedOutputTokens = (params.maxTokens || 300)
    return (estimatedInputTokens * 0.075 + estimatedOutputTokens * 0.30) / 1_000_000
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
    const err = new Error(`Gemini error: ${message}`) as Error & { provider?: string; retryable?: boolean; quotaExceeded?: boolean }
    err.provider = 'gemini'
    err.retryable = message.includes('timeout') || message.includes('503')
    err.quotaExceeded = message.includes('quota') || message.includes('429')
    return err
  }
}

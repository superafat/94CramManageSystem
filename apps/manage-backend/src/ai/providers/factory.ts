import { config } from '../../config'
import type { LLMProvider } from './interface'
import type { ProviderName, ChatParams, ChatResult } from './types'
import { GeminiProvider } from './gemini'
import { ClaudeProvider } from './claude'
import { MiniMaxProvider } from './minimax'

export type ProviderStrategy = 'web' | 'line-bot' | 'balanced'

export interface FallbackChain {
  primary: ProviderName
  secondary?: ProviderName
  tertiary?: ProviderName
}

export class ProviderFactory {
  private providers = new Map<ProviderName, LLMProvider>()
  private strategy: ProviderStrategy = 'web'

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    if (config.GEMINI_API_KEY) {
      this.providers.set('gemini', new GeminiProvider({
        apiKey: config.GEMINI_API_KEY,
        defaultTimeout: 10000,
        defaultMaxTokens: 300,
        defaultTemperature: 0.3,
      }))
    }

    if (config.ANTHROPIC_API_KEY) {
      this.providers.set('claude', new ClaudeProvider({
        apiKey: config.ANTHROPIC_API_KEY,
        defaultTimeout: 12000,
        defaultMaxTokens: 300,
        defaultTemperature: 0.3,
      }))
    }

    if (config.MINIMAX_API_KEY) {
      this.providers.set('minimax', new MiniMaxProvider({
        apiKey: config.MINIMAX_API_KEY,
        defaultTimeout: 10000,
        defaultMaxTokens: 300,
        defaultTemperature: 0.3,
      }))
    }
  }

  setStrategy(strategy: ProviderStrategy) {
    this.strategy = strategy
  }

  getProvider(name: ProviderName): LLMProvider | undefined {
    return this.providers.get(name)
  }

  async getBestProvider(): Promise<LLMProvider | null> {
    const chain = this.getFallbackChain()
    
    for (const providerName of [chain.primary, chain.secondary, chain.tertiary]) {
      if (!providerName) continue
      
      const provider = this.providers.get(providerName)
      if (!provider) continue

      const available = await provider.isAvailable()
      const rateLimit = provider.getRateLimitInfo()
      
      if (available && !rateLimit.isLimited) {
        return provider
      }
    }

    return null
  }

  getFallbackChain(): FallbackChain {
    switch (this.strategy) {
      case 'line-bot':
        return {
          primary: 'minimax',
          secondary: 'gemini',
          tertiary: 'claude',
        }
      
      case 'balanced':
        // 基於 health score 動態選擇
        const providers = Array.from(this.providers.entries())
        const sorted = providers.sort((a, b) => b[1].getHealthScore() - a[1].getHealthScore())
        return {
          primary: sorted[0]?.[0] || 'gemini',
          secondary: sorted[1]?.[0],
          tertiary: sorted[2]?.[0],
        }
      
      case 'web':
      default:
        return {
          primary: 'gemini',
          secondary: 'claude',
          tertiary: 'minimax',
        }
    }
  }

  async chatWithFallback(params: ChatParams): Promise<ChatResult & { provider: ProviderName }> {
    const chain = this.getFallbackChain()
    const attempts: Array<{ provider: ProviderName; error: Error }> = []

    for (const providerName of [chain.primary, chain.secondary, chain.tertiary]) {
      if (!providerName) continue

      const provider = this.providers.get(providerName)
      if (!provider) continue

      try {
        const available = await provider.isAvailable()
        if (!available) {
          console.warn(`[Factory] ${providerName} is not available, trying next...`)
          continue
        }

        const rateLimit = provider.getRateLimitInfo()
        if (rateLimit.isLimited) {
          console.warn(`[Factory] ${providerName} rate limit exceeded, trying next...`)
          continue
        }

        console.log(`[Factory] Using provider: ${providerName}`)
        const result = await provider.chat(params)
        
        return {
          ...result,
          provider: providerName,
        }
      } catch (error: any) {
        console.warn(`[Factory] ${providerName} failed: ${error.message}`)
        attempts.push({ provider: providerName, error })
        
        if (!error.retryable) {
          console.warn(`[Factory] ${providerName} error is not retryable, trying next provider...`)
        }
      }
    }

    const errorMsg = attempts.map(a => `${a.provider}: ${a.error.message}`).join('; ')
    throw new Error(`All providers failed. Attempts: ${errorMsg}`)
  }

  getAvailableProviders(): ProviderName[] {
    return Array.from(this.providers.keys())
  }

  async getProvidersStatus() {
    const status: Record<string, any> = {}
    
    for (const [name, provider] of this.providers) {
      const available = await provider.isAvailable()
      const rateLimit = provider.getRateLimitInfo()
      const health = provider.getHealthScore()
      
      status[name] = {
        available,
        health,
        rateLimit,
      }
    }

    return status
  }
}

// Singleton instance
export const providerFactory = new ProviderFactory()

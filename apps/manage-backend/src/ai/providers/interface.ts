import type { ChatParams, ChatResult, RateLimitInfo, ProviderName } from './types'

export interface LLMProvider {
  readonly name: ProviderName
  
  /**
   * Generate chat completion
   */
  chat(params: ChatParams): Promise<ChatResult>
  
  /**
   * Check if provider is available (has API key and is healthy)
   */
  isAvailable(): Promise<boolean>
  
  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): RateLimitInfo
  
  /**
   * Estimate cost for a request (in USD)
   */
  estimateCost(params: ChatParams): number
  
  /**
   * Get provider health score (0-100)
   */
  getHealthScore(): number
}

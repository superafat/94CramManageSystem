import type { ChatRequest, ChatResponse, LLMRoute } from './types'
import { classifyIntent, getRoute } from './router'
import { providerFactory } from './providers/factory'
import { quotaManager } from './quota'
import type { ConversationMessage as ProviderMessage } from './providers/types'

export interface ConversationMessage {
  role: 'user' | 'model'
  text: string
}

export async function chat(
  req: ChatRequest,
  ragContext?: string,
  systemPromptOverride?: string,
  conversationHistory?: ConversationMessage[]
): Promise<ChatResponse> {
  const intent = req.intent ?? classifyIntent(req.query)
  const route = getRoute(intent)
  const start = Date.now()

  const effectiveRoute = systemPromptOverride
    ? { ...route, systemPrompt: systemPromptOverride }
    : route

  // 如果有 systemPromptOverride（LINE Bot），切換到 LINE Bot 策略
  if (systemPromptOverride) {
    providerFactory.setStrategy('line-bot')
  } else {
    providerFactory.setStrategy('web')
  }

  // 轉換對話歷史格式
  const history: ProviderMessage[] = conversationHistory?.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.text,
  })) || []

  try {
    const result = await providerFactory.chatWithFallback({
      query: req.query,
      systemPrompt: effectiveRoute.systemPrompt,
      conversationHistory: history,
      ragContext,
      timeoutMs: effectiveRoute.timeoutMs,
      maxTokens: 300,
      temperature: 0.3,
    })

    // 記錄配額使用
    const estimatedTokens = result.tokensUsed || 
      Math.floor((req.query.length + effectiveRoute.systemPrompt.length) / 4) + 300
    
    const provider = providerFactory.getProvider(result.provider)
    const cost = provider?.estimateCost({
      query: req.query,
      systemPrompt: effectiveRoute.systemPrompt,
      maxTokens: 300,
    }) || 0

    quotaManager.recordUsage(result.provider, estimatedTokens, cost)

    return {
      answer: result.content,
      model: result.modelName,
      intent,
      latencyMs: Date.now() - start,
      tokensUsed: result.tokensUsed,
    }
  } catch (err: any) {
    console.error('[LLM] All providers failed:', err.message)
    throw err
  }
}

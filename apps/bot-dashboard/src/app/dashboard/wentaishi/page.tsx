'use client'

import { BotPage } from '@/components/BotPage'

const config = {
  id: 'wentaishi',
  name: '聞太師',
  icon: '🤖',
  platform: 'line' as const,
  audience: '家長',
  apiPrefix: '/api',
  conversationsEndpoint: '/api/conversations?bot=wentaishi',
  bindingsEndpoint: '/api/parent-bindings',
  settingsEndpoint: '/api/settings',
  usageEndpoint: '/api/usage',
  subscriptionKey: 'parent_bot_active',
}

export default function WentaishiPage() {
  return <BotPage config={config} />
}

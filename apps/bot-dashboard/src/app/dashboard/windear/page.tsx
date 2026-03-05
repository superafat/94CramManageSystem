'use client'

import { BotPage } from '@/components/BotPage'

const config = {
  id: 'windear',
  name: '順風耳',
  icon: '👨‍👩‍👧',
  platform: 'telegram' as const,
  audience: '學生 / 家長',
  apiPrefix: '/api',
  conversationsEndpoint: '/api/conversations?bot=windear',
  bindingsEndpoint: '/api/parent-bindings',
  settingsEndpoint: '/api/settings',
  usageEndpoint: '/api/usage',
  subscriptionKey: 'parent_bot_active',
}

export default function WindearPage() {
  return <BotPage config={config} />
}

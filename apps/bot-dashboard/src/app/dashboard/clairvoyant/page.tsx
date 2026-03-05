'use client'

import { BotPage } from '@/components/BotPage'

const config = {
  id: 'clairvoyant',
  name: '千里眼',
  icon: '🏫',
  platform: 'telegram' as const,
  audience: '行政 / 館長',
  apiPrefix: '/api',
  conversationsEndpoint: '/api/conversations?bot=clairvoyant',
  bindingsEndpoint: '/api/bindings',
  settingsEndpoint: '/api/settings',
  usageEndpoint: '/api/usage',
  subscriptionKey: 'admin_bot_active',
}

export default function ClairvoyantPage() {
  return <BotPage config={config} />
}

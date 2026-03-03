'use client'

import { useState } from 'react'
import type { BillingTab } from './_types'
import { DaycareTab } from './_components/daycare-tab'
import { GroupTab } from './_components/group-tab'
import { IndividualTab } from './_components/individual-tab'

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: BillingTab; label: string; icon: string }[] = [
  { key: 'daycare', label: '安親班', icon: '🏫' },
  { key: 'group', label: '團班', icon: '👥' },
  { key: 'individual', label: '個指', icon: '🎯' },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>('group')

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-text">💰 帳務管理</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'daycare' && <DaycareTab />}
      {activeTab === 'group' && <GroupTab />}
      {activeTab === 'individual' && <IndividualTab />}
    </div>
  )
}

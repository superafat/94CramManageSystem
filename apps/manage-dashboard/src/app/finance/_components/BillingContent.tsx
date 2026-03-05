'use client'

import { useState } from 'react'

type BillingTab = 'daycare' | 'group' | 'individual'

// Lazy-load the existing billing tab components
import { DaycareTab } from '../../billing/_components/daycare-tab'
import { GroupTab } from '../../billing/_components/group-tab'
import { IndividualTab } from '../../billing/_components/individual-tab'

const TABS: { key: BillingTab; label: string; icon: string }[] = [
  { key: 'daycare', label: '安親班', icon: '🏫' },
  { key: 'group', label: '團班', icon: '👥' },
  { key: 'individual', label: '個指', icon: '🎯' },
]

export default function BillingContent() {
  const [activeTab, setActiveTab] = useState<BillingTab>('group')

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span className="hidden sm:inline">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'daycare' && <DaycareTab />}
      {activeTab === 'group' && <GroupTab />}
      {activeTab === 'individual' && <IndividualTab />}
    </div>
  )
}

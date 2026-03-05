'use client'

import { useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { OverviewTab } from './_components/OverviewTab'
import BillingContent from './_components/BillingContent'
import SalaryContent from './_components/SalaryContent'
import ExpensesContent from './_components/ExpensesContent'

type FinanceTab = 'overview' | 'billing' | 'salary' | 'expenses'

const TABS: { key: FinanceTab; label: string; icon: string }[] = [
  { key: 'overview', label: '總覽', icon: '📊' },
  { key: 'billing', label: '學收', icon: '💰' },
  { key: 'salary', label: '薪資', icon: '💵' },
  { key: 'expenses', label: '支出', icon: '🧾' },
]

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/dashboard" />
          <h1 className="text-xl sm:text-2xl font-bold text-text">帳務管理</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'billing' && <BillingContent />}
      {activeTab === 'salary' && <SalaryContent />}
      {activeTab === 'expenses' && <ExpensesContent />}
    </div>
  )
}

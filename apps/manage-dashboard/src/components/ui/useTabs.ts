import { useState, useCallback } from 'react'

export interface UseTabsProps {
  defaultTab: string
  onChange?: (tabId: string) => void
}

export interface UseTabsReturn {
  activeTab: string
  setActiveTab: (tabId: string) => void
  isActive: (tabId: string) => boolean
}

export function useTabs({ defaultTab, onChange }: UseTabsProps): UseTabsReturn {
  const [activeTab, setActiveTabState] = useState(defaultTab)

  const setActiveTab = useCallback(
    (tabId: string) => {
      setActiveTabState(tabId)
      onChange?.(tabId)
    },
    [onChange]
  )

  const isActive = useCallback(
    (tabId: string) => activeTab === tabId,
    [activeTab]
  )

  return {
    activeTab,
    setActiveTab,
    isActive,
  }
}

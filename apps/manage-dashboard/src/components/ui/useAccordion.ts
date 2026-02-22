import { useState, useCallback } from 'react'

export interface UseAccordionProps {
  defaultOpenItems?: string[]
  allowMultiple?: boolean
}

export interface UseAccordionReturn {
  openItems: string[]
  toggleItem: (id: string) => void
  isOpen: (id: string) => boolean
  openItem: (id: string) => void
  closeItem: (id: string) => void
}

/**
 * Hook for managing accordion state
 * @param defaultOpenItems - Array of item IDs that should be open by default
 * @param allowMultiple - Whether multiple items can be open at once (default: true)
 */
export function useAccordion({
  defaultOpenItems = [],
  allowMultiple = true
}: UseAccordionProps = {}): UseAccordionReturn {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpenItems)

  const toggleItem = useCallback((id: string) => {
    setOpenItems(prev => {
      const isCurrentlyOpen = prev.includes(id)
      
      if (isCurrentlyOpen) {
        return prev.filter(item => item !== id)
      } else {
        return allowMultiple ? [...prev, id] : [id]
      }
    })
  }, [allowMultiple])

  const isOpen = useCallback((id: string) => {
    return openItems.includes(id)
  }, [openItems])

  const openItem = useCallback((id: string) => {
    setOpenItems(prev => {
      if (prev.includes(id)) return prev
      return allowMultiple ? [...prev, id] : [id]
    })
  }, [allowMultiple])

  const closeItem = useCallback((id: string) => {
    setOpenItems(prev => prev.filter(item => item !== id))
  }, [])

  return {
    openItems,
    toggleItem,
    isOpen,
    openItem,
    closeItem
  }
}

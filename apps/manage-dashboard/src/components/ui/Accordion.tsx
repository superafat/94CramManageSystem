import React, { createContext, useContext } from 'react'
import { useAccordion, UseAccordionProps } from './useAccordion'

interface AccordionContextValue {
  openItems: string[]
  toggleItem: (id: string) => void
  isOpen: (id: string) => boolean
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordionContext() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion')
  }
  return context
}

export interface AccordionProps extends UseAccordionProps {
  children: React.ReactNode
  className?: string
}

export interface AccordionItemProps {
  id: string
  children: React.ReactNode
  className?: string
}

export interface AccordionTriggerProps {
  id: string
  children: React.ReactNode
  className?: string
}

export interface AccordionContentProps {
  id: string
  children: React.ReactNode
  className?: string
}

/**
 * Accordion - Collapsible content panels
 */
export function Accordion({ children, className = '', defaultOpenItems, allowMultiple }: AccordionProps) {
  const accordion = useAccordion({ defaultOpenItems, allowMultiple })

  return (
    <AccordionContext.Provider value={accordion}>
      <div className={`space-y-2 ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

/**
 * AccordionItem - Individual collapsible item
 */
export function AccordionItem({ id, children, className = '' }: AccordionItemProps) {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

/**
 * AccordionTrigger - Clickable header to toggle content
 */
export function AccordionTrigger({ id, children, className = '' }: AccordionTriggerProps) {
  const { toggleItem, isOpen } = useAccordionContext()
  const open = isOpen(id)

  return (
    <button
      type="button"
      onClick={() => toggleItem(id)}
      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${className}`}
      aria-expanded={open}
      aria-controls={`accordion-content-${id}`}
    >
      <span className="font-medium">{children}</span>
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

/**
 * AccordionContent - Collapsible content area
 */
export function AccordionContent({ id, children, className = '' }: AccordionContentProps) {
  const { isOpen } = useAccordionContext()
  const open = isOpen(id)

  if (!open) return null

  return (
    <div
      id={`accordion-content-${id}`}
      className={`px-4 py-3 border-t border-gray-200 bg-white ${className}`}
      role="region"
      aria-labelledby={`accordion-trigger-${id}`}
    >
      {children}
    </div>
  )
}

// Compound component pattern
Accordion.Item = AccordionItem
Accordion.Trigger = AccordionTrigger
Accordion.Content = AccordionContent

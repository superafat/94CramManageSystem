import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseDropdownProps {
  initialOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export interface UseDropdownReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

export const useDropdown = ({ 
  initialOpen = false,
  onOpenChange 
}: UseDropdownProps = {}): UseDropdownReturn => {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    setIsOpen(true)
    onOpenChange?.(true)
  }, [onOpenChange])

  const close = useCallback(() => {
    setIsOpen(false)
    onOpenChange?.(false)
  }, [onOpenChange])

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const newValue = !prev
      onOpenChange?.(newValue)
      return newValue
    })
  }, [onOpenChange])

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        contentRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !contentRef.current.contains(event.target as Node)
      ) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  // Handle escape key to close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerRef,
    contentRef
  }
}

export default useDropdown

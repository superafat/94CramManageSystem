import React from 'react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisible?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 7,
  className = '',
}: PaginationProps) {
  const getPageNumbers = () => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | string)[] = []
    const halfVisible = Math.floor(maxVisible / 2)

    if (currentPage <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible - 2; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    } else if (currentPage >= totalPages - halfVisible) {
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - (maxVisible - 3); i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = currentPage - halfVisible + 2; i <= currentPage + halfVisible - 2; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav className={`flex items-center justify-center space-x-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
        aria-label="Previous page"
      >
        上一頁
      </button>

      {pageNumbers.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
              ...
            </span>
          )
        }

        const pageNum = page as number
        const isActive = pageNum === currentPage

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`
              px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${
                isActive
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }
            `}
            aria-label={`Page ${pageNum}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </button>
        )
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
        aria-label="Next page"
      >
        下一頁
      </button>
    </nav>
  )
}

import { useState, useMemo } from 'react'

export interface UsePaginationProps {
  totalItems: number
  itemsPerPage?: number
  initialPage?: number
}

export interface UsePaginationReturn<T> {
  currentPage: number
  totalPages: number
  pageSize: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  getPaginatedData: (data: T[]) => T[]
  startIndex: number
  endIndex: number
}

export function usePagination<T = any>({
  totalItems,
  itemsPerPage = 10,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(itemsPerPage)

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize)
  }, [totalItems, pageSize])

  const startIndex = useMemo(() => {
    return (currentPage - 1) * pageSize
  }, [currentPage, pageSize])

  const endIndex = useMemo(() => {
    return Math.min(startIndex + pageSize, totalItems)
  }, [startIndex, pageSize, totalItems])

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  const nextPage = () => {
    goToPage(currentPage + 1)
  }

  const prevPage = () => {
    goToPage(currentPage - 1)
  }

  const getPaginatedData = (data: T[]) => {
    return data.slice(startIndex, endIndex)
  }

  const handleSetPageSize = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return {
    currentPage,
    totalPages,
    pageSize,
    setCurrentPage: goToPage,
    setPageSize: handleSetPageSize,
    nextPage,
    prevPage,
    goToPage,
    getPaginatedData,
    startIndex,
    endIndex,
  }
}

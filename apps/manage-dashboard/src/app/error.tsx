'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-xl font-semibold text-gray-800">發生錯誤</h2>
        <p className="text-gray-500 text-sm">{error.message || '系統發生未預期的錯誤'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#8FA9B8] text-white rounded-lg hover:bg-[#7A95A5] transition-colors"
        >
          重試
        </button>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'

export default function AnalyticsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          網站監控已搬移至總後台
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          此功能已整合至 94cram 平台總後台，請前往總後台查看數據分析。
        </p>
        <Link
          href="https://94cram.com/admin/analytics"
          className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#8FA895' }}
        >
          前往總後台
        </Link>
      </div>
    </div>
  )
}

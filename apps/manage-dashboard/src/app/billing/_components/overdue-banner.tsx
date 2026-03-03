'use client'

import { useState } from 'react'
import type { OverdueStudent } from '../_types'
import { OverdueBadge } from './overdue-badge'
import { ReminderButton } from './reminder-button'

export function OverdueBanner({ students }: { students: OverdueStudent[] }) {
  const [expanded, setExpanded] = useState(false)
  const [batchSending, setBatchSending] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ sent: number; total: number } | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const criticalCount = students.filter(s => s.level === 'critical').length
  const overdueCount = students.filter(s => s.level === 'overdue').length
  const pendingCount = students.filter(s => s.level === 'pending').length

  const totalActionable = criticalCount + overdueCount

  if (students.length === 0) return null

  const handleBatchSend = async () => {
    if (!confirm(`確定要對 ${totalActionable} 位遲繳學生發送催繳通知嗎？`)) return

    const targets = students.filter(s => s.level === 'critical' || s.level === 'overdue')
    setBatchSending(true)
    setBatchProgress({ sent: 0, total: targets.length })

    const newSentIds = new Set(sentIds)
    for (let i = 0; i < targets.length; i++) {
      const s = targets[i]
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ studentId: s.id, type: 'payment_reminder' }),
        })
      } catch {
        // Demo 模式相容
      }
      newSentIds.add(s.id)
      setSentIds(new Set(newSentIds))
      setBatchProgress({ sent: i + 1, total: targets.length })
    }

    setBatchSending(false)
    setTimeout(() => setBatchProgress(null), 3000)
  }

  return (
    <div className="rounded-xl border border-red-300 bg-red-50 overflow-hidden">
      {/* Banner Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-base">⚠️</span>
        <div className="flex-1 text-sm font-medium text-red-800">
          目前有{' '}
          {criticalCount > 0 && (
            <span className="font-bold text-red-700">{criticalCount} 筆嚴重遲繳</span>
          )}
          {criticalCount > 0 && overdueCount > 0 && <span>、</span>}
          {overdueCount > 0 && (
            <span className="font-bold text-orange-600">{overdueCount} 筆遲繳</span>
          )}
          {pendingCount > 0 && (criticalCount > 0 || overdueCount > 0) && <span>、</span>}
          {pendingCount > 0 && (
            <span className="font-bold text-yellow-700">{pendingCount} 筆處理中</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalActionable > 0 && (
            <button
              onClick={e => {
                e.stopPropagation()
                handleBatchSend()
              }}
              disabled={batchSending}
              className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {batchSending
                ? batchProgress
                  ? `已發送 ${batchProgress.sent}/${batchProgress.total}`
                  : '發送中...'
                : '📩 一鍵催繳全部'}
            </button>
          )}
          <span className="text-red-600 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* 完成進度 */}
      {batchProgress && !batchSending && (
        <div className="px-4 pb-2 text-xs text-green-700 font-medium">
          ✅ 已發送 {batchProgress.sent} 筆催繳通知
        </div>
      )}

      {/* Expanded Student List */}
      {expanded && (
        <div className="border-t border-red-200 divide-y divide-red-100">
          {students.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-white/50">
              <div className="flex-1">
                <div className="text-sm font-medium text-text">{s.full_name}</div>
                <div className="text-xs text-text-muted">
                  {s.grade_level && <span>{s.grade_level} · </span>}
                  <span>{s.periodMonth}</span>
                  {s.overdueDays != null && s.overdueDays > 0 && (
                    <span className="text-red-400"> · 逾期 {s.overdueDays} 天</span>
                  )}
                </div>
              </div>
              <OverdueBadge level={s.level} />
              {(s.level === 'critical' || s.level === 'overdue') && (
                sentIds.has(s.id) ? (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                    ✅ 已催繳
                  </span>
                ) : (
                  <ReminderButton studentId={s.id} studentName={s.full_name} />
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

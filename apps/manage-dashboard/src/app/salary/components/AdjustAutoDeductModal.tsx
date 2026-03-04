'use client'

import { useState } from 'react'
import type { AutoDeduction, AutoDeductionOverride } from '../types'

export interface AdjustAutoDeductModalProps {
  deduction: AutoDeduction
  onSave: (override: AutoDeductionOverride) => void
  onClose: () => void
}

export function AdjustAutoDeductModal({ deduction, onSave, onClose }: AdjustAutoDeductModalProps) {
  const [cancelled, setCancelled] = useState(deduction.cancelled)
  const [customAmount, setCustomAmount] = useState<string>(
    deduction.overrideAmount !== null
      ? String(deduction.overrideAmount)
      : String(deduction.totalAmount)
  )

  const handleSave = () => {
    if (cancelled) {
      onSave({ cancelled: true, overrideAmount: null })
      return
    }
    const parsed = parseInt(customAmount, 10)
    const amt = isNaN(parsed) ? deduction.totalAmount : Math.max(0, parsed)
    onSave({
      cancelled: false,
      overrideAmount: amt !== deduction.totalAmount ? amt : null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <h3 className="text-base font-semibold text-gray-800 mb-1">調整自動扣薪</h3>
        <p className="text-xs text-gray-500 mb-4">
          {deduction.label}（原始金額：${deduction.totalAmount.toLocaleString()}）
        </p>

        <div className="space-y-3">
          {/* Cancel toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cancelled}
              onChange={e => setCancelled(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-gray-700">取消此筆自動扣薪</span>
          </label>

          {/* Amount override */}
          {!cancelled && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">調整金額（元）</label>
              <input
                type="number"
                min="0"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">
                原始計算：{deduction.count} × ${deduction.unitAmount.toLocaleString()} = ${deduction.totalAmount.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

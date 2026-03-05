'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type BindState = 'loading' | 'valid' | 'expired' | 'used' | 'not_found' | 'success' | 'error'

export default function BindPage() {
  const params = useParams()
  const token = params?.token as string

  const [state, setState] = useState<BindState>('loading')
  const [studentName, setStudentName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [binding, setBinding] = useState(false)

  useEffect(() => {
    if (!token) return

    const verify = async () => {
      try {
        const res = await fetch(`/api/bind/${token}`)
        const data = await res.json()

        if (data.valid) {
          setState('valid')
          setStudentName(data.studentName)
          setTenantName(data.tenantName)
        } else {
          setState(data.reason === 'expired' ? 'expired' : data.reason === 'used' ? 'used' : 'not_found')
        }
      } catch {
        setState('error')
      }
    }

    verify()
  }, [token])

  const handleBind = async () => {
    if (!lineUserId.trim()) return
    setBinding(true)
    try {
      const res = await fetch(`/api/bind/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: lineUserId.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setState('success')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    } finally {
      setBinding(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        {/* Logo / Title */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#8FA895] rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">94</span>
          </div>
          <h1 className="text-xl font-bold text-text">家長帳號綁定</h1>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="py-8">
            <div className="animate-spin w-8 h-8 border-2 border-[#8FA895] border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-sm text-text-muted">驗證中...</p>
          </div>
        )}

        {/* Valid — show bind form */}
        {state === 'valid' && (
          <div className="space-y-4">
            <div className="bg-[#8FA895]/5 rounded-xl p-4">
              <p className="text-sm text-text-muted">補習班</p>
              <p className="font-semibold text-text">{tenantName}</p>
              <p className="text-sm text-text-muted mt-2">學生</p>
              <p className="font-semibold text-text">{studentName}</p>
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                LINE User ID
              </label>
              <input
                type="text"
                value={lineUserId}
                onChange={e => setLineUserId(e.target.value)}
                placeholder="請輸入您的 LINE User ID"
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-[#8FA895]/30 focus:border-[#8FA895]"
              />
              <p className="mt-1 text-xs text-text-muted">
                未來可透過 LINE LIFF 自動取得，目前請手動輸入
              </p>
            </div>

            <button
              onClick={handleBind}
              disabled={binding || !lineUserId.trim()}
              className="w-full py-3 bg-[#8FA895] text-white rounded-xl font-medium hover:bg-[#8FA895]/90 disabled:opacity-50 transition-colors"
            >
              {binding ? '綁定中...' : '確認綁定'}
            </button>
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div className="py-4">
            <div className="w-16 h-16 bg-[#8FA895]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#8FA895]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#8FA895] mb-2">綁定成功！</h2>
            <p className="text-sm text-text-muted">
              您已成功綁定 {studentName} 的家長帳號。<br />
              現在可以透過 LINE 接收學習通知了。
            </p>
          </div>
        )}

        {/* Expired */}
        {state === 'expired' && (
          <div className="py-4">
            <div className="w-16 h-16 bg-[#C4956A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#C4956A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#C4956A] mb-2">QR Code 已過期</h2>
            <p className="text-sm text-text-muted">請聯繫補習班行政人員重新生成 QR Code。</p>
          </div>
        )}

        {/* Used */}
        {state === 'used' && (
          <div className="py-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text mb-2">此 QR Code 已被使用</h2>
            <p className="text-sm text-text-muted">此綁定碼已被使用。如需重新綁定，請聯繫補習班。</p>
          </div>
        )}

        {/* Not Found */}
        {state === 'not_found' && (
          <div className="py-4">
            <div className="w-16 h-16 bg-[#B5706E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#B5706E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#B5706E] mb-2">無效的 QR Code</h2>
            <p className="text-sm text-text-muted">此綁定碼無效或已被撤銷。</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="py-4">
            <div className="w-16 h-16 bg-[#B5706E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#B5706E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#B5706E] mb-2">發生錯誤</h2>
            <p className="text-sm text-text-muted">請稍後再試，或聯繫補習班行政人員。</p>
          </div>
        )}
      </div>
    </div>
  )
}

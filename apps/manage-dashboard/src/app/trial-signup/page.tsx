'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE = ''

interface FormData {
  tenantName: string
  tenantSlug: string
  adminName: string
  adminEmail: string
  adminPhone: string
  password: string
  passwordConfirm: string
}

export default function TrialSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    tenantName: '',
    tenantSlug: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    passwordConfirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 自動生成 slug
    if (name === 'tenantName' && !formData.tenantSlug) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u4e00-\u9fa5a-z0-9-]/g, '')
        .substring(0, 30)
      setFormData(prev => ({ ...prev, tenantSlug: slug }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 驗證
    if (formData.password !== formData.passwordConfirm) {
      setError('密碼與確認密碼不符')
      return
    }

    if (formData.password.length < 8) {
      setError('密碼至少需要 8 個字元')
      return
    }

    if (!formData.tenantSlug.match(/^[a-z0-9-]+$/)) {
      setError('網址代碼只能包含小寫字母、數字和連字號')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/trial-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: formData.tenantName,
          tenantSlug: formData.tenantSlug,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone || undefined,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '申請失敗')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('無法連接伺服器，請稍後再試')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">申請已送出！</h2>
          <p className="text-gray-600 mb-6">
            我們會在 24 小時內審核您的申請，審核通過後將以電子郵件通知您。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-900 mb-1">
              <strong>補習班名稱：</strong>{formData.tenantName}
            </p>
            <p className="text-sm text-blue-900 mb-1">
              <strong>網址：</strong>https://94cram.com/{formData.tenantSlug}
            </p>
            <p className="text-sm text-blue-900">
              <strong>管理員：</strong>{formData.adminName} ({formData.adminEmail})
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            前往登入頁面
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← 返回首頁
          </button>
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐝</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            申請 30 天免費試用
          </h1>
          <p className="text-gray-600">
            完整功能體驗，無需信用卡
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm font-medium text-green-900">30 天試用</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">✨</div>
            <div className="text-sm font-medium text-blue-900">完整功能</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🤖</div>
            <div className="text-sm font-medium text-purple-900">AI 助理</div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 補習班資訊 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 補習班資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  補習班名稱 *
                </label>
                <input
                  type="text"
                  name="tenantName"
                  value={formData.tenantName}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="例：台北明星補習班"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  網址代碼 *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">https://94cram.com/</span>
                  <input
                    type="text"
                    name="tenantSlug"
                    value={formData.tenantSlug}
                    onChange={handleChange}
                    required
                    pattern="[a-z0-9-]+"
                    maxLength={50}
                    placeholder="taipei-star"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">只能使用小寫英文、數字和連字號</p>
              </div>
            </div>
          </div>

          {/* 管理員資訊 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 管理員資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  placeholder="您的姓名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話（選填）
                </label>
                <input
                  type="tel"
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  maxLength={20}
                  placeholder="0912-345-678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密碼 *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="至少 8 個字元"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  確認密碼 *
                </label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  required
                  placeholder="再次輸入密碼"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 提交按鈕 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading ? '送出中...' : '🚀 申請 30 天免費試用'}
          </button>

          <p className="text-center text-sm text-gray-500">
            已有帳號？
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium ml-1">
              立即登入
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

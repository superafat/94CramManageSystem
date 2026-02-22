'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchTrials, approveTrial, rejectTrial, revokeTrial, type Trial } from '@/lib/api'
import { BackButton } from '@/components/ui/BackButton'

const STATUS_LABELS: Record<string, string> = {
  pending: '待審核',
  approved: '已批准',
  rejected: '已拒絕',
  expired: '已過期',
  none: '無試用',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  none: 'bg-gray-100 text-gray-400',
}

export default function TrialsPage() {
  const router = useRouter()
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revoke' | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 權限檢查 - 只有 superadmin 可以訪問
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/login')
      return
    }
    try {
      const user = JSON.parse(userStr)
      if (user.role !== 'superadmin' && user.role !== 'admin') {
        router.push('/dashboard')
        return
      }
    } catch {
      router.push('/login')
      return
    }

    loadTrials()
  }, [router])

  async function loadTrials() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrials()
      setTrials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  function openActionDialog(trial: Trial, type: 'approve' | 'reject' | 'revoke') {
    setSelectedTrial(trial)
    setActionType(type)
    setNotes('')
  }

  function closeDialog() {
    setSelectedTrial(null)
    setActionType(null)
    setNotes('')
  }

  async function handleAction() {
    if (!selectedTrial || !actionType) return

    setProcessing(selectedTrial.id)
    setError(null)

    try {
      if (actionType === 'approve') {
        await approveTrial(selectedTrial.id, notes || undefined)
      } else if (actionType === 'reject') {
        if (!notes.trim()) {
          setError('拒絕理由為必填')
          return
        }
        await rejectTrial(selectedTrial.id, notes)
      } else if (actionType === 'revoke') {
        await revokeTrial(selectedTrial.id, notes || undefined)
      }

      await loadTrials()
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setProcessing(null)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getDaysRemaining(endDate: string | null) {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const pendingTrials = trials.filter(t => t.trial_status === 'pending')
  const approvedTrials = trials.filter(t => t.trial_status === 'approved')
  const otherTrials = trials.filter(t => t.trial_status !== 'pending' && t.trial_status !== 'approved')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">試用申請審核</h1>
          <p className="text-sm text-gray-600 mt-1">管理所有補習班試用申請</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-yellow-600 text-sm font-medium">待審核</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{pendingTrials.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-green-600 text-sm font-medium">使用中</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{approvedTrials.length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">已處理</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{otherTrials.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-blue-600 text-sm font-medium">總計</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{trials.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : (
        <div className="space-y-6">
          {/* 待審核列表 */}
          {pendingTrials.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">⏳ 待審核申請</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">補習班名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">網址代碼</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請時間</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingTrials.map(trial => (
                      <tr key={trial.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{trial.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{trial.slug}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(trial.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[trial.trial_status]}`}>
                            {STATUS_LABELS[trial.trial_status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => openActionDialog(trial, 'approve')}
                            disabled={processing === trial.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            ✅ 批准
                          </button>
                          <button
                            onClick={() => openActionDialog(trial, 'reject')}
                            disabled={processing === trial.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            ❌ 拒絕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 使用中試用 */}
          {approvedTrials.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">✅ 使用中試用</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">補習班名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">試用期限</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">剩餘天數</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">審核人</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {approvedTrials.map(trial => {
                      const daysLeft = getDaysRemaining(trial.trial_end_at)
                      return (
                        <tr key={trial.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{trial.name}</div>
                            <div className="text-xs text-gray-500">{trial.slug}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(trial.trial_end_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {daysLeft !== null && (
                              <span className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {daysLeft > 0 ? `${daysLeft} 天` : '已到期'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trial.approver_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openActionDialog(trial, 'revoke')}
                              disabled={processing === trial.id}
                              className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                            >
                              🚫 撤銷
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 已處理申請 */}
          {otherTrials.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">📋 已處理申請</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">補習班名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">處理時間</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {otherTrials.map(trial => (
                      <tr key={trial.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{trial.name}</div>
                          <div className="text-xs text-gray-500">{trial.slug}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[trial.trial_status]}`}>
                            {STATUS_LABELS[trial.trial_status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(trial.trial_approved_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {trial.trial_notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {trials.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              目前沒有任何試用申請
            </div>
          )}
        </div>
      )}

      {/* 操作對話框 */}
      {selectedTrial && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {actionType === 'approve' && '批准試用申請'}
              {actionType === 'reject' && '拒絕試用申請'}
              {actionType === 'revoke' && '撤銷試用'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>補習班：</strong>{selectedTrial.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>網址：</strong>{selectedTrial.slug}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {actionType === 'reject' ? '拒絕理由（必填）' : '備註（選填）'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === 'reject' ? '請輸入拒絕理由...' : '可選填審核備註...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDialog}
                disabled={!!processing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleAction}
                disabled={!!processing || (actionType === 'reject' && !notes.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                  actionType === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {processing ? '處理中...' : 
                  actionType === 'approve' ? '✅ 確認批准' :
                  actionType === 'reject' ? '❌ 確認拒絕' :
                  '🚫 確認撤銷'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { getMonthOptions } from '../_helpers'

type BillingMode = 'monthly' | 'per_session'
type RevokeStrategy = 'soft_delete' | 'cancel_status'

type ClassOverview = {
  id: string
  name: string
  course_type?: string | null
  subject?: string | null
  grade?: string | null
  fee_monthly?: string | number | null
  fee_per_session?: string | number | null
  stats: {
    totalStudents: number
    paidStudents: number
    pendingStudents: number
    unpaidStudents: number
  }
}

type BillingStudent = {
  id: string
  name?: string
  full_name?: string
  grade?: string
  payment_id?: string | null
  paid_amount?: string | number | null
  payment_status?: 'paid' | 'pending' | 'overdue' | null
  payment_date?: string | null
  remembered_amount?: string | number | null
  remembered_payment_type?: string | null
  remembered_metadata?: Record<string, unknown> | null
}

type CourseDetail = {
  id: string
  name: string
  course_type?: string | null
  subject?: string | null
  grade?: string | null
  fee_monthly?: string | number | null
  fee_per_session?: string | number | null
}

type CourseBillingResponse = {
  course: CourseDetail
  periodMonth: string
  sessionCount: number
  students: BillingStudent[]
  stats: {
    total: number
    paid: number
    pending: number
    unpaid: number
  }
}

type StudentSetting = {
  selected: boolean
  billingMode: BillingMode
  amount: number
  perSessionFee: number
  sessionCount: number
  note: string
}

const toNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const toStudentName = (student: BillingStudent): string => student.full_name || student.name || '未命名學生'

const normalizeBillingMode = (value: string | null | undefined, fallback: BillingMode): BillingMode => {
  return value === 'per_session' ? 'per_session' : value === 'monthly' ? 'monthly' : fallback
}

const getCourseTypeLabel = (courseType?: string | null): string => {
  if (courseType === 'daycare') return '安親班'
  if (courseType === 'individual') return '個指'
  return '團班'
}

export function TuitionWorkbench() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [classes, setClasses] = useState<ClassOverview[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [classKeyword, setClassKeyword] = useState('')
  const [detail, setDetail] = useState<CourseBillingResponse | null>(null)
  const [settings, setSettings] = useState<Record<string, StudentSetting>>({})
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [actioning, setActioning] = useState<'revoke' | 'resend' | null>(null)
  const [message, setMessage] = useState('')
  const [bulkMode, setBulkMode] = useState<BillingMode>('monthly')
  const [revokeStrategy, setRevokeStrategy] = useState<RevokeStrategy>('cancel_status')

  const monthOptions = useMemo(() => getMonthOptions(), [])

  useEffect(() => {
    void fetchClassesOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  useEffect(() => {
    if (!selectedClassId) return
    void fetchClassDetail(selectedClassId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, month])

  const showMessage = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 3500)
  }

  const fetchClassesOverview = async () => {
    setLoadingClasses(true)
    try {
      const res = await fetch(`/api/admin/billing/classes-overview?periodMonth=${month}`, { credentials: 'include' })
      if (!res.ok) {
        showMessage('班級列表讀取失敗')
        setLoadingClasses(false)
        return
      }
      const json = await res.json()
      const rawClasses = (json.data?.classes || json.classes || []) as ClassOverview[]
      setClasses(rawClasses)
      if (rawClasses.length === 0) {
        setSelectedClassId('')
        setDetail(null)
        setSettings({})
      } else if (!rawClasses.some((course) => course.id === selectedClassId)) {
        setSelectedClassId(rawClasses[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch classes overview:', error)
      showMessage('班級列表讀取失敗')
    } finally {
      setLoadingClasses(false)
    }
  }

  const buildSettings = (data: CourseBillingResponse): Record<string, StudentSetting> => {
    const next: Record<string, StudentSetting> = {}
    const defaultMonthly = toNumber(data.course.fee_monthly, 0)
    const defaultPerSession = toNumber(data.course.fee_per_session, 0)

    for (const student of data.students) {
      const rememberedMetadata = (student.remembered_metadata || {}) as Record<string, unknown>
      const rememberedAmount = toNumber(student.remembered_amount, 0)
      const fallbackMode: BillingMode = data.course.course_type === 'individual' ? 'per_session' : 'monthly'
      const billingMode = normalizeBillingMode(student.remembered_payment_type, fallbackMode)
      const sessionCount = toNumber(rememberedMetadata.sessionCount, data.sessionCount || 0)
      const perSessionFee = toNumber(rememberedMetadata.perSessionFee, defaultPerSession)
      const amount = billingMode === 'monthly'
        ? (rememberedAmount > 0 ? rememberedAmount : defaultMonthly)
        : (rememberedAmount > 0 ? rememberedAmount : perSessionFee * sessionCount)

      next[student.id] = {
        selected: student.payment_status !== 'paid',
        billingMode,
        amount,
        perSessionFee,
        sessionCount,
        note: '',
      }
    }

    return next
  }

  const fetchClassDetail = async (courseId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/billing/course/${courseId}?periodMonth=${month}`, { credentials: 'include' })
      if (!res.ok) {
        showMessage('班級學生繳費資料讀取失敗')
        setLoadingDetail(false)
        return
      }
      const json = await res.json()
      const payload = (json.data || json) as CourseBillingResponse
      setDetail(payload)
      setSettings(buildSettings(payload))
    } catch (error) {
      console.error('Failed to fetch class detail:', error)
      showMessage('班級學生繳費資料讀取失敗')
    } finally {
      setLoadingDetail(false)
    }
  }

  const updateSetting = (studentId: string, patch: Partial<StudentSetting>) => {
    setSettings((prev) => {
      const current = prev[studentId]
      if (!current) return prev
      const merged = { ...current, ...patch }
      if (merged.billingMode === 'per_session') {
        merged.amount = merged.perSessionFee * merged.sessionCount
      }
      return { ...prev, [studentId]: merged }
    })
  }

  const filteredClasses = useMemo(() => {
    const keyword = classKeyword.trim().toLowerCase()
    if (!keyword) return classes
    return classes.filter((course) => {
      const haystack = `${course.name} ${course.subject || ''} ${course.grade || ''}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [classes, classKeyword])

  const selectedCount = useMemo(() => {
    return Object.values(settings).filter((setting) => setting.selected).length
  }, [settings])

  const selectedStudentIds = useMemo(() => {
    return Object.entries(settings)
      .filter(([, setting]) => setting.selected)
      .map(([studentId]) => studentId)
  }, [settings])

  const applyBulkMode = (mode: BillingMode) => {
    if (!detail) return

    const defaultMonthly = toNumber(detail.course.fee_monthly, 0)
    const defaultPerSession = toNumber(detail.course.fee_per_session, 0)

    setSettings((prev) => {
      const next = { ...prev }
      for (const student of detail.students) {
        const current = next[student.id]
        if (!current || !current.selected || student.payment_status === 'paid') continue

        if (mode === 'monthly') {
          next[student.id] = {
            ...current,
            billingMode: 'monthly',
            amount: current.amount > 0 ? current.amount : defaultMonthly,
          }
        } else {
          const perSessionFee = current.perSessionFee > 0 ? current.perSessionFee : defaultPerSession
          const sessionCount = current.sessionCount > 0 ? current.sessionCount : detail.sessionCount
          next[student.id] = {
            ...current,
            billingMode: 'per_session',
            perSessionFee,
            sessionCount,
            amount: perSessionFee * sessionCount,
          }
        }
      }
      return next
    })
    showMessage(mode === 'monthly' ? '已套用月繳設定到勾選學生' : '已套用堂繳設定到勾選學生')
  }

  const callNoticeAction = async (action: 'revoke' | 'resend') => {
    if (!detail) return
    if (selectedStudentIds.length === 0) {
      showMessage('請先勾選學生')
      return
    }

    setActioning(action)
    try {
      const res = await fetch(`/api/admin/billing/payment-notices/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: detail.course.id,
          periodMonth: month,
          studentIds: selectedStudentIds,
          revokeStrategy: action === 'revoke' ? revokeStrategy : undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || json.success === false) {
        showMessage(`${action === 'revoke' ? '撤回' : '重發'}失敗：${json.error?.message || '未知錯誤'}`)
        setActioning(null)
        return
      }

      const result = json.data || {}
      if (action === 'revoke') {
        const strategyLabel = (result.revokeStrategy || revokeStrategy) === 'cancel_status' ? '改為 cancelled' : '軟刪除'
        showMessage(`已撤回 ${result.revoked || 0} 筆待繳費單（${strategyLabel}）`)
      } else {
        showMessage(`已重發 ${result.resent || 0} 則繳費通知`)
      }
      await fetchClassDetail(detail.course.id)
      await fetchClassesOverview()
    } catch (error) {
      console.error(`Failed to ${action} notices:`, error)
      showMessage(action === 'revoke' ? '撤回失敗' : '重發失敗')
    } finally {
      setActioning(null)
    }
  }

  const exportCsv = () => {
    if (!detail) return
    const rows = detail.students.map((student) => {
      const setting = settings[student.id]
      const status = student.payment_status || (student.payment_id ? 'paid' : 'unpaid')
      const mode = setting?.billingMode || '-'
      const amount = setting
        ? (mode === 'per_session' ? setting.perSessionFee * setting.sessionCount : setting.amount)
        : toNumber(student.paid_amount, 0)

      return [
        detail.course.name,
        month,
        toStudentName(student),
        student.grade || '',
        status,
        mode,
        String(amount),
        mode === 'per_session' ? String(setting?.sessionCount ?? detail.sessionCount) : '',
        mode === 'per_session' ? String(setting?.perSessionFee ?? 0) : '',
      ]
    })

    const header = ['班級', '月份', '學生', '年級', '狀態', '模式', '金額', '堂數', '每堂費用']
    const csv = [header, ...rows]
      .map((cols) => cols.map((col) => `"${String(col ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${detail.course.name}-${month}-繳費單.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printNoticeList = () => {
    if (!detail) return
    const lines = detail.students.map((student) => {
      const setting = settings[student.id]
      const status = student.payment_status || (student.payment_id ? 'paid' : 'unpaid')
      const amount = setting
        ? (setting.billingMode === 'per_session' ? setting.perSessionFee * setting.sessionCount : setting.amount)
        : toNumber(student.paid_amount, 0)
      const modeLabel = setting?.billingMode === 'per_session' ? `堂繳 (${setting.sessionCount} 堂)` : '月繳'
      return `<tr>
        <td>${toStudentName(student)}</td>
        <td>${student.grade || ''}</td>
        <td>${status === 'paid' ? '已繳' : status === 'pending' ? '待繳' : '未繳'}</td>
        <td>${modeLabel}</td>
        <td style="text-align:right;">NT$ ${amount.toLocaleString()}</td>
      </tr>`
    }).join('')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>學收繳費單</title>
      <style>
        body { font-family: sans-serif; padding: 20px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 8px; }
        p { margin: 2px 0 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f5f5f5; text-align: left; }
      </style></head>
      <body>
        <h1>${detail.course.name} 學收繳費單</h1>
        <p>月份：${month}</p>
        <table>
          <thead>
            <tr><th>學生</th><th>年級</th><th>狀態</th><th>模式</th><th>金額</th></tr>
          </thead>
          <tbody>${lines}</tbody>
        </table>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const handlePublishNotices = async () => {
    if (!detail) return

    const notices = detail.students
      .filter((student) => settings[student.id]?.selected)
      .map((student) => {
        const setting = settings[student.id]
        return {
          studentId: student.id,
          billingMode: setting.billingMode,
          customAmount: setting.billingMode === 'monthly' ? setting.amount : undefined,
          sessionCount: setting.billingMode === 'per_session' ? setting.sessionCount : undefined,
          perSessionFee: setting.billingMode === 'per_session' ? setting.perSessionFee : undefined,
          note: setting.note || undefined,
        }
      })

    if (notices.length === 0) {
      showMessage('請先勾選要發布繳費單的學生')
      return
    }

    setPublishing(true)
    try {
      const res = await fetch('/api/admin/billing/payment-notices/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: detail.course.id,
          periodMonth: month,
          notices,
        }),
      })

      const json = await res.json()
      if (!res.ok || json.success === false) {
        showMessage(`發布失敗：${json.error?.message || '未知錯誤'}`)
        setPublishing(false)
        return
      }

      const result = json.data || {}
      showMessage(`已發布繳費單：新增 ${result.created || 0}、更新 ${result.updated || 0}、通知 ${result.notified || 0}`)
      await fetchClassDetail(detail.course.id)
      await fetchClassesOverview()
    } catch (error) {
      console.error('Failed to publish payment notices:', error)
      showMessage('發布繳費單失敗')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-text">學收繳費單工作台</h2>
          <p className="text-xs text-text-muted">左側選班級，右側設定學生月繳/堂繳並一鍵發布繳費通知。</p>
        </div>
        <select
          title="帳務月份"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {message ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-surface p-3">
          <div className="mb-3">
            <input
              title="搜尋班級"
              type="text"
              value={classKeyword}
              onChange={(e) => setClassKeyword(e.target.value)}
              placeholder="搜尋班級名稱/科目"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
            />
          </div>

          {loadingClasses ? (
            <p className="py-8 text-center text-sm text-text-muted">讀取班級中...</p>
          ) : filteredClasses.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">沒有符合條件的班級</p>
          ) : (
            <div className="space-y-2">
              {filteredClasses.map((course) => {
                const isActive = course.id === selectedClassId
                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedClassId(course.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text">{course.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                        {getCourseTypeLabel(course.course_type)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{course.subject || '未設定科目'} {course.grade ? `· ${course.grade}` : ''}</p>
                    <div className="mt-2 flex gap-2 text-[11px] text-text-muted">
                      <span>已繳 {course.stats.paidStudents}</span>
                      <span>待繳 {course.stats.unpaidStudents}</span>
                      <span>處理中 {course.stats.pendingStudents}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <section className="rounded-xl border border-border bg-surface p-4">
          {!selectedClassId ? (
            <p className="py-12 text-center text-sm text-text-muted">請先選擇班級</p>
          ) : loadingDetail || !detail ? (
            <p className="py-12 text-center text-sm text-text-muted">讀取學生繳費狀態中...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-text">{detail.course.name}</h3>
                  <p className="text-xs text-text-muted">
                    {getCourseTypeLabel(detail.course.course_type)} · {detail.course.subject || '未設定科目'}
                    {detail.course.grade ? ` · ${detail.course.grade}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    自動帶入本月排課 {detail.sessionCount} 堂，可逐一學生調整堂數與單價。
                  </p>
                </div>
                <div className="flex gap-3 text-xs text-text-muted">
                  <span>總人數 {detail.stats.total}</span>
                  <span>已繳 {detail.stats.paid}</span>
                  <span>待繳 {detail.stats.unpaid}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-text-muted">班級批次套用：</span>
                    <select
                      title="批次套用繳費模式"
                      value={bulkMode}
                      onChange={(e) => setBulkMode(e.target.value as BillingMode)}
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
                    >
                      <option value="monthly">月繳</option>
                      <option value="per_session">堂繳</option>
                    </select>
                    <button
                      onClick={() => applyBulkMode(bulkMode)}
                      className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary"
                    >
                      套用到勾選學生
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      title="撤回策略"
                      value={revokeStrategy}
                      onChange={(e) => setRevokeStrategy(e.target.value as RevokeStrategy)}
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-muted"
                    >
                      <option value="cancel_status">撤回策略：改為 cancelled（保留紀錄）</option>
                      <option value="soft_delete">撤回策略：軟刪除</option>
                    </select>
                    <button
                      onClick={() => callNoticeAction('revoke')}
                      disabled={actioning !== null || selectedStudentIds.length === 0}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-600 disabled:opacity-50"
                    >
                      {actioning === 'revoke' ? '撤回中...' : '批次撤回'}
                    </button>
                    <button
                      onClick={() => callNoticeAction('resend')}
                      disabled={actioning !== null || selectedStudentIds.length === 0}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-700 disabled:opacity-50"
                    >
                      {actioning === 'resend' ? '重發中...' : '批次重發通知'}
                    </button>
                    <button
                      onClick={printNoticeList}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted"
                    >
                      列印繳費單
                    </button>
                    <button
                      onClick={exportCsv}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted"
                    >
                      匯出 CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {detail.students.map((student) => {
                  const setting = settings[student.id]
                  if (!setting) return null
                  const status = student.payment_status || (student.payment_id ? 'paid' : 'unpaid')
                  const isPaid = status === 'paid'
                  const displayAmount = setting.billingMode === 'per_session'
                    ? setting.perSessionFee * setting.sessionCount
                    : setting.amount

                  return (
                    <div
                      key={student.id}
                      className={`rounded-lg border p-3 ${isPaid ? 'border-emerald-200 bg-emerald-50/40' : 'border-border bg-background'}`}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <label className="mt-1 flex items-center gap-2">
                          <input
                            type="checkbox"
                            title="選擇發布對象"
                            checked={setting.selected}
                            onChange={(e) => updateSetting(student.id, { selected: e.target.checked })}
                            disabled={isPaid}
                            className="h-4 w-4 rounded border-border text-primary"
                          />
                        </label>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-text">{toStudentName(student)}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {student.grade || '未設定年級'}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${isPaid ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isPaid ? '已繳' : status === 'pending' ? '已發布待繳' : '未繳'}
                            </span>
                          </div>

                          {isPaid ? (
                            <p className="mt-2 text-sm text-emerald-700">本月已繳 NT$ {toNumber(student.paid_amount, 0).toLocaleString()}</p>
                          ) : (
                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[120px_minmax(0,1fr)]">
                              <select
                                title="繳費模式"
                                value={setting.billingMode}
                                onChange={(e) => {
                                  const nextMode = e.target.value as BillingMode
                                  const courseMonthly = toNumber(detail.course.fee_monthly, 0)
                                  const coursePerSession = toNumber(detail.course.fee_per_session, 0)
                                  updateSetting(student.id, {
                                    billingMode: nextMode,
                                    amount: nextMode === 'monthly' ? (setting.amount || courseMonthly) : setting.amount,
                                    perSessionFee: nextMode === 'per_session' ? (setting.perSessionFee || coursePerSession) : setting.perSessionFee,
                                  })
                                }}
                                className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
                              >
                                <option value="monthly">月繳</option>
                                <option value="per_session">堂繳</option>
                              </select>

                              {setting.billingMode === 'monthly' ? (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                  <label className="text-xs text-text-muted">
                                    <span className="mb-1 block">本次月繳金額</span>
                                    <input
                                      title="月繳金額"
                                      type="number"
                                      min={0}
                                      value={setting.amount}
                                      onChange={(e) => updateSetting(student.id, { amount: Math.max(0, Number(e.target.value)) })}
                                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
                                    />
                                  </label>
                                  <label className="text-xs text-text-muted">
                                    <span className="mb-1 block">覆核備註</span>
                                    <input
                                      title="月繳備註"
                                      type="text"
                                      value={setting.note}
                                      onChange={(e) => updateSetting(student.id, { note: e.target.value })}
                                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
                                      placeholder="例如：兄弟姐妹折扣"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <label className="text-xs text-text-muted">
                                    <span className="mb-1 block">每堂費用</span>
                                    <input
                                      title="每堂費用"
                                      type="number"
                                      min={0}
                                      value={setting.perSessionFee}
                                      onChange={(e) => updateSetting(student.id, { perSessionFee: Math.max(0, Number(e.target.value)) })}
                                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
                                    />
                                  </label>
                                  <label className="text-xs text-text-muted">
                                    <span className="mb-1 block">本月堂數</span>
                                    <input
                                      title="本月堂數"
                                      type="number"
                                      min={0}
                                      value={setting.sessionCount}
                                      onChange={(e) => updateSetting(student.id, { sessionCount: Math.max(0, Number(e.target.value)) })}
                                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
                                    />
                                  </label>
                                  <div className="rounded-lg border border-dashed border-border bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                    應收：NT$ {displayAmount.toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <p className="text-sm text-text-muted">已勾選 {selectedCount} 位，發布後將建立/更新待繳費單並發送繳費通知。</p>
                <button
                  onClick={handlePublishNotices}
                  disabled={publishing || selectedCount === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {publishing ? '發布中...' : '一鍵發布繳費單並通知家長'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

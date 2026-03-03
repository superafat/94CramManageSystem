'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useEffect, useState } from 'react'

const API_BASE = ''

type NotificationType = 'all' | 'grade_notification' | 'attendance_alert' | 'billing_reminder' | 'schedule_change'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  student_name: string
  created_at: string
  read: boolean
}

const TYPE_LABELS: Record<NotificationType, string> = {
  all: '全部',
  grade_notification: '成績',
  attendance_alert: '出勤',
  billing_reminder: '繳費',
  schedule_change: '課表',
}

const TYPE_ICONS: Record<NotificationType, string> = {
  all: '📬',
  grade_notification: '📊',
  attendance_alert: '✅',
  billing_reminder: '💰',
  schedule_change: '📅',
}

const TYPE_COLORS: Record<NotificationType, string> = {
  all: 'bg-primary/10 text-primary',
  grade_notification: 'bg-morandi-sage/20 text-morandi-sage',
  attendance_alert: 'bg-primary/10 text-primary',
  billing_reminder: 'bg-morandi-gold/20 text-morandi-gold',
  schedule_change: 'bg-morandi-rose/20 text-morandi-rose',
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

function formatDateGroup(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return '今天'
  if (d.getTime() === yesterday.getTime()) return '昨天'
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
}

function groupByDate(notifications: Notification[]): { date: string; items: Notification[] }[] {
  const groups: Map<string, Notification[]> = new Map()
  for (const n of notifications) {
    const key = formatDateGroup(n.created_at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(n)
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }))
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<NotificationType>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') params.set('type', filter)
      const res = await fetch(`${API_BASE}/api/w8/notifications?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('載入通知失敗')
      const json = await res.json()
      const payload = json.data ?? json
      setNotifications(payload.notifications || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleMarkRead = (id: string) => {
    setReadIds(prev => new Set([...prev, id]))
  }

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id)
    setReadIds(new Set(allIds))
  }

  const displayNotifications = notifications.map(n => ({
    ...n,
    read: n.read || readIds.has(n.id),
  }))

  const unreadCount = displayNotifications.filter(n => !n.read).length
  const grouped = groupByDate(displayNotifications)

  const filterTypes: NotificationType[] = ['all', 'grade_notification', 'attendance_alert', 'billing_reminder', 'schedule_change']

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded-xl" />
        <div className="h-12 bg-surface-hover animate-pulse rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-semibold text-text">載入失敗</h2>
        <p className="text-text-muted">{error}</p>
        <button
          onClick={loadNotifications}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <BackButton fallbackUrl="/my-children" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">電子聯絡簿</h1>
          <p className="text-text-muted mt-1">
            {unreadCount > 0 ? `${unreadCount} 則未讀通知` : '所有通知已讀'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5"
          >
            全部已讀
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === type
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-muted hover:border-primary hover:text-text'
            }`}
          >
            <span>{TYPE_ICONS[type]}</span>
            <span>{TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>

      {/* Notification list */}
      {displayNotifications.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">📭</div>
          <p className="text-text-muted">目前沒有通知</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.date} className="space-y-2">
              {/* Date divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-text-muted px-2">{group.date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Notifications for this date */}
              <div className="space-y-2">
                {group.items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`w-full text-left bg-surface rounded-xl border transition-all hover:shadow-sm ${
                      n.read ? 'border-border opacity-70' : 'border-primary/30 shadow-sm'
                    }`}
                  >
                    <div className="p-4 flex gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${TYPE_COLORS[n.type as NotificationType] || TYPE_COLORS.all}`}>
                        {TYPE_ICONS[n.type as NotificationType] || '📬'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${n.read ? 'text-text-muted' : 'text-text'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                            <span className="text-xs text-text-muted whitespace-nowrap">
                              {formatRelativeTime(n.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        {n.student_name && (
                          <span className="inline-block mt-1.5 text-xs bg-background text-text-muted px-2 py-0.5 rounded-md">
                            {n.student_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

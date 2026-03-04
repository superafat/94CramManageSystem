'use client'

import { useEffect, useState, useCallback } from 'react'
import { ConversionStats } from './components/ConversionStats'
import { FunnelChart } from './components/FunnelChart'
import { LeadTable, type Lead } from './components/LeadTable'
import { TrialBookingModal } from './components/TrialBookingModal'

type Period = 'week' | 'month' | 'quarter'

interface FunnelStage {
  stage: string
  label: string
  count: number
  percentage: number
}

interface StatsData {
  totalLeads: number
  conversionRate: number
  trialsScheduled: number
  enrolledCount: number
}

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'quarter', label: '季' },
]

function getTenantId() {
  return typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''
}

const API_BASE = ''

export default function EnrollmentPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([])
  const [stats, setStats] = useState<StatsData>({
    totalLeads: 0,
    conversionRate: 0,
    trialsScheduled: 0,
    enrolledCount: 0,
  })
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingFunnel, setLoadingFunnel] = useState(true)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Tenant-Id': getTenantId(),
  })

  const loadFunnelData = useCallback(async () => {
    setLoadingFunnel(true)
    try {
      const [funnelRes, convRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/enrollment/funnel?period=${period}`, {
          headers: getHeaders(),
          credentials: 'include',
        }),
        fetch(`${API_BASE}/api/admin/enrollment/conversion?period=${period}`, {
          headers: getHeaders(),
          credentials: 'include',
        }),
      ])

      if (funnelRes.ok) {
        const json = await funnelRes.json()
        const data = json.data ?? json
        setFunnelStages(data.stages || [])
      }

      if (convRes.ok) {
        const json = await convRes.json()
        const data = json.data ?? json
        setStats({
          totalLeads: data.total_leads ?? data.totalLeads ?? 0,
          conversionRate: data.conversion_rate ?? data.conversionRate ?? 0,
          trialsScheduled: data.trials_scheduled ?? data.trialsScheduled ?? 0,
          enrolledCount: data.enrolled_count ?? data.enrolledCount ?? 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoadingFunnel(false)
    }
  }, [period])

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/enrollment/funnel?period=${period}`, {
        headers: getHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        const data = json.data ?? json
        // leads may come from funnel endpoint or a separate endpoint
        setLeads(data.leads || [])
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingLeads(false)
    }
  }, [period])

  useEffect(() => {
    loadFunnelData()
    loadLeads()
  }, [loadFunnelData, loadLeads])

  const handleStatusChange = async (id: string, status: string, followUpDate?: string) => {
    try {
      const body: Record<string, string> = { status }
      if (followUpDate) body.follow_up_date = followUpDate
      const res = await fetch(`${API_BASE}/api/admin/enrollment/lead/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
        )
        // Refresh stats after status change
        loadFunnelData()
      }
    } catch {
      // handle silently
    }
  }

  const handleTrialSuccess = () => {
    setShowTrialModal(false)
    loadFunnelData()
    loadLeads()
  }

  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-text">招生管理</h1>
          <p className="text-sm text-text-muted">追蹤招生漏斗與諮詢進度</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === opt.key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Trial booking button */}
          <button
            onClick={() => setShowTrialModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + 預約試聽
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-[#B5706E]/10 text-[#B5706E] rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => { setError(null); loadFunnelData(); loadLeads() }}
            className="underline text-xs ml-4"
          >
            重試
          </button>
        </div>
      )}

      {/* Summary cards */}
      <ConversionStats
        totalLeads={stats.totalLeads}
        conversionRate={stats.conversionRate}
        trialsScheduled={stats.trialsScheduled}
        enrolledCount={stats.enrolledCount}
        loading={loadingFunnel}
      />

      {/* Funnel chart */}
      <FunnelChart stages={funnelStages} loading={loadingFunnel} />

      {/* Lead table section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text">諮詢名單</h2>
          <span className="text-sm text-text-muted">{leads.length} 筆</span>
        </div>
        <LeadTable
          leads={leads}
          loading={loadingLeads}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Trial booking modal */}
      {showTrialModal && (
        <TrialBookingModal
          onClose={() => setShowTrialModal(false)}
          onSuccess={handleTrialSuccess}
        />
      )}
    </div>
  )
}

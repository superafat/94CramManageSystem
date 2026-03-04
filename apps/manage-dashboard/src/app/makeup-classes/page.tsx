'use client'

import { useEffect, useState, useCallback } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { apiFetch } from '@/lib/api'

// ===== Types =====

type MakeupStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled'

interface MakeupClass {
  id: string
  student_id: string
  student_name: string
  original_course_name: string
  absent_date: string
  status: MakeupStatus
  makeup_date?: string | null
  start_time?: string | null
  end_time?: string | null
  teacher_id?: string | null
  teacher_name?: string | null
  location?: string | null
  notes?: string | null
  completed_at?: string | null
  created_at: string
}

interface MakeupSlot {
  id: string
  subject: string
  makeup_date: string
  start_time: string
  end_time: string
  teacher_id?: string
  teacher_name?: string
  room?: string
  max_students: number
  current_students: number
  notes?: string
}

interface Teacher {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
  full_name?: string
}

type TabKey = 'pending' | 'scheduled' | 'completed'

// ===== Constants =====

const STATUS_CONFIG: Record<MakeupStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待排定', color: 'text-[#B5706E]', bg: 'bg-[#B5706E]/10' },
  scheduled: { label: '已排定', color: 'text-[#C4956A]', bg: 'bg-[#C4956A]/10' },
  completed: { label: '已完成', color: 'text-[#7B9E89]', bg: 'bg-[#7B9E89]/10' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-100' },
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待排定' },
  { key: 'scheduled', label: '已排定' },
  { key: 'completed', label: '已完成' },
]

// ===== Component =====

export default function MakeupClassesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [records, setRecords] = useState<MakeupClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Schedule modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleTarget, setScheduleTarget] = useState<MakeupClass | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    makeupDate: '',
    startTime: '',
    endTime: '',
    teacherId: '',
    location: '',
    notes: '',
  })
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    studentId: '',
    absentDate: '',
    originalCourseName: '',
    notes: '',
  })
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Two-step schedule modal
  const [scheduleStep, setScheduleStep] = useState<'search' | 'create'>('search')
  const [slotSearchSubject, setSlotSearchSubject] = useState('')
  const [slotSearchDateFrom, setSlotSearchDateFrom] = useState('')
  const [slotSearchDateTo, setSlotSearchDateTo] = useState('')
  const [availableSlots, setAvailableSlots] = useState<MakeupSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotCreateForm, setSlotCreateForm] = useState({
    subject: '',
    makeupDate: '',
    startTime: '',
    endTime: '',
    teacherId: '',
    room: '',
    maxStudents: '10',
    notes: '',
  })
  const [slotCreateSubmitting, setSlotCreateSubmitting] = useState(false)

  // Batch selection
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set())
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchStep, setBatchStep] = useState<'search' | 'create'>('search')

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Dropdown data
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // ===== Data Loading =====

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ makeupClasses: MakeupClass[] }>(
        `/api/admin/makeup-classes?status=${activeTab}`
      )
      const payload = (data && typeof data === 'object' && 'data' in data)
        ? (data as { data: { makeupClasses: MakeupClass[] } }).data
        : data
      setRecords(payload.makeupClasses || [])
    } catch (err) {
      // Demo 模式下 API 可能回 404
      console.error('Failed to load makeup classes:', err)
      setRecords([])
      setError('載入補課資料失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const loadTeachers = useCallback(async () => {
    try {
      const data = await apiFetch<{ teachers: Teacher[] }>('/api/w8/teachers')
      const payload = (data && typeof data === 'object' && 'data' in data)
        ? (data as { data: { teachers: Teacher[] } }).data
        : data
      setTeachers(payload.teachers || [])
    } catch {
      // 忽略錯誤，下拉選單可為空
    }
  }, [])

  const loadStudents = useCallback(async () => {
    try {
      const data = await apiFetch<{ students: Student[] }>('/api/admin/students')
      const payload = (data && typeof data === 'object' && 'data' in data)
        ? (data as { data: { students: Student[] } }).data
        : data
      setStudents(payload.students || [])
    } catch {
      // 忽略錯誤
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    loadTeachers()
    loadStudents()
  }, [loadTeachers, loadStudents])

  // ===== Stats =====

  const pendingCount = records.length > 0 && activeTab === 'pending' ? records.length : 0
  const scheduledCount = records.length > 0 && activeTab === 'scheduled' ? records.length : 0
  const completedCount = records.length > 0 && activeTab === 'completed' ? records.length : 0

  // For stats we load all counts separately
  const [stats, setStats] = useState({ pending: 0, scheduled: 0, completedThisMonth: 0 })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiFetch<{ stats: { pending: number; scheduled: number; completedThisMonth: number } }>(
          '/api/admin/makeup-classes/stats'
        )
        const payload = (data && typeof data === 'object' && 'data' in data)
          ? (data as { data: { stats: { pending: number; scheduled: number; completedThisMonth: number } } }).data
          : data
        if (payload.stats) {
          setStats(payload.stats)
        }
      } catch {
        // 若 stats API 不存在，從列表資料推算
        // 保持目前 tab 的數量
        if (activeTab === 'pending') setStats(s => ({ ...s, pending: records.length }))
        if (activeTab === 'scheduled') setStats(s => ({ ...s, scheduled: records.length }))
        if (activeTab === 'completed') setStats(s => ({ ...s, completedThisMonth: records.length }))
      }
    }
    loadStats()
  }, [activeTab, records.length])

  // ===== Toast Helper =====

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ===== Schedule Modal =====

  const openScheduleModal = (record: MakeupClass) => {
    setScheduleTarget(record)
    setScheduleStep('search')
    setAvailableSlots([])
    setSlotSearchSubject(record.original_course_name || '')
    setSlotSearchDateFrom('')
    setSlotSearchDateTo('')
    setSlotCreateForm({
      subject: record.original_course_name || '',
      makeupDate: '',
      startTime: '',
      endTime: '',
      teacherId: '',
      room: '',
      maxStudents: '10',
      notes: '',
    })
    setScheduleForm({
      makeupDate: record.makeup_date || '',
      startTime: record.start_time || '',
      endTime: record.end_time || '',
      teacherId: record.teacher_id || '',
      location: record.location || '',
      notes: record.notes || '',
    })
    setScheduleModalOpen(true)
  }

  const searchSlots = async () => {
    setSlotsLoading(true)
    try {
      const params = new URLSearchParams()
      if (slotSearchSubject) params.set('subject', slotSearchSubject)
      if (slotSearchDateFrom) params.set('dateFrom', slotSearchDateFrom)
      if (slotSearchDateTo) params.set('dateTo', slotSearchDateTo)
      const data = await apiFetch<{ slots: MakeupSlot[] }>(
        `/api/admin/makeup-slots?${params.toString()}`
      )
      const payload = (data && typeof data === 'object' && 'data' in data)
        ? (data as { data: { slots: MakeupSlot[] } }).data
        : data
      setAvailableSlots(payload.slots || [])
    } catch {
      setAvailableSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const assignToSlot = async (slotId: string, makeupClassId: string) => {
    setScheduleSubmitting(true)
    try {
      await apiFetch(`/api/admin/makeup-classes/${makeupClassId}`, {
        method: 'PUT',
        body: JSON.stringify({ slotId }),
      })
      showToast('已成功安排補課')
      setScheduleModalOpen(false)
      loadRecords()
    } catch {
      showToast('安排補課失敗', 'error')
      setScheduleModalOpen(false)
      loadRecords()
    } finally {
      setScheduleSubmitting(false)
    }
  }

  const submitCreateSlotAndAssign = async (makeupClassId: string) => {
    if (!slotCreateForm.subject || !slotCreateForm.makeupDate || !slotCreateForm.startTime || !slotCreateForm.endTime) return
    setSlotCreateSubmitting(true)
    try {
      const slotData = await apiFetch<{ slot: MakeupSlot }>('/api/admin/makeup-slots', {
        method: 'POST',
        body: JSON.stringify({
          subject: slotCreateForm.subject,
          makeupDate: slotCreateForm.makeupDate,
          startTime: slotCreateForm.startTime,
          endTime: slotCreateForm.endTime,
          teacherId: slotCreateForm.teacherId || undefined,
          room: slotCreateForm.room || undefined,
          maxStudents: parseInt(slotCreateForm.maxStudents) || 10,
          notes: slotCreateForm.notes || undefined,
        }),
      })
      const slotPayload = (slotData && typeof slotData === 'object' && 'data' in slotData)
        ? (slotData as { data: { slot: MakeupSlot } }).data
        : slotData
      const newSlotId = slotPayload.slot?.id
      if (newSlotId) {
        await apiFetch(`/api/admin/makeup-classes/${makeupClassId}`, {
          method: 'PUT',
          body: JSON.stringify({ slotId: newSlotId }),
        })
      }
      showToast('已建立時段並安排補課')
      setScheduleModalOpen(false)
      loadRecords()
    } catch {
      showToast('建立時段失敗', 'error')
      setScheduleModalOpen(false)
      loadRecords()
    } finally {
      setSlotCreateSubmitting(false)
    }
  }

  const submitSchedule = async () => {
    if (!scheduleTarget || !scheduleForm.makeupDate || !scheduleForm.startTime || !scheduleForm.endTime) return
    setScheduleSubmitting(true)
    try {
      await apiFetch(`/api/admin/makeup-classes/${scheduleTarget.id}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({
          makeupDate: scheduleForm.makeupDate,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          teacherId: scheduleForm.teacherId || undefined,
          location: scheduleForm.location || undefined,
          notes: scheduleForm.notes || undefined,
        }),
      })
      setScheduleModalOpen(false)
      loadRecords()
    } catch {
      // Demo 模式下視為成功
      setScheduleModalOpen(false)
      loadRecords()
    } finally {
      setScheduleSubmitting(false)
    }
  }

  // ===== Batch Assign =====

  const togglePendingSelection = (id: string) => {
    setSelectedPendingIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPending = () => {
    if (selectedPendingIds.size === records.length) {
      setSelectedPendingIds(new Set())
    } else {
      setSelectedPendingIds(new Set(records.map(r => r.id)))
    }
  }

  const openBatchModal = () => {
    setBatchStep('search')
    setAvailableSlots([])
    setSlotSearchSubject('')
    setSlotSearchDateFrom('')
    setSlotSearchDateTo('')
    setSlotCreateForm({
      subject: '',
      makeupDate: '',
      startTime: '',
      endTime: '',
      teacherId: '',
      room: '',
      maxStudents: '10',
      notes: '',
    })
    setBatchModalOpen(true)
  }

  const batchAssignToSlot = async (slotId: string) => {
    setScheduleSubmitting(true)
    try {
      await apiFetch('/api/admin/makeup-classes/batch-assign', {
        method: 'POST',
        body: JSON.stringify({
          slotId,
          makeupClassIds: Array.from(selectedPendingIds),
        }),
      })
      showToast(`已批量安排 ${selectedPendingIds.size} 筆補課`)
      setBatchModalOpen(false)
      setSelectedPendingIds(new Set())
      loadRecords()
    } catch {
      showToast('批量安排失敗', 'error')
      setBatchModalOpen(false)
      loadRecords()
    } finally {
      setScheduleSubmitting(false)
    }
  }

  const batchCreateSlotAndAssign = async () => {
    if (!slotCreateForm.subject || !slotCreateForm.makeupDate || !slotCreateForm.startTime || !slotCreateForm.endTime) return
    setSlotCreateSubmitting(true)
    try {
      const slotData = await apiFetch<{ slot: MakeupSlot }>('/api/admin/makeup-slots', {
        method: 'POST',
        body: JSON.stringify({
          subject: slotCreateForm.subject,
          makeupDate: slotCreateForm.makeupDate,
          startTime: slotCreateForm.startTime,
          endTime: slotCreateForm.endTime,
          teacherId: slotCreateForm.teacherId || undefined,
          room: slotCreateForm.room || undefined,
          maxStudents: parseInt(slotCreateForm.maxStudents) || 10,
          notes: slotCreateForm.notes || undefined,
        }),
      })
      const slotPayload = (slotData && typeof slotData === 'object' && 'data' in slotData)
        ? (slotData as { data: { slot: MakeupSlot } }).data
        : slotData
      const newSlotId = slotPayload.slot?.id
      if (newSlotId) {
        await apiFetch('/api/admin/makeup-classes/batch-assign', {
          method: 'POST',
          body: JSON.stringify({
            slotId: newSlotId,
            makeupClassIds: Array.from(selectedPendingIds),
          }),
        })
      }
      showToast(`已建立時段並批量安排 ${selectedPendingIds.size} 筆補課`)
      setBatchModalOpen(false)
      setSelectedPendingIds(new Set())
      loadRecords()
    } catch {
      showToast('批量建立時段失敗', 'error')
      setBatchModalOpen(false)
      loadRecords()
    } finally {
      setSlotCreateSubmitting(false)
    }
  }

  // ===== Notification =====

  const sendNotify = async (id: string) => {
    try {
      await apiFetch(`/api/admin/makeup-classes/${id}/notify`, { method: 'POST' })
      showToast('通知已發送')
    } catch {
      showToast('發送通知失敗', 'error')
    }
  }

  const openNoticePdf = (id: string) => {
    window.open(`/api/admin/makeup-classes/${id}/notice-pdf`, '_blank')
  }

  // ===== Add Modal =====

  const openAddModal = () => {
    setAddForm({
      studentId: '',
      absentDate: new Date().toISOString().split('T')[0],
      originalCourseName: '',
      notes: '',
    })
    setAddModalOpen(true)
  }

  const submitAdd = async () => {
    if (!addForm.studentId || !addForm.absentDate || !addForm.originalCourseName) return
    setAddSubmitting(true)
    try {
      await apiFetch('/api/admin/makeup-classes', {
        method: 'POST',
        body: JSON.stringify({
          studentId: addForm.studentId,
          absentDate: addForm.absentDate,
          originalCourseName: addForm.originalCourseName,
          notes: addForm.notes || undefined,
        }),
      })
      setAddModalOpen(false)
      loadRecords()
    } catch {
      // Demo 模式下視為成功
      setAddModalOpen(false)
      loadRecords()
    } finally {
      setAddSubmitting(false)
    }
  }

  // ===== Actions =====

  const markComplete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/makeup-classes/${id}/complete`, { method: 'PUT' })
      loadRecords()
    } catch {
      loadRecords()
    }
  }

  const cancelMakeup = async (id: string) => {
    if (!confirm('確定要取消此補課嗎？')) return
    try {
      await apiFetch(`/api/admin/makeup-classes/${id}/cancel`, { method: 'PUT' })
      loadRecords()
    } catch {
      loadRecords()
    }
  }

  // ===== Render =====

  if (loading && records.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-surface-hover animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">補課管理</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm font-medium"
        >
          + 新增補課
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadRecords} className="text-sm underline">重試</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#B5706E]">{stats.pending}</div>
          <div className="text-sm text-text-muted">待補課數</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#C4956A]">{stats.scheduled}</div>
          <div className="text-sm text-text-muted">已排定數</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#7B9E89]">{stats.completedThisMonth}</div>
          <div className="text-sm text-text-muted">本月已完成</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && stats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[#B5706E]/10 text-[#B5706E] text-xs rounded-full">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Batch action bar */}
      {activeTab === 'pending' && selectedPendingIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <span className="text-sm text-text">
            已選取 <span className="font-semibold text-primary">{selectedPendingIds.size}</span> 筆
          </span>
          <button
            onClick={openBatchModal}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            批量安排
          </button>
          <button
            onClick={() => setSelectedPendingIds(new Set())}
            className="px-3 py-2 text-sm text-text-muted hover:text-text"
          >
            取消選取
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              {activeTab === 'pending' && (
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={records.length > 0 && selectedPendingIds.size === records.length}
                    onChange={toggleAllPending}
                    className="rounded border-border text-primary focus:ring-primary/30"
                  />
                </th>
              )}
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">學生</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">原課程</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">缺課日期</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">狀態</th>
              {activeTab === 'scheduled' && (
                <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">補課資訊</th>
              )}
              {activeTab === 'completed' && (
                <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">完成資訊</th>
              )}
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map(record => {
              const statusCfg = STATUS_CONFIG[record.status]
              return (
                <tr key={record.id} className="hover:bg-surface/50">
                  {activeTab === 'pending' && (
                    <td className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedPendingIds.has(record.id)}
                        onChange={() => togglePendingSelection(record.id)}
                        className="rounded border-border text-primary focus:ring-primary/30"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-text">{record.student_name}</td>
                  <td className="px-6 py-4 text-sm text-text">{record.original_course_name}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{record.absent_date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </td>

                  {activeTab === 'scheduled' && (
                    <td className="px-6 py-4 text-sm text-text-muted">
                      <div className="space-y-0.5">
                        {record.makeup_date && <div>{record.makeup_date}</div>}
                        {record.start_time && record.end_time && (
                          <div>{record.start_time} - {record.end_time}</div>
                        )}
                        {record.teacher_name && <div>講師：{record.teacher_name}</div>}
                        {record.location && <div>地點：{record.location}</div>}
                      </div>
                    </td>
                  )}

                  {activeTab === 'completed' && (
                    <td className="px-6 py-4 text-sm text-text-muted">
                      <div className="space-y-0.5">
                        {record.makeup_date && <div>補課日期：{record.makeup_date}</div>}
                        {record.teacher_name && <div>講師：{record.teacher_name}</div>}
                        {record.completed_at && (
                          <div>完成時間：{new Date(record.completed_at).toLocaleDateString('zh-TW')}</div>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <button
                          onClick={() => openScheduleModal(record)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                          排定補課
                        </button>
                      )}
                      {activeTab === 'scheduled' && (
                        <>
                          <button
                            onClick={() => markComplete(record.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#7B9E89]/40 text-[#7B9E89] hover:bg-[#7B9E89]/10 transition-colors"
                          >
                            完成
                          </button>
                          <button
                            onClick={() => sendNotify(record.id)}
                            className="text-xs px-2 py-1 rounded-lg border border-[#C4956A]/40 text-[#C4956A] hover:bg-[#C4956A]/10 transition-colors"
                          >
                            發送通知
                          </button>
                          <button
                            onClick={() => openNoticePdf(record.id)}
                            className="text-xs px-2 py-1 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                          >
                            通知書
                          </button>
                          <button
                            onClick={() => cancelMakeup(record.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      )}
                      {activeTab === 'completed' && (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {records.length === 0 && !loading && (
          <div className="text-center py-12 text-text-muted">
            {activeTab === 'pending' && '目前沒有待排定的補課'}
            {activeTab === 'scheduled' && '目前沒有已排定的補課'}
            {activeTab === 'completed' && '目前沒有已完成的補課記錄'}
          </div>
        )}
        {loading && records.length === 0 && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>

      {/* Schedule Modal (Two-step) */}
      {scheduleModalOpen && scheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-text">
                {scheduleStep === 'search' ? '安排補課 - 搜尋時段' : '安排補課 - 建立新時段'}
              </h2>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-text-muted hover:text-text text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* 學生資訊 */}
              <div className="bg-surface rounded-xl p-3 text-sm">
                <span className="text-text-muted">學生：</span>
                <span className="font-medium text-text">{scheduleTarget.student_name}</span>
                <span className="text-text-muted ml-3">課程：</span>
                <span className="text-text">{scheduleTarget.original_course_name}</span>
                <span className="text-text-muted ml-3">缺課：</span>
                <span className="text-text">{scheduleTarget.absent_date}</span>
              </div>

              {/* Step tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleStep('search')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    scheduleStep === 'search'
                      ? 'bg-primary text-white'
                      : 'border border-border text-text-muted hover:text-text'
                  }`}
                >
                  搜尋現有時段
                </button>
                <button
                  onClick={() => setScheduleStep('create')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    scheduleStep === 'create'
                      ? 'bg-primary text-white'
                      : 'border border-border text-text-muted hover:text-text'
                  }`}
                >
                  建立新時段
                </button>
              </div>

              {scheduleStep === 'search' && (
                <>
                  {/* Search filters */}
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={slotSearchSubject}
                      onChange={e => setSlotSearchSubject(e.target.value)}
                      placeholder="科目"
                      className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="date"
                      value={slotSearchDateFrom}
                      onChange={e => setSlotSearchDateFrom(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="date"
                      value={slotSearchDateTo}
                      onChange={e => setSlotSearchDateTo(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={searchSlots}
                    disabled={slotsLoading}
                    className="w-full px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {slotsLoading ? '搜尋中...' : '搜尋可用時段'}
                  </button>

                  {/* Slot cards */}
                  {availableSlots.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableSlots.map(slot => (
                        <div key={slot.id} className="border border-border rounded-xl p-3 flex items-center justify-between hover:bg-surface/50">
                          <div className="text-sm space-y-0.5">
                            <div className="font-medium text-text">{slot.subject}</div>
                            <div className="text-text-muted">
                              {slot.makeup_date} {slot.start_time} - {slot.end_time}
                            </div>
                            <div className="text-text-muted text-xs">
                              {slot.teacher_name && `講師：${slot.teacher_name}`}
                              {slot.room && ` | 教室：${slot.room}`}
                              {` | 人數：${slot.current_students}/${slot.max_students}`}
                            </div>
                          </div>
                          <button
                            onClick={() => assignToSlot(slot.id, scheduleTarget.id)}
                            disabled={scheduleSubmitting || slot.current_students >= slot.max_students}
                            className="shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            加入此時段
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {availableSlots.length === 0 && !slotsLoading && (
                    <div className="text-center py-4 text-sm text-text-muted">
                      尚未搜尋或無可用時段
                    </div>
                  )}

                  <button
                    onClick={() => setScheduleStep('create')}
                    className="w-full px-4 py-2 border border-dashed border-primary/40 text-primary rounded-xl text-sm hover:bg-primary/5 transition-colors"
                  >
                    找不到合適的？建立新補課時段
                  </button>
                </>
              )}

              {scheduleStep === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      科目 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={slotCreateForm.subject}
                      onChange={e => setSlotCreateForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="例：國中數學"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      補課日期 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={slotCreateForm.makeupDate}
                      onChange={e => setSlotCreateForm(f => ({ ...f, makeupDate: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        開始時間 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={slotCreateForm.startTime}
                        onChange={e => setSlotCreateForm(f => ({ ...f, startTime: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        結束時間 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={slotCreateForm.endTime}
                        onChange={e => setSlotCreateForm(f => ({ ...f, endTime: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">指派講師</label>
                    <select
                      value={slotCreateForm.teacherId}
                      onChange={e => setSlotCreateForm(f => ({ ...f, teacherId: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">-- 選擇講師 --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">教室</label>
                      <input
                        type="text"
                        value={slotCreateForm.room}
                        onChange={e => setSlotCreateForm(f => ({ ...f, room: e.target.value }))}
                        placeholder="例：A教室"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">最大人數</label>
                      <input
                        type="number"
                        value={slotCreateForm.maxStudents}
                        onChange={e => setSlotCreateForm(f => ({ ...f, maxStudents: e.target.value }))}
                        min="1"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">備註</label>
                    <textarea
                      value={slotCreateForm.notes}
                      onChange={e => setSlotCreateForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="選填..."
                      rows={2}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setScheduleStep('search')}
                      className="flex-1 px-4 py-2 border border-border rounded-xl text-sm hover:bg-surface"
                    >
                      返回搜尋
                    </button>
                    <button
                      onClick={() => submitCreateSlotAndAssign(scheduleTarget.id)}
                      disabled={slotCreateSubmitting || !slotCreateForm.subject || !slotCreateForm.makeupDate || !slotCreateForm.startTime || !slotCreateForm.endTime}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {slotCreateSubmitting ? '建立中...' : '建立並排定'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">新增補課</h2>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-text-muted hover:text-text text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  選擇學生 <span className="text-red-400">*</span>
                </label>
                <select
                  value={addForm.studentId}
                  onChange={e => setAddForm(f => ({ ...f, studentId: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">-- 選擇學生 --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name || s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  缺課日期 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={addForm.absentDate}
                  onChange={e => setAddForm(f => ({ ...f, absentDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  原課程名稱 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.originalCourseName}
                  onChange={e => setAddForm(f => ({ ...f, originalCourseName: e.target.value }))}
                  placeholder="例：國中數學 A 班"
                  className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">備註</label>
                <textarea
                  value={addForm.notes}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="選填..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-xl text-sm hover:bg-surface"
                >
                  取消
                </button>
                <button
                  onClick={submitAdd}
                  disabled={addSubmitting || !addForm.studentId || !addForm.absentDate || !addForm.originalCourseName}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {addSubmitting ? '新增中...' : '確認新增'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Assign Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-text">
                {batchStep === 'search'
                  ? `批量安排 (${selectedPendingIds.size} 筆) - 搜尋時段`
                  : `批量安排 (${selectedPendingIds.size} 筆) - 建立新時段`}
              </h2>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-text-muted hover:text-text text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* Step tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBatchStep('search')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    batchStep === 'search'
                      ? 'bg-primary text-white'
                      : 'border border-border text-text-muted hover:text-text'
                  }`}
                >
                  搜尋現有時段
                </button>
                <button
                  onClick={() => setBatchStep('create')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    batchStep === 'create'
                      ? 'bg-primary text-white'
                      : 'border border-border text-text-muted hover:text-text'
                  }`}
                >
                  建立新時段
                </button>
              </div>

              {batchStep === 'search' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={slotSearchSubject}
                      onChange={e => setSlotSearchSubject(e.target.value)}
                      placeholder="科目"
                      className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="date"
                      value={slotSearchDateFrom}
                      onChange={e => setSlotSearchDateFrom(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="date"
                      value={slotSearchDateTo}
                      onChange={e => setSlotSearchDateTo(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={searchSlots}
                    disabled={slotsLoading}
                    className="w-full px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {slotsLoading ? '搜尋中...' : '搜尋可用時段'}
                  </button>

                  {availableSlots.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableSlots.map(slot => (
                        <div key={slot.id} className="border border-border rounded-xl p-3 flex items-center justify-between hover:bg-surface/50">
                          <div className="text-sm space-y-0.5">
                            <div className="font-medium text-text">{slot.subject}</div>
                            <div className="text-text-muted">
                              {slot.makeup_date} {slot.start_time} - {slot.end_time}
                            </div>
                            <div className="text-text-muted text-xs">
                              {slot.teacher_name && `講師：${slot.teacher_name}`}
                              {slot.room && ` | 教室：${slot.room}`}
                              {` | 人數：${slot.current_students}/${slot.max_students}`}
                            </div>
                          </div>
                          <button
                            onClick={() => batchAssignToSlot(slot.id)}
                            disabled={scheduleSubmitting || slot.current_students + selectedPendingIds.size > slot.max_students}
                            className="shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            批量加入
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {availableSlots.length === 0 && !slotsLoading && (
                    <div className="text-center py-4 text-sm text-text-muted">
                      尚未搜尋或無可用時段
                    </div>
                  )}

                  <button
                    onClick={() => setBatchStep('create')}
                    className="w-full px-4 py-2 border border-dashed border-primary/40 text-primary rounded-xl text-sm hover:bg-primary/5 transition-colors"
                  >
                    找不到合適的？建立新補課時段
                  </button>
                </>
              )}

              {batchStep === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      科目 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={slotCreateForm.subject}
                      onChange={e => setSlotCreateForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="例：國中數學"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      補課日期 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={slotCreateForm.makeupDate}
                      onChange={e => setSlotCreateForm(f => ({ ...f, makeupDate: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        開始時間 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={slotCreateForm.startTime}
                        onChange={e => setSlotCreateForm(f => ({ ...f, startTime: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        結束時間 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={slotCreateForm.endTime}
                        onChange={e => setSlotCreateForm(f => ({ ...f, endTime: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">指派講師</label>
                    <select
                      value={slotCreateForm.teacherId}
                      onChange={e => setSlotCreateForm(f => ({ ...f, teacherId: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">-- 選擇講師 --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">教室</label>
                      <input
                        type="text"
                        value={slotCreateForm.room}
                        onChange={e => setSlotCreateForm(f => ({ ...f, room: e.target.value }))}
                        placeholder="例：A教室"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">最大人數</label>
                      <input
                        type="number"
                        value={slotCreateForm.maxStudents}
                        onChange={e => setSlotCreateForm(f => ({ ...f, maxStudents: e.target.value }))}
                        min="1"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">備註</label>
                    <textarea
                      value={slotCreateForm.notes}
                      onChange={e => setSlotCreateForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="選填..."
                      rows={2}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setBatchStep('search')}
                      className="flex-1 px-4 py-2 border border-border rounded-xl text-sm hover:bg-surface"
                    >
                      返回搜尋
                    </button>
                    <button
                      onClick={batchCreateSlotAndAssign}
                      disabled={slotCreateSubmitting || !slotCreateForm.subject || !slotCreateForm.makeupDate || !slotCreateForm.startTime || !slotCreateForm.endTime}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {slotCreateSubmitting ? '建立中...' : '建立並批量排定'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-[#7B9E89]' : 'bg-[#B5706E]'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

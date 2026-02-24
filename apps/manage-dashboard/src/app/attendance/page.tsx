'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  date: string
  present: boolean
  status?: string
  notes: string
  grade_level: string
}

interface Student {
  id: string
  full_name: string
  grade_level: string
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [editMode, setEditMode] = useState(false)
  const [changes, setChanges] = useState<Record<string, 'present' | 'late' | 'absent'>>({})

  const API_BASE = ''

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      
      // 載入出席記錄
      const attRes = await fetch(`${API_BASE}/api/admin/attendance?from=${selectedDate}&to=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (attRes.ok) {
        const data = await attRes.json()
        setRecords(data.attendance || [])
      }
      
      // 載入學生清單（用於新增點名）
      const stuRes = await fetch(`${API_BASE}/api/admin/students?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (stuRes.ok) {
        const data = await stuRes.json()
        setStudents(data.students || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [selectedDate])

  const handleStatusChange = (studentId: string, status: 'present' | 'late' | 'absent') => {
    setChanges(prev => ({ ...prev, [studentId]: status }))
  }

  const saveAttendance = async () => {
    if (Object.keys(changes).length === 0) return
    
    setSaving(true)
    const token = localStorage.getItem('token')
    
    try {
      for (const [studentId, status] of Object.entries(changes)) {
        await fetch(`${API_BASE}/api/admin/attendance`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId,
            date: selectedDate,
            status,
            present: status === 'present' || status === 'late'
          })
        })
      }
      setChanges({})
      setEditMode(false)
      await loadData()
    } catch (err) {
      setError('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  // 合併學生清單和出席記錄
  const attendanceList = editMode 
    ? students.map(s => {
        const existing = records.find(r => r.student_id === s.id)
        return {
          id: existing?.id || s.id,
          student_id: s.id,
          student_name: s.full_name,
          grade_level: s.grade_level,
          date: selectedDate,
          present: existing?.present ?? true,
          status: changes[s.id] || (existing?.present ? 'present' : 'absent'),
          notes: existing?.notes || ''
        }
      })
    : records

  const stats = {
    total: attendanceList.length,
    present: attendanceList.filter(r => r.present || r.status === 'present' || r.status === 'late').length,
    absent: attendanceList.filter(r => !r.present && r.status !== 'present' && r.status !== 'late').length,
    rate: attendanceList.length ? Math.round((attendanceList.filter(r => r.present || r.status === 'present').length / attendanceList.length) * 100) : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <BackButton />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">出席管理</h1>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border bg-white"
          />
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setChanges({}) }}
                className="px-4 py-2 border border-border rounded-xl hover:bg-surface"
              >
                取消
              </button>
              <button
                onClick={saveAttendance}
                disabled={saving || Object.keys(changes).length === 0}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '儲存中...' : `儲存 (${Object.keys(changes).length})`}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90"
            >
              ✏️ 點名模式
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadData} className="text-sm underline">重試</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-text">{stats.total}</div>
          <div className="text-sm text-text-muted">總人數</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#7B9E89]">{stats.present}</div>
          <div className="text-sm text-text-muted">出席</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#B5706E]">{stats.absent}</div>
          <div className="text-sm text-text-muted">缺席</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-primary">{stats.rate}%</div>
          <div className="text-sm text-text-muted">出席率</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">學生</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">年級</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">狀態</th>
              {editMode && <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">點名</th>}
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attendanceList.map((record) => (
              <tr key={record.student_id} className="hover:bg-surface/50">
                <td className="px-6 py-4 text-sm text-text">{record.student_name}</td>
                <td className="px-6 py-4 text-sm text-text-muted">{record.grade_level}</td>
                <td className="px-6 py-4">
                  {!editMode && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      record.present || record.status === 'present'
                        ? 'bg-[#7B9E89]/10 text-[#7B9E89]' 
                        : record.status === 'late'
                        ? 'bg-[#C4956A]/10 text-[#C4956A]'
                        : 'bg-[#B5706E]/10 text-[#B5706E]'
                    }`}>
                      {record.present || record.status === 'present' ? '✓ 出席' : record.status === 'late' ? '⏰ 遲到' : '✗ 缺席'}
                    </span>
                  )}
                </td>
                {editMode && (
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {(['present', 'late', 'absent'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(record.student_id, status)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            (changes[record.student_id] || record.status) === status
                              ? status === 'present' ? 'bg-[#7B9E89] text-white'
                                : status === 'late' ? 'bg-[#C4956A] text-white'
                                : 'bg-[#B5706E] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {status === 'present' ? '出席' : status === 'late' ? '遲到' : '缺席'}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-text-muted">{record.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendanceList.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            {editMode ? '載入學生清單中...' : '該日期無出席記錄，點擊「點名模式」開始點名'}
          </div>
        )}
      </div>
    </div>
  )
}

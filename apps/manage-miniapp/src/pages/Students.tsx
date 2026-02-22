import { useState, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { PullToRefresh } from '../components/PullToRefresh'
import { DEMO_STUDENTS } from '../data/demo'
import { normalizeStudent } from '../utils/normalizers'
import { formatCurrency } from '../utils/format'
import { getUser, getUserRole } from '../utils/auth'

export default function Students() {
  const user = getUser()
  const userRole = getUserRole()
  
  // superadmin 走同一隻 admin/students
  const getStudentsEndpoint = () => {
    switch (userRole) {
      case 'teacher':
        return `/admin/students?teacherId=${user?.id || ''}`
      default:
        return '/admin/students'
    }
  }
  
  const { data: rawData, loading, error, refetch } = useApi<any>(
    getStudentsEndpoint()
  )
  
  // API 回傳 { students: [...], pagination: {...} }
  const rawStudents = rawData?.students ?? (Array.isArray(rawData) ? rawData : null)
  const students = rawStudents 
    ? rawStudents.map((s: any) => normalizeStudent(s))
    : null
  
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'risk'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Use demo data if API fails (but students see only themselves)
  const displayStudents = students || (userRole === 'student' ? DEMO_STUDENTS.slice(0, 1) : DEMO_STUDENTS)
  const isDemo = !students

  // Memoize filtered students for performance
  const filtered = useMemo(() => {
    return displayStudents.filter((s: any) => {
      if (search && !s.name.includes(search) && !s.grade.includes(search)) return false
      if (filter === 'risk' && !s.risk) return false
      return true
    })
  }, [displayStudents, search, filter])

  const riskCount = useMemo(() => 
    displayStudents.filter((s: any) => s.risk).length, 
    [displayStudents]
  )

  if (loading) {
    return <LoadingSkeleton type="list" count={6} />
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-4">
        {isDemo && (
          <div className="rounded-xl px-3 py-2 text-xs text-center" 
            style={{ background: '#94a7b822', color: 'var(--blue)' }}>
            📋 展示模式 {error && `(${error.message})`}
          </div>
        )}

        {userRole === 'student' && (
          <div className="rounded-xl px-3 py-2 text-xs text-center" 
            style={{ background: '#c4b5a033', color: 'var(--sand)' }}>
            📚 這是你的個人資料
          </div>
        )}

        {userRole !== 'student' && (
          <>
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="🔍 搜尋學生姓名或年級..."
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none" 
              style={{ borderColor: 'rgba(143,168,154,0.3)', color: '#1a1a1a', backgroundColor: '#ffffff' }} 
            />

            <div className="flex gap-2">
              {(['all', 'risk'] as const).map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ 
                    background: filter === f ? 'var(--sage)' : 'white', 
                    color: filter === f ? 'white' : 'var(--stone)', 
                    border: '1px solid var(--sage)' 
                  }}>
                  {f === 'all' ? `全部 (${displayStudents.length})` : `⚠️ 風險 (${riskCount})`}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="space-y-3">
          {filtered.map((s: any) => {
            const isExpanded = expandedId === s.id
            return (
              <div 
                key={s.id} 
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-transform" 
                style={s.risk ? { 
                  borderLeft: `4px solid ${s.risk === 'high' ? 'var(--rose)' : '#c4b5a0'}` 
                } : {}}
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold" style={{ color: '#4a5568' }}>
                      {s.name}
                    </span>
                    <span className="ml-2 text-sm px-2 py-0.5 rounded-full" 
                      style={{ background: 'var(--cream)', color: 'var(--stone)' }}>
                      {s.grade}
                    </span>
                    {s.risk && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full" 
                        style={{ 
                          background: s.risk === 'high' ? '#c9a9a633' : '#c4b5a033', 
                          color: s.risk === 'high' ? 'var(--rose)' : '#c4b5a0' 
                        }}>
                        {s.risk === 'high' ? '🔴 高風險' : '🟡 中風險'}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm" style={{ color: 'var(--stone)' }}>
                    <div>
                      出席 <b style={{ 
                        color: s.attendanceRate >= 80 ? 'var(--sage)' : 'var(--rose)' 
                      }}>{s.attendanceRate}%</b>
                    </div>
                    <div>
                      成績 <b style={{ color: 'var(--blue)' }}>{s.avgGrade}</b>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  {s.subjects.map((subj: string) => (
                    <span 
                      key={subj} 
                      className="text-xs px-2 py-1 rounded-full" 
                      style={{ background: '#94a7b822', color: 'var(--blue)' }}>
                      {subj}
                    </span>
                  ))}
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-sm" style={{ borderColor: 'rgba(155,149,144,0.1)', color: 'var(--stone)' }}>
                    <div className="flex justify-between">
                      <span>📱 聯絡電話：</span>
                      <span className="font-medium">{s.phone || '未提供'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📧 Email：</span>
                      <span className="font-medium">{s.email || '未提供'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📅 加入日期：</span>
                      <span className="font-medium">{s.joinDate || '未提供'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>💰 月學費：</span>
                      <span className="font-medium">{s.monthlyFee != null ? formatCurrency(s.monthlyFee) : '未提供'}</span>
                    </div>
                    {s.risk && (
                      <div className="mt-2 p-2 rounded-lg" style={{ background: '#c9a9a622', color: 'var(--rose)' }}>
                        <strong>⚠️ 風險因素：</strong>
                        <ul className="mt-1 text-xs space-y-1 ml-4">
                          {s.attendanceRate < 80 && <li>• 出席率偏低</li>}
                          {s.avgGrade < 75 && <li>• 成績有待加強</li>}
                          <li>• 建議家長諮詢面談</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--stone)' }}>
              找不到符合條件的學生
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  )
}

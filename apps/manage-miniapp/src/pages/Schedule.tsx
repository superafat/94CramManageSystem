import { useState, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { PullToRefresh } from '../components/PullToRefresh'
import { DEMO_SCHEDULE } from '../data/demo'
import { normalizeScheduleSlot } from '../utils/normalizers'

const DAYS = ['', '一', '二', '三', '四', '五', '六', '日']

export default function Schedule() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 7) // 0=Sun→7
  
  // 使用 W8 API（有真實資料）
  const { data: rawData, loading, error, refetch } = useApi<any>(
    '/w8/schedules'
  )

  // Normalize W8 schedule data
  const schedule = rawData 
    ? (Array.isArray(rawData) ? rawData : rawData.schedules || []).map((s: any) => normalizeScheduleSlot(s)) 
    : null
  const displaySchedule = schedule || DEMO_SCHEDULE
  const isDemo = !schedule

  const todaySlots = useMemo(() => 
    displaySchedule.filter((s: any) => s.day === selectedDay),
    [displaySchedule, selectedDay]
  )

  const weeklyCounts = useMemo(() => 
    [1, 2, 3, 4, 5, 6].map(d => ({
      day: d,
      count: displaySchedule.filter((s: any) => s.day === d).length
    })),
    [displaySchedule]
  )

  if (loading) {
    return <LoadingSkeleton type="card" count={5} />
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

        {/* Day selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6].map(d => (
            <button 
              key={d} 
              onClick={() => setSelectedDay(d)}
              className="flex-shrink-0 w-12 h-14 rounded-xl flex flex-col items-center justify-center font-medium transition-all"
              style={{ 
                background: selectedDay === d ? 'var(--sage)' : 'white', 
                color: selectedDay === d ? 'white' : '#4a5568', 
                border: '1px solid var(--sage)' 
              }}>
              <span className="text-xs">週</span>
              <span className="text-lg">{DAYS[d]}</span>
            </button>
          ))}
        </div>

        {/* Time slots */}
        <div className="space-y-3">
          {todaySlots.length > 0 ? (
            todaySlots.map((slot: any) => (
              <div 
                key={slot.id} 
                className="bg-white rounded-xl p-4 shadow-sm" 
                style={{ borderLeft: '4px solid var(--sage)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold" style={{ color: '#4a5568' }}>
                      {slot.subject}
                    </p>
                    <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                      🕐 {slot.time}
                    </p>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      👨‍🏫 {slot.teacher} · 📍 {slot.classroom}
                    </p>
                  </div>
                  {slot.students > 0 && (
                    <div className="text-right">
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-medium" 
                        style={{ background: '#8fa89a22', color: 'var(--sage)' }}>
                        👥 {slot.students}人
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12" style={{ color: '#6b7280' }}>
              <p className="text-4xl mb-2">🌴</p>
              <p>週{DAYS[selectedDay]}沒有排課</p>
            </div>
          )}
        </div>

        {/* Weekly summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-2" style={{ color: '#4a5568' }}>
            📅 本週概覽
          </h3>
          <div className="grid grid-cols-6 gap-1">
            {weeklyCounts.map(({ day, count }) => (
              <div key={day} className="text-center">
                <div className="text-xs" style={{ color: '#6b7280' }}>
                  週{DAYS[day]}
                </div>
                <div 
                  className="text-lg font-bold" 
                  style={{ color: count > 0 ? 'var(--sage)' : '#9ca3af' }}>
                  {count}
                </div>
                <div className="text-xs" style={{ color: '#6b7280' }}>
                  堂
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  )
}

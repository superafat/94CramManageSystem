'use client'

import { BackButton } from '@/components/ui/BackButton'

export default function MySchedulePage() {
  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <BackButton />
      
      <div>
        <h1 className="text-2xl font-bold text-text">我的課表</h1>
        <p className="text-text-muted mt-1">本週課程安排</p>
      </div>
      
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="grid grid-cols-5 gap-4">
          {['週一', '週二', '週三', '週四', '週五'].map((day, i) => (
            <div key={day} className="text-center">
              <p className="text-sm font-medium text-text-muted mb-3">{day}</p>
              {i === 1 || i === 4 ? (
                <div className="p-3 bg-primary/10 rounded-xl">
                  <p className="text-xs font-medium text-primary">數學</p>
                  <p className="text-xs text-text-muted mt-1">18:00-20:00</p>
                </div>
              ) : i === 2 ? (
                <div className="p-3 bg-morandi-sage/10 rounded-xl">
                  <p className="text-xs font-medium text-morandi-sage">英文</p>
                  <p className="text-xs text-text-muted mt-1">18:00-20:00</p>
                </div>
              ) : (
                <div className="p-3 bg-background rounded-xl">
                  <p className="text-xs text-text-muted">無課程</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-center text-sm text-text-muted">
        💡 這是學生專用頁面，只有學生角色可以看到
      </p>
    </div>
  )
}

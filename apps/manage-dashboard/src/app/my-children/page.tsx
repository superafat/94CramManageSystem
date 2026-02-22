'use client'

import { BackButton } from '@/components/ui/BackButton'

export default function MyChildrenPage() {
  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <BackButton />
      
      <div>
        <h1 className="text-2xl font-bold text-text">我的孩子</h1>
        <p className="text-text-muted mt-1">查看孩子的學習狀況</p>
      </div>
      
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            👦
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">陳小明</h2>
            <p className="text-sm text-text-muted">國中二年級 • 數學班</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-background rounded-xl">
            <p className="text-2xl font-bold text-primary">92%</p>
            <p className="text-xs text-text-muted mt-1">出席率</p>
          </div>
          <div className="text-center p-4 bg-background rounded-xl">
            <p className="text-2xl font-bold text-morandi-sage">85</p>
            <p className="text-xs text-text-muted mt-1">平均成績</p>
          </div>
          <div className="text-center p-4 bg-background rounded-xl">
            <p className="text-2xl font-bold text-morandi-gold">3</p>
            <p className="text-xs text-text-muted mt-1">待繳費項目</p>
          </div>
        </div>
      </div>
      
      <p className="text-center text-sm text-text-muted">
        💡 這是家長專用頁面，只有家長角色可以看到
      </p>
    </div>
  )
}

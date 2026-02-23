'use client'

import { useState } from 'react'
import { ragSearch, ingestKnowledge, type RAGSource } from '@/lib/api'
import { BackButton } from '@/components/ui/BackButton'

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<RAGSource[]>([])
  const [searching, setSearching] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const data = await ragSearch(searchQuery)
      setResults(data.sources ?? [])
      if ((data.sources ?? []).length === 0) setMessage('找不到相關資料')
      else setMessage('')
    } catch {
      setMessage('搜尋失敗')
    }
    setSearching(false)
  }

  const handleIngest = async () => {
    if (!newContent.trim()) return
    setIngesting(true)
    try {
      const res = await ingestKnowledge(newContent, newTitle || undefined)
      if (res.ok) {
        setMessage(`✅ 成功新增 ${res.stored} 筆知識！`)
        setNewTitle('')
        setNewContent('')
        setShowAdd(false)
      }
    } catch {
      setMessage('❌ 新增失敗')
    }
    setIngesting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <BackButton fallbackUrl="/dashboard" />
        <h1 className="text-xl font-bold text-text">知識庫管理</h1>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">管理 AI 客服能回答的內容</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          {showAdd ? '取消' : '+ 新增知識'}
        </button>
      </div>

      {/* Add Knowledge Panel */}
      {showAdd && (
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-medium text-text">新增知識文件</h3>
          <div>
            <label className="block text-sm text-text-muted mb-1">標題（選填）</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="例如：暑假班資訊"
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">內容</label>
            <textarea
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="輸入知識內容，AI 會自動學習..."
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <button
            onClick={handleIngest}
            disabled={ingesting || !newContent.trim()}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {ingesting ? '儲存中...' : '儲存'}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="🔍 搜尋知識庫... (例如：上課時間)"
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {searching ? '搜尋中...' : '搜尋'}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.startsWith('✅') ? 'text-morandi-sage' : message.startsWith('❌') ? 'text-morandi-rose' : 'text-text-muted'}`}>
          {message}
        </p>
      )}

      {/* Loading State */}
      {searching && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-20 bg-surface-hover rounded" />
                <div className="h-5 w-16 bg-surface-hover rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-surface-hover rounded" />
                <div className="h-3 w-4/5 bg-surface-hover rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State - No search yet */}
      {!searching && results.length === 0 && !message && (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-text mb-2">搜尋知識庫</h3>
          <p className="text-sm text-text-muted mb-4">輸入關鍵字，AI 會幫您找到相關資料</p>
          <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
            <span>🔍 語意搜尋</span>
            <span>•</span>
            <span>⚡ 毫秒回應</span>
            <span>•</span>
            <span>🧠 智慧理解</span>
          </div>
        </div>
      )}

      {/* Empty State - No results found */}
      {!searching && results.length === 0 && message === '找不到相關資料' && (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-text mb-2">找不到相關資料</h3>
          <p className="text-sm text-text-muted mb-4">試試其他關鍵字，或新增知識到資料庫</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover transition-colors"
          >
            + 新增知識
          </button>
        </div>
      )}

      {/* Error State */}
      {!searching && message === '搜尋失敗' && (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-medium text-text mb-2">搜尋失敗</h3>
          <p className="text-sm text-text-muted mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover transition-colors"
          >
            重試
          </button>
        </div>
      )}

      {/* Search Results */}
      {!searching && results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">搜尋結果（{results.length} 筆）</h3>
          {results.map((source, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-morandi-sage/20 text-morandi-sage">
                    {((source.metadata?.title as string) ?? '知識庫')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                    相似度 {(source.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-text leading-relaxed">{source.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold text-text">✨</p>
            <p className="text-xs text-text-muted">智慧搜尋</p>
            <p className="text-xs text-text-muted/70">AI 能理解問題含意</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-text">🧠</p>
            <p className="text-xs text-text-muted">蜂神榜 AI</p>
            <p className="text-xs text-text-muted/70">智慧理解文字語意</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-text">⚡</p>
            <p className="text-xs text-text-muted">快速比對</p>
            <p className="text-xs text-text-muted/70">毫秒內找到答案</p>
          </div>
        </div>
      </div>
    </div>
  )
}

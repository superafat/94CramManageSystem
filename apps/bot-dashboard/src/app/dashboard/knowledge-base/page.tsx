'use client'

import { useEffect, useState } from 'react'

type TabId = 'qa' | 'files' | 'crawl'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  keywords: string[]
  active: boolean
}

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState<TabId>('qa')

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">知識庫管理</h1>

      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 border border-border">
        {[
          { id: 'qa' as TabId, label: 'Q&A 管理', icon: '❓' },
          { id: 'files' as TabId, label: '檔案上傳', icon: '📄' },
          { id: 'crawl' as TabId, label: '網頁爬取', icon: '🌐' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'qa' && <QATab />}
      {tab === 'files' && <FilesTab />}
      {tab === 'crawl' && <CrawlTab />}
    </div>
  )
}

function QATab() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [keywords, setKeywords] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchEntries = () => {
    fetch('/api/knowledge-base?category=faq', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchEntries() }, [])

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await fetch('/api/knowledge-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        category: 'faq',
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      }),
    })
    setTitle(''); setContent(''); setKeywords(''); setShowForm(false); setSaving(false)
    fetchEntries()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除嗎？')) return
    await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE', credentials: 'include' })
    fetchEntries()
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-muted">共 {entries.length} 筆</p>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">
          {showForm ? '取消' : '+ 新增 Q&A'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="問題標題" className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="回答內容" rows={4} className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="關鍵字（逗號分隔）" className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={handleAdd} disabled={saving} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-surface rounded-2xl border border-border p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-text">{entry.title}</h3>
              <button onClick={() => handleDelete(entry.id)} className="text-xs text-danger hover:underline px-2">刪除</button>
            </div>
            <p className="text-sm text-text-muted mb-2">{entry.content}</p>
            {entry.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{kw}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {entries.length === 0 && <p className="text-center text-text-muted py-8">尚無 Q&A 資料</p>}
      </div>
    </div>
  )
}

function FilesTab() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-12 text-center">
      <p className="text-4xl mb-4">📄</p>
      <h3 className="text-lg font-semibold text-text mb-2">檔案上傳</h3>
      <p className="text-sm text-text-muted">Coming soon — 下一版本將支援 PDF、Word、圖片上傳與自動解析</p>
    </div>
  )
}

function CrawlTab() {
  const [url, setUrl] = useState('')
  const [crawling, setCrawling] = useState(false)
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/knowledge-base?category=general', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleCrawl = async () => {
    if (!url.trim()) return
    setCrawling(true)
    await fetch('/api/knowledge-base/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url: url.trim() }),
    })
    setUrl('')
    setCrawling(false)
    // Refresh after a delay
    setTimeout(() => {
      fetch('/api/knowledge-base?category=general', { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => setEntries(Array.isArray(data) ? data : []))
    }, 3000)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE', credentials: 'include' })
    setEntries(entries.filter((e) => e.id !== id))
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="flex-1 px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <button onClick={handleCrawl} disabled={crawling || !url.trim()} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
          {crawling ? '爬取中...' : '開始爬取'}
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-surface rounded-2xl border border-border p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-text">{entry.title}</p>
              <p className="text-xs text-text-muted mt-1">
                {entry.active ? '✅ 已爬取' : '⏳ 處理中'}
                {entry.content && ` · ${entry.content.length} 字`}
              </p>
            </div>
            <button onClick={() => handleDelete(entry.id)} className="text-xs text-danger hover:underline px-2">刪除</button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-center text-text-muted py-8">尚無爬取資料</p>}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

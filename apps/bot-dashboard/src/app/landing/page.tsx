'use client'

import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-surface/90 backdrop-blur border-b border-border z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-bold text-text">94BOT</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/demo')} className="px-4 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors">
              免費體驗
            </button>
            <button onClick={() => router.push('/login')} className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
              登入
            </button>
          </div>
        </div>
      </header>

      <section className="py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="text-5xl mb-4 animate-bounce">🤖</div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3 leading-tight">聞太師 AI 家長助手</h1>
          <p className="text-lg text-text font-medium mb-3">補習班專屬 LINE Bot 管理平台</p>
          <p className="text-sm text-text-muted mb-8 max-w-2xl mx-auto">
            AI 自動回覆家長問題 · 出勤成績即時查詢 · LINE 推播通知 · 家長綁定管理<br/>
            讓家長隨時掌握孩子學習狀況，提升滿意度
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => router.push('/demo')} className="px-6 py-2.5 text-base bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary-hover transition-all">
              免費體驗 Demo →
            </button>
            <button onClick={() => router.push('/login')} className="px-6 py-2.5 text-base bg-white text-primary border-2 border-primary rounded-lg font-bold hover:bg-primary/5 transition-all">
              登入管理後台
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl text-primary text-center mb-8 font-bold">🌟 聞太師能做什麼？</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard emoji="💬" title="AI 自動回覆" desc="家長用 LINE 詢問出勤、成績、課表，聞太師 AI 即時回覆，24 小時不休息。" />
            <FeatureCard emoji="📊" title="成績查詢" desc="家長直接在 LINE 查詢孩子考試成績、排名、進步趨勢，不用打電話問。" />
            <FeatureCard emoji="📋" title="出勤通知" desc="孩子到班、遲到、缺席，自動推送 LINE 通知給家長，即時掌握。" />
            <FeatureCard emoji="🔗" title="簡單綁定" desc="家長掃 QR Code 或輸入邀請碼即可綁定，一個帳號可綁定多位孩子。" />
            <FeatureCard emoji="📤" title="LINE Push 推播" desc="班級公告、活動通知、繳費提醒，一鍵推送給所有家長或指定群組。" />
            <FeatureCard emoji="🛡️" title="資料安全" desc="每間補習班資料完全隔離，符合個資法規範。管理者可隨時查看對話紀錄。" />
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl text-primary text-center mb-2 font-bold">💰 簡單透明的價格</h2>
          <p className="text-sm text-text-muted text-center mb-8">年繳更優惠，最高省 17%</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <PricingCard name="體驗版" price="299" ai={100} push={50} desc="適合剛開始使用" />
            <PricingCard name="標準版" price="599" ai={500} push={200} desc="最受歡迎" highlighted />
            <PricingCard name="專業版" price="999" ai={2000} push={1000} desc="中型補習班" />
            <PricingCard name="旗艦版" price="1,899" ai={5000} push={3000} desc="大型連鎖" />
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">需要更大額度？<span className="text-primary ml-1">聯繫我們取得企業版報價</span></p>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl text-primary mb-4 font-bold">🔗 與蜂神榜生態系完美整合</h2>
          <p className="text-sm text-text-muted mb-8 max-w-2xl mx-auto">
            94BOT 的聞太師 AI 自動從 94inClass 點名系統與 94Manage 管理系統取得資料，<br/>
            家長查詢時即時回覆，無需人工介入。
          </p>
          <div className="flex gap-4 justify-center flex-wrap items-center">
            <div className="bg-white rounded-2xl p-5 border border-border w-48">
              <p className="text-2xl mb-2">🐝</p>
              <p className="font-semibold text-sm text-text">94inClass</p>
              <p className="text-xs text-text-muted">點名 · 成績 · 出勤</p>
            </div>
            <span className="text-2xl text-primary">→</span>
            <div className="bg-white rounded-2xl p-5 border-2 border-primary w-48">
              <p className="text-2xl mb-2">🤖</p>
              <p className="font-semibold text-sm text-primary">94BOT 聞太師</p>
              <p className="text-xs text-text-muted">AI 回覆 · LINE 推播</p>
            </div>
            <span className="text-2xl text-primary">→</span>
            <div className="bg-white rounded-2xl p-5 border border-border w-48">
              <p className="text-2xl mb-2">👨‍👩‍👧</p>
              <p className="font-semibold text-sm text-text">家長 LINE</p>
              <p className="text-xs text-text-muted">查詢 · 通知 · 請假</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-text mb-4">立即體驗聞太師 AI 助手</h2>
          <p className="text-text-muted mb-8">免費 Demo 體驗，感受 AI 自動回覆的效率</p>
          <button onClick={() => router.push('/demo')} className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-hover transition-all shadow-lg">
            免費體驗 →
          </button>
        </div>
      </section>

      <footer className="py-8 px-4 bg-surface border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-text-muted">© 2026 蜂神榜 Ai 教育科技 | 94BOT LINE Bot 管理平台</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-background rounded-2xl p-5 border border-border hover:border-primary/30 transition-colors">
      <span className="text-2xl">{emoji}</span>
      <h3 className="font-semibold text-text mt-2 mb-1">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
    </div>
  )
}

function PricingCard({ name, price, ai, push, desc, highlighted }: {
  name: string; price: string; ai: number; push: number; desc: string; highlighted?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border-2 transition-all ${highlighted ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-surface'}`}>
      {highlighted && <span className="inline-block px-2 py-0.5 text-xs bg-primary text-white rounded-full mb-2">推薦</span>}
      <h3 className="font-semibold text-text">{name}</h3>
      <p className="text-xs text-text-muted mb-2">{desc}</p>
      <p className="text-2xl font-bold text-text mb-3">NT${price} <span className="text-xs font-normal text-text-muted">/ 月</span></p>
      <div className="space-y-1.5 text-sm text-text-muted">
        <p>AI 回覆 {ai.toLocaleString()} 則/月</p>
        <p>LINE Push {push.toLocaleString()} 則/月</p>
      </div>
    </div>
  )
}

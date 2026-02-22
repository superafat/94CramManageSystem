'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-morandi-cream to-morandi-fog">
      {/* Hero Section */}
      <section className="px-5 py-10 text-center max-w-6xl mx-auto">
        <div className="text-5xl mb-3 animate-bounce">🐝</div>
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3 leading-tight">
          蜂神榜 Ai 補習班管理系統
        </h1>
        <p className="text-lg text-text font-medium mb-3">
          補習班管理系統
        </p>
        <p className="text-sm text-text-muted mb-6 max-w-3xl mx-auto">
          出勤管理 · 成績追蹤 · 帳務管理 · 薪資計算 · AI 分析<br/>
          一站式解決補習班營運難題 ✨
        </p>
        
        <div className="flex gap-3 justify-center mb-5 flex-wrap">
          <button 
            onClick={() => router.push('/trial-signup')}
            className="px-6 py-2.5 text-base bg-primary text-white border-none rounded-lg font-bold cursor-pointer shadow-md hover:bg-primary-hover transition-all"
          >
            🚀 免費試用 30 天
          </button>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 text-base bg-white text-primary border-2 border-primary rounded-lg font-bold cursor-pointer hover:bg-surface-hover transition-all"
          >
            🔑 登入系統
          </button>
          <button 
            onClick={() => router.push('/demo')}
            className="px-6 py-2.5 text-base bg-amber-100 text-amber-700 border-2 border-amber-300 rounded-lg font-bold cursor-pointer hover:bg-amber-200 transition-all"
          >
            🎬 體驗 Demo
          </button>
        </div>

        <p className="text-sm text-text-muted">
          ⭐⭐⭐⭐⭐ 已有 300+ 補習班信賴使用
        </p>
      </section>

      {/* Features */}
      <section className="py-10 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl text-center text-primary mb-8 font-bold">
            ✨ 核心功能
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard 
              emoji="📋"
              title="出勤管理"
              desc="整合點名資料，自動彙整出勤記錄。遲到、缺席一目瞭然，家長端同步推送。"
            />
            <FeatureCard 
              emoji="📊"
              title="成績管理"
              desc="輸入考試成績，自動生成成績單。班級排名、進步追蹤、學期報表一鍵產出。"
            />
            <FeatureCard 
              emoji="💰"
              title="帳務管理"
              desc="學費帳單自動開立，繳費狀態追蹤。支援分期付款、減免設定，帳務清晰透明。"
            />
            <FeatureCard 
              emoji="👨‍🏫"
              title="薪資計算"
              desc="教師鐘點自動計算，加班、代課一併納入。薪資條一鍵生成，勞健保試算整合。"
            />
            <FeatureCard 
              emoji="🤖"
              title="AI 分析"
              desc="AI 流失預警，提前發現可能退班的學生。招生 CRM + RAG 知識庫，智慧營運決策。"
              note="🤔 CRM=客戶關係管理（記錄家長、學生資料）、RAG=AI 大腦（能回答補習班相關問題）"
            />
            <FeatureCard 
              emoji="☁️"
              title="雲端系統"
              desc="資料安全儲存於雲端，自動備份。手機、平板、電腦隨時存取，多分校同步。"
            />
          </div>
        </div>
      </section>

      {/* Integration with 点名系统 */}
      <section className="py-10 px-5 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl text-primary mb-6 font-bold">
            🔗 與 蜂神榜 Ai 補習班點名系統 完美整合
          </h2>
          <p className="text-base text-text-muted mb-6 max-w-3xl mx-auto">
            蜂神榜 Ai 補習班管理系統 專注於<strong className="text-text">營運後台</strong>（財務、成績、薪資），<br/>
            蜂神榜 Ai 補習班點名系統 負責<strong className="text-text">教學前線</strong>（NFC 點名、臉部辨識）。<br/>
            兩個系統<strong className="text-primary">無縫整合</strong>，資料自動同步。
          </p>
          
          <div className="flex gap-8 justify-center flex-wrap items-center">
            <IntegrationCard 
              title="蜂神榜 Ai 點名系統 🐝"
              subtitle="教學前線"
              items={['NFC 點名（刷卡打卡）, NFC=感應卡片', 'AI 臉部辨識（刷臉上课）, 不用帶卡也能簽到', '即時 LINE 通知', '出勤報表']}
              color="#9DAEBB"
            />
            <div className="text-4xl text-primary animate-pulse">
              ↔️
            </div>
            <IntegrationCard 
              title="蜂神榜 Ai 管理系統 📊"
              subtitle="營運後台"
              items={['帳務管理', '成績管理', '薪資計算', 'AI 分析']}
              color="#A8B5A2"
            />
          </div>

          <div className="mt-10 p-6 bg-white/80 rounded-2xl border border-amber-200 max-w-2xl mx-auto">
            <p className="text-base text-text mb-2">
              <strong>✨ 整合優勢</strong>
            </p>
            <ul className="text-sm text-text-muted text-left max-w-md mx-auto">
              <li className="mb-1">✓ 學生點名 → 自動同步到管理系統出勤記錄</li>
              <li className="mb-1">✓ 出勤資料 → 自動計算教師鐘點薪資</li>
              <li className="mb-1">✓ 異常出勤 → AI 流失預警自動觸發</li>
              <li>✓ 統一帳號 → 一組帳密登入兩個系統</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-10 px-5 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl text-primary mb-8 font-bold">
            💰 簡單透明的價格
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard 
              name="基礎版"
              price="999"
              yearPrice="11,988"
              features={['最多 100 位學生', '出勤管理', '成績管理', '基本報表', 'Email 支援']}
              desc="適合小型補習班"
            />
            <PricingCard 
              name="專業版"
              price="1,499"
              yearPrice="17,988"
              features={['最多 300 位學生', '帳務管理', '薪資計算', '進階報表', '優先支援']}
              highlighted={true}
              desc="點名系統整合"
            />
            <PricingCard 
              name="AI 版"
              price="2,499"
              yearPrice="29,988"
              features={['無限學生', 'AI 流失預警', 'RAG 知識庫（AI 客服）', '多分校管理', '專屬客服']}
              desc="完整 AI 功能｜RAG = AI 自動回答家長問題"
            />
          </div>

          {/* 競品對照表 */}
          <div className="mt-10 max-w-4xl mx-auto">
            <h3 className="text-xl text-primary mb-5 font-bold text-center">📊 方案比較</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-surface rounded-xl border border-border shadow-sm text-sm">
                <thead>
                  <tr className="bg-morandi-fog">
                    <th className="p-2 text-left text-primary font-bold text-xs">功能項目</th>
                    <th className="p-2 text-center text-text-muted font-bold text-xs">業界方案 A</th>
                    <th className="p-2 text-center text-text-muted font-bold text-xs">業界方案 B</th>
                    <th className="p-2 text-center text-primary font-bold bg-primary/10 text-xs">蜂神榜 AI 版</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">年費</td>
                    <td className="p-2 text-center text-text-muted line-through text-xs">~$34,000</td>
                    <td className="p-2 text-center text-text text-xs">~$17,600</td>
                    <td className="p-2 text-center text-primary font-bold bg-primary/5 text-xs">$29,988</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">學生人數</td>
                    <td className="p-2 text-center text-text-muted text-xs">無限</td>
                    <td className="p-2 text-center text-text text-xs">有限制</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">無限</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">出勤管理</td>
                    <td className="p-2 text-center text-success text-xs">✓</td>
                    <td className="p-2 text-center text-success text-xs">✓</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">成績管理</td>
                    <td className="p-2 text-center text-success text-xs">✓</td>
                    <td className="p-2 text-center text-success text-xs">✓</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">帳務管理</td>
                    <td className="p-2 text-center text-success text-xs">✓</td>
                    <td className="p-2 text-center text-text-muted text-xs">基本</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">薪資計算</td>
                    <td className="p-2 text-center text-success text-xs">✓</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">AI 流失預警</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">RAG 知識庫</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">LINE 整合</td>
                    <td className="p-2 text-center text-text-muted text-xs">選配</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-2 text-text font-medium text-xs">點名系統整合</td>
                    <td className="p-2 text-center text-text-muted text-xs">需加購</td>
                    <td className="p-2 text-center text-text-muted text-xs">—</td>
                    <td className="p-2 text-center text-success bg-primary/5 text-xs">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-text-muted text-center">
              * 業界方案資料來源：公開官網資訊（2026 年 2 月）
            </p>
          </div>

          <p className="mt-8 text-base text-text-muted">
            ✅ 30 天免費試用 · 不滿意全额退費 · 隨時取消訂閱
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-5 bg-primary text-white text-center">
        <h2 className="text-2xl mb-3 font-bold">
          準備好升級你的補習班了嗎？
        </h2>
        <p className="text-base mb-6 opacity-90">
          立即免費試用，30 天內感受蜂神榜的強大功能
        </p>
        <button 
          onClick={() => router.push('/trial-signup')}
          className="px-8 py-3 text-base bg-white text-primary border-none rounded-lg font-bold cursor-pointer shadow-lg hover:shadow-xl transition-all"
        >
          🚀 立即開始免費試用
        </button>
      </section>

      {/* Footer */}
      <footer className="py-10 px-5 bg-morandi-dark text-white text-center">
        <p className="mb-2">© 2026 蜂神榜 Ai 補習班管理系統. All rights reserved.</p>
        <p className="text-sm opacity-80">
          <a href="/guide" className="text-white underline">使用說明</a>
          <span className="mx-3">·</span>
          <a href="mailto:superafat0922@gmail.com" className="text-white underline">聯絡我們</a>
        </p>
      </footer>
    </div>
  )
}

function FeatureCard({ emoji, title, desc, note }: { emoji: string; title: string; desc: string; note?: string }) {
  return (
    <div className="bg-surface p-4 rounded-xl border border-border text-center hover:shadow-md transition-shadow">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="text-base font-bold text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted leading-tight">{desc}</p>
      {note && <p className="text-xs text-amber-600 mt-2 italic">{note}</p>}
    </div>
  )
}

function IntegrationCard({ title, subtitle, items, color }: { title: string; subtitle: string; items: string[]; color: string }) {
  return (
    <div 
      className="bg-white p-8 rounded-2xl min-w-[250px] shadow-md"
      style={{ border: `2px solid ${color}` }}
    >
      <h3 className="text-2xl font-bold mb-2" style={{ color }}>{title}</h3>
      <p className="text-sm text-text-muted mb-5">{subtitle}</p>
      <ul className="list-none p-0 text-left">
        {items.map((item, i) => (
          <li 
            key={i} 
            className="py-2 text-text"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none' }}
          >
            ✓ {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PricingCard({ name, price, yearPrice, features, highlighted, desc }: { name: string; price: string; yearPrice: string; features: string[]; highlighted?: boolean; desc: string }) {
  return (
    <div 
      className={`p-5 rounded-xl relative ${
        highlighted 
          ? 'bg-gradient-to-br from-morandi-blue to-morandi-sage border-2 border-primary shadow-md' 
          : 'bg-surface border border-border shadow-sm'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold">
          🌟 最受歡迎
        </div>
      )}
      <h3 className={`text-lg font-bold mb-1 ${highlighted ? 'text-white' : 'text-primary'}`}>{name}</h3>
      <p className={`text-xs mb-2 ${highlighted ? 'text-white/80' : 'text-text-muted'}`}>{desc}</p>
      <div className={`text-3xl font-bold mb-1 ${highlighted ? 'text-white' : 'text-primary'}`}>
        NT$ {price}
      </div>
      <p className={`text-xs mb-3 ${highlighted ? 'text-white/80' : 'text-text-muted'}`}>/ 月</p>
      <ul className="list-none p-0 mb-3">
        {features.map((f, i) => (
          <li 
            key={i} 
            className={`py-1.5 text-xs text-left ${highlighted ? 'text-white' : 'text-text'}`}
          >
            ✓ {f}
          </li>
        ))}
      </ul>
      <button 
        onClick={() => window.location.href = '/trial-signup'}
        className={`w-full py-3 text-base border-none rounded-lg font-bold cursor-pointer transition-all duration-200 ${
          highlighted 
            ? 'bg-white text-primary hover:bg-gray-100' 
            : 'bg-primary text-white hover:bg-primary-hover'
        }`}
      >
        立即開始
      </button>
    </div>
  )
}

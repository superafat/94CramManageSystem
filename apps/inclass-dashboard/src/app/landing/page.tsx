'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function LandingPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #E8F4F8 0%, #D4E8F0 100%)' }}>
      {/* Hero Section */}
      <section style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }} className="animate-float">🐝</div>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '20px', lineHeight: 1.2 }}>
          蜂神榜 Ai 點名系統
        </h1>
        <p style={{ fontSize: '28px', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: '500' }}>
          AI 驅動的補習班管理系統
        </p>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
          讓點名像刷悠遊卡一樣簡單 ✨<br/>
          NFC 點名 + AI 臉辨 + LINE 通知 = 補習班數位化管理
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/register')}
            style={{ padding: '16px 40px', fontSize: '18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'var(--shadow-lg)' }}
          >
            🚀 免費試用 30 天
          </button>
          <button 
            onClick={() => router.push('/login')}
            style={{ padding: '16px 40px', fontSize: '18px', background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🔑 登入
          </button>
        </div>

        <DemoButton />

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '20px' }}>
          ⭐⭐⭐⭐⭐ 已有 500+ 補習班使用
        </p>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', textAlign: 'center', color: 'var(--primary)', marginBottom: '60px', fontWeight: 'bold' }}>
            ✨ 為什麼選擇 蜂神榜 Ai 點名系統？
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
            <FeatureCard 
              emoji="⚡"
              title="NFC 點名 - 1 秒完成"
              desc="學生刷卡即完成點名，就像搭捷運刷悠遊卡一樣快速。自動記錄時間，自動通知家長。"
            />
            <FeatureCard 
              emoji="🤖"
              title="AI 臉部辨識"
              desc="蜂神榜獨家視覺辨識系統，免購買硬體。拍照即可點名，防止代簽，提升管理效率。"
            />
            <FeatureCard 
              emoji="📱"
              title="LINE 家長通知"
              desc="學生到校/遲到/缺席，家長即時收到 LINE 通知。提升家長滿意度，減少客訴。"
            />
            <FeatureCard 
              emoji="☁️"
              title="雲端部署"
              desc="資料儲存在雲端，自動備份，隨時隨地查看。手機、平板、電腦都能用。"
            />
            <FeatureCard 
              emoji="💰"
              title="月訂閱制"
              desc="不用買硬體，不用裝軟體。月付 NT$990 起，30 天免費試用，不滿意全額退費。"
            />
            <FeatureCard 
              emoji="🔒"
              title="資料隔離"
              desc="每個補習班資料完全獨立，符合個資法規範。多租戶架構，安全可靠。"
            />
          </div>
        </div>
      </section>

      {/* Integration */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #FFF4E6 0%, #FFE8CC 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', color: 'var(--primary)', marginBottom: '30px', fontWeight: 'bold' }}>
            🔗 與 蜂神榜 Ai 管理系統 完美整合
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
            蜂神榜 Ai 點名系統 專注於<strong>教學前線</strong>（點名、成績），<br/>
            蜂神榜 Ai 管理系統 負責<strong>營運後台</strong>（財務、排課、AI 分析）。<br/>
            兩個系統可以<strong>獨立使用</strong>，也可以<strong>整合使用</strong>。
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <IntegrationCard 
              title="蜂神榜 Ai 點名系統 🐝"
              subtitle="教學前線"
              items={['NFC 點名', '臉部辨識', '成績輸入', '出勤報表']}
              color="#8FA9B8"
            />
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '40px', color: 'var(--primary)' }}>
              ↔️
            </div>
            <IntegrationCard 
              title="蜂神榜 Ai 管理系統 📊"
              subtitle="營運後台"
              items={['財務管理', '排課系統', '薪資計算', 'AI 分析']}
              color="#A8C5AF"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', color: 'var(--primary)', marginBottom: '60px', fontWeight: 'bold' }}>
            💰 簡單透明的價格
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '900px', margin: '0 auto' }}>
            <PricingCard 
              name="基礎版"
              price="990"
              features={['最多 50 位學生', 'NFC 點名', 'LINE 通知', '基本報表', 'Email 支援']}
            />
            <PricingCard 
              name="專業版"
              price="1,990"
              features={['最多 200 位學生', 'NFC + AI 臉辨', 'LINE 通知', '進階報表', '優先支援']}
              highlighted={true}
            />
            <PricingCard 
              name="企業版"
              price="洽詢"
              features={['無限學生', '客製化功能', 'API 整合', '專屬客服', 'SLA 保證']}
            />
          </div>

          <p style={{ marginTop: '40px', fontSize: '16px', color: 'var(--text-secondary)' }}>
            ✅ 30 天免費試用 · 不滿意全額退費 · 隨時取消訂閱
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', textAlign: 'center', color: 'var(--primary)', marginBottom: '20px', fontWeight: 'bold' }}>
            🏆 為什麼選擇蜂神榜？
          </h2>
          <p style={{ textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '60px', maxWidth: '800px', margin: '0 auto 60px' }}>
            市面上補習班管理系統很多，但蜂神榜有這些獨特優勢
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <ComparisonCard 
              title="❌ 傳統系統"
              items={[
                '需購買專用硬體（5-10 萬）',
                '安裝複雜，維護困難',
                '綁約 2-3 年',
                '升級需額外付費',
                '只能在特定電腦使用'
              ]}
              negative={true}
            />
            <ComparisonCard 
              title="✅ 蜂神榜 Ai 點名系統"
              items={[
                '免硬體費用，月付即用',
                '雲端部署，開箱即用',
                '隨時取消，無綁約',
                '免費自動升級',
                '手機/平板/電腦都能用'
              ]}
              highlighted={true}
            />
          </div>

          <div style={{ marginTop: '60px', background: 'linear-gradient(135deg, #E8F4F8 0%, #D4E8F0 100%)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '30px', fontWeight: 'bold' }}>
              💡 蜂神榜獨家優勢
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', textAlign: 'left' }}>
              <AdvantageItem 
                icon="🚀"
                title="極速部署"
                desc="註冊後 5 分鐘內開始使用，不用等工程師安裝"
              />
              <AdvantageItem 
                icon="💰"
                title="成本透明"
                desc="月付 NT$990 起，沒有隱藏費用，免綁約"
              />
              <AdvantageItem 
                icon="🤖"
                title="AI 驅動"
                desc="臉部辨識點名，不用買硬體，用手機就能刷臉"
              />
              <AdvantageItem 
                icon="📱"
                title="LINE 整合"
                desc="家長即時收到通知，提升滿意度 90%"
              />
              <AdvantageItem 
                icon="🔄"
                title="持續進化"
                desc="每月新功能，免費自動升級"
              />
              <AdvantageItem 
                icon="🛡️"
                title="資料安全"
                desc="雲端備份，符合個資法，絕不遺失"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 20px', background: '#F5F5F5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', textAlign: 'center', color: 'var(--primary)', marginBottom: '60px', fontWeight: 'bold' }}>
            ❓ 常見問題
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FAQItem 
              q="蜂神榜和傳統補習班管理系統有什麼不同？"
              a="傳統系統需要購買硬體（5-10 萬）並綁約 2-3 年，蜂神榜是雲端訂閱制，月付 NT$990 起，免硬體、免綁約、隨時取消。而且支援手機、平板、電腦多平台使用，不受限於特定電腦。"
            />
            <FAQItem 
              q="不會用電腦也能使用嗎？"
              a="可以！蜂神榜介面設計簡單直覺，就像使用 LINE 一樣容易。我們提供完整的線上教學影片和客服支援，30 分鐘內就能上手。"
            />
            <FAQItem 
              q="臉部辨識點名準確嗎？需要買什麼設備？"
              a="蜂神榜使用先進的視覺辨識技術，準確率達 98% 以上。最棒的是不需要購買任何硬體！用手機或平板的鏡頭就能刷臉點名，省下 5-10 萬的硬體成本。"
            />
            <FAQItem 
              q="資料會不會遺失？安全嗎？"
              a="蜂神榜採用雲端多重備份機制，資料絕不遺失。我們符合個資法規範，每個補習班的資料完全隔離加密，比本地電腦更安全。"
            />
            <FAQItem 
              q="可以試用嗎？不滿意怎麼辦？"
              a="提供 30 天免費試用，功能完全開放。試用期間不滿意可以隨時取消，不收任何費用。正式訂閱後如果不滿意，7 天內全額退費。"
            />
            <FAQItem 
              q="LINE 通知需要額外付費嗎？"
              a="LINE 通知功能完全免費包含在訂閱方案中。LINE Messaging API 每月有 200 則免費額度，一般補習班綽綽有餘。超過額度後每則約 NT$0.3，成本極低。"
            />
            <FAQItem 
              q="可以管理多個補習班嗎？"
              a="可以！企業版支援多校區管理，每個校區資料獨立，但可以統一查看報表。適合連鎖補習班使用。"
            />
            <FAQItem 
              q="有客服支援嗎？"
              a="有！基礎版提供 Email 支援（24 小時內回覆），專業版和企業版提供優先客服和專屬服務。"
            />
            <FAQItem 
              q="和其他雲端系統比起來如何？"
              a="蜂神榜最大優勢是「免硬體 AI 臉辨」和「極低月費」。市面上許多系統需要購買硬體或月費較高，而且很多功能需要加購。蜂神榜一個價格包含所有核心功能，透明無隱藏費用。"
            />
            <FAQItem 
              q="NFC 卡片在哪裡買？"
              a="蜂神榜提供專門開發的專用 NFC 卡片，每張 NT$200-500（含設定）。也可自行購買 MIFARE 相容卡片，我們協助設定。"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 20px', background: 'var(--primary)', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '20px', fontWeight: 'bold' }}>
          準備好升級你的補習班了嗎？
        </h2>
        <p style={{ fontSize: '18px', marginBottom: '40px', opacity: 0.9 }}>
          立即免費試用，30 天內感受 蜂神榜 Ai 點名系統 的強大功能
        </p>
        <button 
          onClick={() => router.push('/register')}
          style={{ padding: '16px 50px', fontSize: '20px', background: 'white', color: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}
        >
          🚀 立即開始免費試用
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 20px', background: '#2A3F4F', color: 'white', textAlign: 'center' }}>
        <p style={{ marginBottom: '10px' }}>© 2026 蜂神榜 Ai 點名系統. All rights reserved.</p>
        <p style={{ fontSize: '14px', opacity: 0.8 }}>
          <a href="mailto:superafatus@gmail.com" style={{ color: 'white', textDecoration: 'underline' }}>聯絡我們</a>
        </p>
      </footer>
    </div>
  )
}

function DemoButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { demoLogin } = useAuth()

  const handleDemo = async () => {
    setLoading(true)
    setError('')
    try {
      await demoLogin()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Demo 登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button
        onClick={handleDemo}
        disabled={loading}
        style={{
          padding: '14px 40px', fontSize: '16px',
          background: 'linear-gradient(135deg, #FFB347 0%, #FF6B6B 100%)',
          color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
          fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        {loading ? '載入中...' : '👀 先逛逛 Demo（免註冊）'}
      </button>
      {error && <p style={{ color: '#E53E3E', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
    </div>
  )
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{emoji}</div>
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

function IntegrationCard({ title, subtitle, items, color }: { title: string; subtitle: string; items: string[]; color: string }) {
  return (
    <div style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius-lg)', minWidth: '250px', border: `2px solid ${color}`, boxShadow: 'var(--shadow-md)' }}>
      <h3 style={{ fontSize: '24px', fontWeight: 'bold', color, marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{subtitle}</p>
      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
        {items.map((item, i) => (
          <li key={i} style={{ padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-primary)' }}>
            ✓ {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PricingCard({ name, price, features, highlighted }: { name: string; price: string; features: string[]; highlighted?: boolean }) {
  return (
    <div style={{ 
      background: highlighted ? 'linear-gradient(135deg, #8FA9B8 0%, #A8DADC 100%)' : 'var(--surface)', 
      padding: '40px 30px', 
      borderRadius: 'var(--radius-lg)', 
      border: highlighted ? '3px solid var(--primary)' : '1px solid var(--border)',
      boxShadow: highlighted ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      position: 'relative',
      transform: highlighted ? 'scale(1.05)' : 'scale(1)'
    }}>
      {highlighted && (
        <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          🌟 最受歡迎
        </div>
      )}
      <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: highlighted ? 'white' : 'var(--primary)', marginBottom: '16px' }}>{name}</h3>
      <div style={{ fontSize: '40px', fontWeight: 'bold', color: highlighted ? 'white' : 'var(--primary)', marginBottom: '8px' }}>
        {price === '洽詢' ? price : `NT$ ${price}`}
      </div>
      {price !== '洽詢' && <p style={{ fontSize: '14px', color: highlighted ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', marginBottom: '24px' }}>/ 月</p>}
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
        {features.map((f, i) => (
          <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid ' + (highlighted ? 'rgba(255,255,255,0.2)' : 'var(--border)'), color: highlighted ? 'white' : 'var(--text-primary)', textAlign: 'left' }}>
            ✓ {f}
          </li>
        ))}
      </ul>
      <button 
        onClick={() => { window.location.href = '/register' }}
        style={{ width: '100%', padding: '12px', fontSize: '16px', background: highlighted ? 'white' : 'var(--primary)', color: highlighted ? 'var(--primary)' : 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' }}
      >
        立即開始
      </button>
    </div>
  )
}

function ComparisonCard({ title, items, negative, highlighted }: { title: string; items: string[]; negative?: boolean; highlighted?: boolean }) {
  return (
    <div style={{ 
      background: highlighted ? 'linear-gradient(135deg, #8FA9B8 0%, #A8DADC 100%)' : negative ? '#FFF5F5' : 'white',
      padding: '30px',
      borderRadius: 'var(--radius-lg)',
      border: highlighted ? '3px solid var(--primary)' : negative ? '2px solid #FFC9C9' : '1px solid var(--border)',
      boxShadow: highlighted ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      position: 'relative'
    }}>
      {highlighted && (
        <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          🌟 推薦選擇
        </div>
      )}
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: highlighted ? 'white' : negative ? '#C53030' : 'var(--primary)', marginBottom: '20px', textAlign: 'center' }}>
        {title}
      </h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ padding: '12px 0', borderBottom: i < items.length - 1 ? '1px solid ' + (highlighted ? 'rgba(255,255,255,0.3)' : negative ? '#FFC9C9' : 'var(--border)') : 'none', color: highlighted ? 'white' : 'var(--text-primary)', fontSize: '14px' }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AdvantageItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>{title}</h4>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ minWidth: '24px' }}>Q:</span>
        <span>{q}</span>
      </h3>
      <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.7, paddingLeft: '32px' }}>
        <strong style={{ color: 'var(--accent)' }}>A:</strong> {a}
      </p>
    </div>
  )
}

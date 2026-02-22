'use client'

import { useRouter } from 'next/navigation'

export default function GuidePage() {
  const router = useRouter()

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => router.push('/main')}
          style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px', cursor: 'pointer' }}
        >
          ← 返回首頁
        </button>
        <h1 style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '10px' }}>📚 蜂神榜 Ai 點名系統 使用說明</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>完整功能教學，5 分鐘快速上手</p>
      </div>

      {/* Quick Start */}
      <Section emoji="🚀" title="快速開始">
        <Step number="1" title="NFC 點名">
          <p>在首頁的「NFC 刷卡點名」區塊輸入卡號，按 Enter 或點擊「點名」即可。</p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>💡 系統會自動記錄時間並發送 LINE 通知給家長（需設定）</p>
        </Step>
        
        <Step number="2" title="查看儀表板">
          <p>點擊底部工具列的「📊 儀表板」查看即時統計。</p>
        </Step>
        
        <Step number="3" title="匯出報表">
          <p>前往「出勤報表」頁面，選擇月份後點擊「📥 匯出 CSV」。</p>
        </Step>
      </Section>

      {/* Features */}
      <Section emoji="🎒" title="功能說明">
        <FeatureBox 
          icon="👥"
          title="學生管理"
          items={[
            '新增學生：點擊「➕」按鈕，填寫姓名、年級、NFC 卡號',
            '查看學生：在首頁學生名單查看所有學生資料',
            '刪除學生：點擊學生旁的「🗑️」圖示'
          ]}
        />

        <FeatureBox 
          icon="📍"
          title="點名系統"
          items={[
            'NFC 點名：輸入卡號自動點名',
            '臉部辨識：點擊「📸 刷臉」拍照點名（開發中）',
            '自動判定：正常/遲到/缺席'
          ]}
        />

        <FeatureBox 
          icon="📊"
          title="數據儀表板"
          items={[
            '即時統計：總學生數、出勤率、新增學生',
            '快速查看：今日到校人數、遲到、缺席',
            '營收統計：本月營收概覽'
          ]}
        />

        <FeatureBox 
          icon="📈"
          title="出勤報表"
          items={[
            '月報表：選擇月份查看完整出勤數據',
            '學生排行：出勤率排名',
            'CSV 匯出：下載報表用 Excel 開啟'
          ]}
        />
      </Section>

      {/* Integration */}
      <Section emoji="🔗" title="系統整合說明">
        <div style={{ background: 'linear-gradient(135deg, #FFF4E6 0%, #FFE8CC 100%)', padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>
            蜂神榜 Ai 點名系統 🐝 + 蜂神榜 Ai 管理系統 📊 = 完整解決方案
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '16px', color: 'var(--primary)', marginBottom: '8px', fontWeight: 'bold' }}>
              蜂神榜 Ai 點名系統（教學前線）
            </h4>
            <ul style={{ marginLeft: '20px', color: 'var(--text-primary)' }}>
              <li>NFC 點名 + 臉部辨識</li>
              <li>成績輸入</li>
              <li>教室即時狀態</li>
              <li>出勤報表</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '16px', color: 'var(--accent)', marginBottom: '8px', fontWeight: 'bold' }}>
              蜂神榜 Ai 管理系統（營運後台）
            </h4>
            <ul style={{ marginLeft: '20px', color: 'var(--text-primary)' }}>
              <li>財務管理 + 帳單開立</li>
              <li>排課系統 + 薪資計算</li>
              <li>AI 流失預警</li>
              <li>招生 CRM + RAG 知識庫</li>
            </ul>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-md)', border: '1px solid #FFDD99' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              <strong>✨ 整合方式</strong>
            </p>
            <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '20px' }}>
              <li>學生點名 → 自動通知 蜂神榜 Ai 管理系統 → LINE 發送給家長</li>
              <li>學生資料同步（未來功能）</li>
              <li>成績資料整合（未來功能）</li>
            </ul>
          </div>

          <a 
            href="https://hivemind-dashboard-855393865280.asia-east1.run.app" 
            target="_blank" 
            rel="noopener"
            style={{ display: 'inline-block', marginTop: '16px', padding: '10px 20px', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontWeight: 'bold' }}
          >
            🔗 前往 蜂神榜 Ai 管理系統
          </a>
        </div>
      </Section>

      {/* FAQ */}
      <Section emoji="❓" title="常見問題">
        <FAQ 
          q="如何設定 LINE 通知？"
          a="需要有 LINE Bot，取得 Channel Access Token 後在「學校設定」填入。家長掃描 QR Code 綁定即可。"
        />
        
        <FAQ 
          q="可以同時管理多個補習班嗎？"
          a="可以！每個補習班有獨立的資料，互不干擾。"
        />
        
        <FAQ 
          q="資料會被其他補習班看到嗎？"
          a="不會！蜂神榜 Ai 點名系統 是多租戶系統，每個補習班的資料完全隔離。"
        />
        
        <FAQ 
          q="NFC 卡在哪裡買？"
          a="一般電子材料行、網購平台都有。建議購買 MIFARE Classic 1K。"
        />

        <FAQ 
          q="忘記密碼怎麼辦？"
          a="目前請聯繫系統管理員重設。未來會支援 Firebase Auth 自動重設。"
        />
      </Section>

      {/* Support */}
      <Section emoji="🆘" title="需要協助？">
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
            <strong>技術支援</strong>
          </p>
          <ul style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>Email: <a href="mailto:superafatus@gmail.com" style={{ color: 'var(--primary)' }}>superafatus@gmail.com</a></li>
            <li>Line: <a href="https://line.me/R/ti/p/@140boizd" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>@140boizd</a></li>
          </ul>
        </div>
      </Section>
    </div>
  )
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '24px', color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '28px' }}>{emoji}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', gap: '16px' }}>
      <div style={{ minWidth: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h3>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  )
}

function FeatureBox({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        {title}
      </h3>
      <ul style={{ marginLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <p style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>Q: {q}</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>A: {a}</p>
    </div>
  )
}

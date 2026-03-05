'use client'

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-primary mb-2 flex items-center gap-3">
          <span className="text-4xl">📚</span>
          蜂神榜 Ai 點名系統 使用說明
        </h1>
        <p className="text-text-muted text-base">完整功能教學，5 分鐘快速上手</p>
      </div>

      {/* Quick Start */}
      <Section emoji="🚀" title="快速開始">
        <Step number="1" title="NFC 點名">
          <p>在首頁的「NFC 刷卡點名」區塊輸入卡號，按 Enter 或點擊「點名」即可。</p>
          <p className="mt-2 text-sm text-text-muted">💡 系統會自動記錄時間並發送 LINE 通知給家長（需設定）</p>
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
            '臉部辨識：點擊「📸 刷臉」拍照點名',
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

        <FeatureBox
          icon="📝"
          title="成績管理"
          items={[
            '考試建立：設定考試名稱、科目、滿分',
            '成績輸入：批次輸入學生成績',
            '班級統計：自動計算平均、最高、最低分',
            '成績報表：成績一覽與趨勢分析'
          ]}
        />

        <FeatureBox
          icon="💰"
          title="帳務管理"
          items={[
            '繳費記錄：查看各班學費繳納狀態',
            '繳費提醒：逾期未繳自動標示',
            '收費報表：月度收費統計'
          ]}
        />

        <FeatureBox
          icon="📸"
          title="臉部辨識點名"
          items={[
            '臉部註冊：拍攝學生照片建立人臉模型',
            '刷臉點名：開啟攝影機自動辨識點名',
            '多人辨識：支援同時辨識多位學生',
            '搭配 NFC：NFC + 臉辨雙重驗證'
          ]}
        />
      </Section>

      {/* Integration */}
      <Section emoji="🔗" title="系統整合說明">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl mb-5">
          <h3 className="text-xl text-primary mb-4 font-bold">
            蜂神榜 Ai 點名系統 🐝 + 蜂神榜 Ai 管理系統 📊 = 完整解決方案
          </h3>

          <div className="mb-5">
            <h4 className="text-base text-primary mb-2 font-bold">
              蜂神榜 Ai 點名系統（教學前線）
            </h4>
            <ul className="ml-5 text-text text-sm leading-relaxed">
              <li>NFC 點名 + 臉部辨識</li>
              <li>成績輸入</li>
              <li>教室即時狀態</li>
              <li>出勤報表</li>
            </ul>
          </div>

          <div className="mb-5">
            <h4 className="text-base text-primary mb-2 font-bold">
              蜂神榜 Ai 管理系統（營運後台）
            </h4>
            <ul className="ml-5 text-text text-sm leading-relaxed">
              <li>財務管理 + 帳單開立</li>
              <li>排課系統 + 薪資計算</li>
              <li>AI 流失預警</li>
              <li>招生 CRM + RAG 知識庫</li>
            </ul>
          </div>

          <div className="p-4 bg-white/60 rounded-xl border border-amber-200">
            <p className="text-sm text-text mb-2">
              <strong>✨ 整合方式</strong>
            </p>
            <ul className="text-sm text-text-muted ml-5">
              <li>學生點名 → 自動通知 蜂神榜 Ai 管理系統 → LINE 發送給家長</li>
              <li>學生資料同步（未來功能）</li>
              <li>成績資料整合（未來功能）</li>
            </ul>
          </div>

          <a
            href="https://manage.94cram.com"
            target="_blank"
            rel="noopener"
            className="inline-block mt-4 px-5 py-2.5 bg-primary text-white rounded-lg no-underline font-bold hover:opacity-90 transition-opacity"
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

        <FAQ
          q="臉部辨識準確度如何？"
          a="系統使用 AI 人臉辨識模型，在光線充足的環境下準確率可達 95% 以上。建議在良好光線下註冊正面照片，並定期更新。"
        />

        <FAQ
          q="可以同時用 NFC 和臉部辨識嗎？"
          a="可以！兩種方式可以並行使用。NFC 適合快速通過，臉部辨識適合忘帶卡的學生。"
        />
      </Section>

      {/* Support */}
      <Section emoji="🆘" title="需要協助？">
        <div className="bg-surface p-5 rounded-2xl border border-border">
          <p className="mb-4 text-text font-bold">
            技術支援
          </p>
          <ul className="ml-5 text-text-muted text-sm leading-relaxed">
            <li className="mb-2">📧 Email: <a href="mailto:superafatus@gmail.com" className="text-primary hover:underline">superafatus@gmail.com</a></li>
            <li>💬 LINE: <a href="https://line.me/R/ti/p/@140boizd" target="_blank" rel="noopener" className="text-primary hover:underline">@140boizd</a></li>
          </ul>
        </div>
      </Section>
    </div>
  )
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl text-primary mb-5 flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex gap-4">
      <div className="min-w-[40px] h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-text mb-2">{title}</h3>
        <div className="text-text-muted text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function FeatureBox({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div className="bg-surface p-5 rounded-2xl border border-border mb-4">
      <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        {title}
      </h3>
      <ul className="ml-5 text-text-muted text-sm leading-loose">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-4 p-4 bg-surface rounded-xl border border-border">
      <p className="font-bold text-primary mb-2">Q: {q}</p>
      <p className="text-text-muted text-sm">A: {a}</p>
    </div>
  )
}

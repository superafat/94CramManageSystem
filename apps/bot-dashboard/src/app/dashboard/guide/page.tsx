'use client'

// ---------------------------------------------------------------------------
// Reusable Components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-[#4b4355] mb-4 flex items-center gap-2 border-b border-[#d8d3de] pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#A89BB5] text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <div className="font-semibold text-[#4b4355] text-sm">{title}</div>
        <div className="text-sm text-[#7b7387] mt-0.5">{description}</div>
      </div>
    </div>
  )
}

function FeatureBox({
  icon,
  title,
  items,
}: {
  icon: string
  title: string
  items: string[]
}) {
  return (
    <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
      <h3 className="font-semibold text-[#4b4355] mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[#5d5468]">
            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#A89BB5]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
      <div className="font-semibold text-[#4b4355] text-sm mb-2 flex items-start gap-2">
        <span className="flex-shrink-0 text-[#A89BB5]">Q</span>
        {question}
      </div>
      <div className="text-sm text-[#7b7387] flex items-start gap-2">
        <span className="flex-shrink-0 font-semibold text-[#A89BB5]">A</span>
        {answer}
      </div>
    </div>
  )
}

function CommandRow({ query, action }: { query: string; action: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#d8d3de] last:border-0">
      <div className="flex-1 text-sm text-[#4b4355] font-medium bg-[#F5F0F7] rounded-lg px-3 py-1.5">
        「{query}」
      </div>
      <span className="text-[#A89BB5] text-sm flex-shrink-0">→</span>
      <div className="flex-1 text-sm text-[#7b7387]">{action}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GuidePage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#4b4355]">📚 使用說明</h1>
        <p className="text-sm text-[#7b7387] mt-1">
          蜂神榜 補習班 Ai 助手系統 — 千里眼 & 順風耳操作指引
        </p>
      </div>

      {/* Quick Start */}
      <Section title="🚀 快速開始">
        <div className="bg-white rounded-xl border border-[#d8d3de] p-6 shadow-sm space-y-5">
          <Step
            number={1}
            title="登入系統"
            description="使用蜂神榜帳號登入 AI 助手管理面板"
          />
          <Step
            number={2}
            title="綁定 Telegram"
            description="在 Telegram 搜尋 @cram94_bot，輸入 /start 開始綁定"
          />
          <Step
            number={3}
            title="開始對話"
            description='直接用自然語言操作，例如「今天誰缺席？」「查張志豪的成績」'
          />
        </div>
      </Section>

      {/* Feature Overview */}
      <Section title="🤖 功能說明">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureBox
            icon="🏫"
            title="千里眼管理"
            items={[
              'Bot 狀態：查看千里眼 Bot 運行狀態與連線情形',
              '指令管理：查看已註冊的指令與使用頻率',
              'AI 對話紀錄：查看所有使用者的對話歷史',
              '權限控管：設定哪些老師可以使用寫入操作',
            ]}
          />
          <FeatureBox
            icon="👨‍👩‍👧"
            title="順風耳管理"
            items={[
              '家長綁定：管理家長與學生的綁定關係',
              '通知設定：設定成績推播、出勤通知、繳費提醒的開關',
              '訊息範本：自訂推播訊息的格式與內容',
              '推播歷史：查看已發送的通知紀錄',
            ]}
          />
          <FeatureBox
            icon="📊"
            title="用量統計"
            items={[
              'AI Calls 用量：本月已用 / 額度上限',
              '訊息統計：千里眼 vs 順風耳訊息量對比',
              '活躍用戶：每日/每週活躍老師與家長數',
              '趨勢圖表：過去 30 天的使用趨勢',
            ]}
          />
          <FeatureBox
            icon="⚙️"
            title="系統設定"
            items={[
              '方案管理：查看目前訂閱方案與 AI Calls 額度',
              'API 金鑰：管理系統整合用的 API Key',
              'Webhook 設定：設定 Telegram Webhook URL',
              '通知偏好：管理員通知設定（Email / Telegram）',
            ]}
          />
        </div>
      </Section>

      {/* 千里眼 Commands */}
      <Section title="🏫 千里眼指令集">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Read-only */}
          <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#A8B5A2]/20 text-[#5a7a54]">
                查詢類（唯讀）
              </span>
            </div>
            <CommandRow query="今天誰缺席？" action="查詢今日出勤" />
            <CommandRow query="張志豪這個月出勤如何？" action="查詢學生出勤" />
            <CommandRow query="國中數學班有幾個人？" action="查詢班級人數" />
            <CommandRow query="這個月營收多少？" action="查詢月度營收" />
            <CommandRow query="庫存剩多少講義？" action="查詢庫存" />
          </div>

          {/* Write with confirm */}
          <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#C4A9A1]/20 text-[#7a4f47]">
                操作類（需二次確認）
              </span>
            </div>
            <CommandRow query="幫張志豪請假" action="登記請假" />
            <CommandRow query="記錄張志豪數學 85 分" action="輸入成績" />
            <CommandRow query="進貨 100 份國中數學講義" action="入庫登記" />
            <CommandRow query="開一張 NT$5000 的學費帳單" action="開立帳單" />
          </div>
        </div>

        <p className="text-xs text-[#7b7387] mt-3 flex items-start gap-1.5">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          操作類指令執行前會在 Telegram 顯示確認提示，點擊確認按鈕才會真正寫入資料，避免誤觸。
        </p>
      </Section>

      {/* 順風耳 Commands */}
      <Section title="👨‍👩‍👧 順風耳查詢">
        <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
          <p className="text-sm text-[#7b7387] mb-4">
            家長在 Telegram 搜尋 <span className="font-mono text-[#4b4355] bg-[#F5F0F7] px-1.5 py-0.5 rounded">@Cram94_VIP_bot</span> 綁定後，可查詢以下資訊：
          </p>
          <CommandRow query="我的孩子今天有到嗎？" action="出勤查詢" />
          <CommandRow query="最近考試成績如何？" action="成績查詢" />
          <CommandRow query="學費繳了嗎？" action="繳費狀態" />
          <CommandRow query="這週的課表？" action="課表查詢" />
        </div>
        <p className="text-xs text-[#7b7387] mt-3 flex items-start gap-1.5">
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          順風耳僅提供唯讀查詢，家長無法透過 Bot 修改任何資料。
        </p>
      </Section>

      {/* FAQ */}
      <Section title="❓ 常見問題">
        <div className="space-y-3">
          <FAQ
            question="千里眼和順風耳有什麼不同？"
            answer="千里眼是給補習班老師用的內部 Bot，可以查詢和操作三大系統；順風耳是給家長用的服務 Bot，只能查看孩子的資訊，無法修改任何資料。"
          />
          <FAQ
            question="AI 對話安全嗎？寫入操作會不會誤觸？"
            answer="所有寫入操作（請假、成績、進貨等）都需要二次確認，點擊確認按鈕才會真正執行。純查詢操作不會修改任何資料。"
          />
          <FAQ
            question="AI Calls 用完怎麼辦？"
            answer="AI Calls 每月自動重置。用完後基本的指令查詢仍可使用，但 AI 自然語言理解功能會暫停。可升級方案獲得更多額度。"
          />
          <FAQ
            question="家長要怎麼綁定順風耳？"
            answer="家長在 Telegram 搜尋 @Cram94_VIP_bot，輸入 /start 後按照指示輸入驗證碼即可。驗證碼由老師在管理系統中產生。"
          />
          <FAQ
            question="支援 LINE 嗎？"
            answer="目前千里眼和順風耳運行在 Telegram 上。LINE Bot 整合已在規劃中，敬請期待。"
          />
        </div>
      </Section>

      {/* Support */}
      <Section title="🆘 需要協助？">
        <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-lg">📧</span>
              <div>
                <div className="text-[#7b7387]">Email 聯絡</div>
                <a
                  href="mailto:superafatus@gmail.com"
                  className="font-medium text-[#A89BB5] hover:text-[#4b4355] transition"
                >
                  superafatus@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-lg">💬</span>
              <div>
                <div className="text-[#7b7387]">Telegram Bot</div>
                <a
                  href="https://t.me/cram94_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#A89BB5] hover:text-[#4b4355] transition"
                >
                  @cram94_bot
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

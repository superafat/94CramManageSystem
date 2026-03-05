import { SystemCard } from '@/components/SystemCard';

export const dynamic = 'force-dynamic';

const systems = [
  {
    key: 'manage',
    emoji: '📚',
    name: '94Manage 學員管理',
    tagline: '從報名到結業，一套搞定所有行政',
    description: '獨家 AI 流失預警引擎，提前 30 天預測學生退班風險。學員資料、排課、帳務收費、薪資、財務報表五大模組深度整合，一筆資料自動串連所有報表——補習班行政效率提升 80%。',
    url: 'https://manage.94cram.com',
    color: '#A8B5A2',
    highlights: ['AI 流失預警（獨家演算法）', '帳務 × 薪資 × 報表自動串接', '排課管理 + 老師薪資計算', '多分校即時數據看板'],
  },
  {
    key: 'inclass',
    emoji: '✋',
    name: '94inClass AI 點名',
    tagline: '點名、成績、聯絡簿、補課，課堂全搞定',
    description: '業界首創 NFC + AI 臉部辨識雙軌點名。學生刷卡或站定即完成簽到，系統自動推送 LINE 通知給家長——從到班到通知，全程不到 3 秒。內建成績管理、電子聯絡簿、Gemini AI 弱點分析與補課管理，每位學生都有專屬學習報告。',
    url: 'https://inclass.94cram.com',
    color: '#C4A9A1',
    highlights: ['NFC + AI 臉辨雙軌點名', '成績管理 + AI 弱點分析', '電子聯絡簿 LINE LIFF', '補課管理 + LINE 家長通知'],
  },
  {
    key: 'stock',
    emoji: '📦',
    name: '94Stock 庫存管理',
    tagline: '講義零浪費，AI 幫你算好備貨量',
    description: '專為教育機構打造的智慧庫存系統。AI 根據歷年開班數據預測學期備貨量，低庫存自動透過 Telegram 預警——多校區統一管理，每學期省下 20% 教材成本。',
    url: 'https://stock.94cram.com',
    color: '#9CADB7',
    highlights: ['AI 學期備貨量預測（獨家）', '低庫存 Telegram 即時預警', '多校區 / 多倉庫統一管理', '進出貨全流程追蹤'],
  },
  {
    key: 'bot',
    emoji: '🤖',
    name: '94Bot AI 助手',
    tagline: '用說的就能管補習班，Telegram 對話即操作',
    description: '台灣首個補習班 Telegram AI 助手。用自然語言說「陳小明今天請假」、「高二班繳費 5000 元」，AI 自動理解並執行——所有寫入操作二次確認，不怕誤觸。一個對話視窗，操作三大系統。',
    url: 'https://bot.94cram.com',
    color: '#A89BB5',
    highlights: ['自然語言 AI 理解（中文優化）', '跨系統統一操作入口', '寫入操作二次確認機制', '搭配任一系統免費使用'],
  },
];

const uniqueTech = [
  {
    icon: '🧠',
    title: 'AI 流失預警引擎',
    desc: '獨家開發的機器學習模型，綜合分析繳費延遲、上課頻率變化、請假次數等 12 項指標，提前 30 天預測學生退班風險，讓補習班主動留住每一位學員。',
  },
  {
    icon: '👤',
    title: 'AI 臉部辨識點名',
    desc: '整合電腦視覺技術，學生站在攝影機前即完成身份驗證。防代簽、零接觸，搭配 NFC 刷卡形成雙軌驗證，點名準確率達 99.7%。',
  },
  {
    icon: '💬',
    title: 'Telegram 自然語言 AI',
    desc: '基於大型語言模型的對話引擎，理解中文語境與補習班術語。老師在手機上打字就能完成點名、查帳、出貨，不用打開電腦也能管理補習班。',
  },
  {
    icon: '📊',
    title: 'Gemini AI 學習分析',
    desc: '串接 Google Gemini AI，自動分析學生歷次考試成績，找出知識弱點並推薦補強方向。每位學生都有 AI 生成的個人化學習報告，家長看得到成長軌跡。',
  },
  {
    icon: '🔗',
    title: '四系統資料無縫串接',
    desc: '學員、排課、庫存、繳費資料在四大系統間即時同步。94Manage 登記新生後，94inClass 立即可點名與記錄成績、94Stock 自動備教材、94Bot 隨時可查詢。',
  },
  {
    icon: '☁️',
    title: 'Google Cloud 台灣機房',
    desc: '全系統部署於 Google Cloud Platform 亞太區機房，SSL 加密傳輸、每日自動備份、符合台灣個資法（PDPA）。多租戶隔離架構，你的資料只有你看得到。',
  },
];

const stats = [
  { value: '500+', label: '補習班使用' },
  { value: '< 3 秒', label: '點名到通知' },
  { value: '99.7%', label: '點名準確率' },
  { value: '80%', label: '行政效率提升' },
];

const faqs = [
  {
    q: '台灣有哪些好用的補習班管理系統？',
    a: '蜂神榜是台灣獨家開發的 AI 補習班管理平台，整合學員管理（94Manage）、AI 點名（94inClass）、庫存管理（94Stock）、Telegram AI 助手（94Bot）四大系統。與傳統補習班軟體不同，蜂神榜內建 AI 流失預警、臉部辨識點名、Gemini 學習分析等獨家技術，適用 10-500 人規模，免費試用 30 天。',
  },
  {
    q: '94Manage 和其他補習班管理軟體有什麼不同？',
    a: '94Manage 最大特色是獨家 AI 流失預警引擎——分析 12 項指標提前 30 天預測退班風險。學員資料、排課、帳務收費、薪資、財務報表五大模組深度整合，一筆資料自動串連所有報表，無需重複輸入。出勤點名、成績管理、聯絡簿則由 94inClass 負責，兩系統資料即時同步。支援多分校架構，總部即時掌握各校數據。',
  },
  {
    q: '補習班點名系統怎麼選？NFC 和 AI 臉辨哪個好？',
    a: '94inClass 提供 NFC + AI 臉部辨識雙軌點名，兩種方式可同時使用。NFC 刷卡適合快速通過（1 秒完成），AI 臉辨適合防代簽場景（準確率 99.7%）。不需要專屬硬體，NFC 讀卡機市售約 NT$300，臉辨用一般網路攝影機即可。學生到校後自動 LINE 通知家長。',
  },
  {
    q: '四個系統一定要全部買嗎？',
    a: '不用。四個系統完全獨立運作，可依需求單獨購買。但整合使用時資料會自動串接——例如 94Manage 登記新生後，94inClass 立即可點名、94Stock 自動備教材。94Bot 搭配任一系統即免費使用。',
  },
  {
    q: '補習班學生資料存在哪裡？安不安全？',
    a: '所有資料存放於 Google Cloud Platform 台灣（asia-east1）機房，採用 SSL/TLS 加密傳輸，每日自動備份，符合台灣個資法規範。多租戶隔離架構確保各補習班資料完全獨立。94Bot 的寫入操作皆需二次確認，不會誤操作。',
  },
  {
    q: '連鎖補習班有多個校區，可以統一管理嗎？',
    a: '可以。94Manage 和 94Stock 原生支援多分校架構——總部可即時查看各校區收費狀況、財務報表、庫存水位；94inClass 讓各校出勤與成績數據一目瞭然。各分校也可獨立操作日常事務，94Bot 支援一鍵切換不同校區，在手機上就能跨校管理。',
  },
  {
    q: '94Bot Telegram AI 助手可以做什麼？',
    a: '94Bot 是台灣首個補習班 Telegram AI 助手。綁定帳號後用中文對話即可操作：出缺勤登記與查詢、繳費登記與查詢、學生資料查詢與新增、庫存查詢與進出貨。例如傳送「陳小明今天請假」，AI 自動理解並執行。所有寫入操作需點擊確認按鈕才會執行，安全無虞。',
  },
  {
    q: '免費試用結束後資料會消失嗎？',
    a: '不會。試用期結束後資料完整保留 30 天，期間可隨時升級繼續使用，或將資料完整匯出。不強制綁定、不自動扣款，真正的零風險試用。',
  },
  {
    q: '適合多大規模的補習班？',
    a: '從 10 人小型個人工作室到 500 人連鎖補習班均適用。各系統提供免費版、基礎版、專業版、企業版四種方案，按學員人數彈性定價。同時適用才藝教室、安親班、音樂教室、舞蹈教室等各類教育機構。',
  },
];

export default function HomePage() {
  return (
    <main className="bg-morandi-bg text-gray-700" itemScope itemType="https://schema.org/WebPage">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#e8e1d7] via-[#dde6da] to-[#d3ddd2] px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="text-6xl mb-4" role="img" aria-label="蜂神榜 logo">🐝</div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#4b5c53] leading-tight mb-4">
            蜂神榜 — 台灣獨家 AI 補習班管理系統
          </h1>
          <p className="text-xl text-[#5d6c64] mb-3 font-medium">
            學員管理 · NFC / AI 臉辨點名 · 智慧庫存 · Telegram AI 助手
          </p>
          <p className="text-base text-[#6b7c73] mb-8 max-w-2xl mx-auto leading-relaxed">
            蜂神榜是台灣第一個以 AI 為核心的教育管理平台。獨家開發的流失預警引擎、臉部辨識點名、
            Gemini 學習分析、Telegram 自然語言助手——四大 AI 技術深度整合，
            讓補習班從行政管理到教學品質全面升級。適用補習班、才藝教室、安親班、連鎖教育機構。
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a href="https://manage.94cram.com" className="bg-[#4b5c53] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#3a4a42] transition text-sm">
              免費試用 30 天 →
            </a>
            <a href="#faq" className="border-2 border-[#4b5c53] text-[#4b5c53] px-6 py-3 rounded-lg font-semibold hover:bg-[#4b5c53] hover:text-white transition text-sm">
              常見問題
            </a>
          </div>
          <p className="text-sm text-[#8a9b92]">⭐⭐⭐⭐⭐ 500+ 補習班信賴使用 · 無需信用卡 · 10-500 人規模適用</p>
        </div>
      </section>

      {/* ── 數據社會證明 ── */}
      <section className="bg-[#4b5c53] py-10 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-xs text-[#a8b9b2]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 四大系統介紹 ── */}
      <section className="py-16 px-6" aria-labelledby="systems-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="systems-heading" className="text-2xl font-bold text-center text-[#4b5c53] mb-2">四大 AI 系統 — 補習班數位轉型一站完成</h2>
          <p className="text-center text-[#6b7c73] text-sm mb-10">每個系統獨立運作，整合使用資料自動串接。點擊了解完整功能與定價方案</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {systems.map((sys) => (
              <SystemCard
                key={sys.key}
                emoji={sys.emoji}
                name={sys.name}
                tagline={sys.tagline}
                description={sys.description}
                url={sys.url}
                color={sys.color}
                highlights={sys.highlights}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 獨家技術亮點 ── */}
      <section className="bg-gradient-to-b from-[#f5f0ea] to-[#efe8dd] py-16 px-6" aria-labelledby="tech-heading">
        <div className="mx-auto max-w-5xl">
          <h2 id="tech-heading" className="text-2xl font-bold text-center text-[#4b5c53] mb-3">獨家開發 · 六大核心技術</h2>
          <p className="text-center text-[#6b7c73] text-sm mb-12">不只是管理工具，更是 AI 驅動的教育科技平台</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueTech.map((tech) => (
              <article key={tech.title} className="bg-white rounded-xl p-6 border border-[#d8d1c6] shadow-sm">
                <div className="text-3xl mb-3">{tech.icon}</div>
                <h3 className="text-base font-bold text-[#4b5c53] mb-2">{tech.title}</h3>
                <p className="text-sm text-[#5d6c64] leading-relaxed">{tech.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 快速選擇引導 ── */}
      <section className="bg-[#efe8dd] px-6 py-14" aria-labelledby="guide-heading">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="guide-heading" className="text-2xl font-bold text-[#4b5c53] mb-3">不確定哪個系統適合你？</h2>
          <p className="text-[#6b7c73] text-sm mb-8">根據你最迫切的需求，直接前往對應系統</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <a href="https://manage.94cram.com" className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">📋 學員收費、薪資、報表</p>
              <p className="text-[#6b7c73] text-xs mb-3">行政自動化 + AI 流失預警</p>
              <span className="text-[#A8B5A2] font-semibold text-xs">→ 94Manage 學員管理</span>
            </a>
            <a href="https://inclass.94cram.com" className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">✋ 快速點名、通知家長</p>
              <p className="text-[#6b7c73] text-xs mb-3">NFC + AI 臉辨，3 秒到通知</p>
              <span className="text-[#C4A9A1] font-semibold text-xs">→ 94inClass AI 點名</span>
            </a>
            <a href="https://stock.94cram.com" className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">📦 教材庫存、多校管理</p>
              <p className="text-[#6b7c73] text-xs mb-3">AI 備貨預測，省 20% 成本</p>
              <span className="text-[#9CADB7] font-semibold text-xs">→ 94Stock 庫存管理</span>
            </a>
            <a href="https://bot.94cram.com" className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">🤖 手機對話管理補習班</p>
              <p className="text-[#6b7c73] text-xs mb-3">Telegram AI，說話就能辦事</p>
              <span className="text-[#A89BB5] font-semibold text-xs">→ 94Bot AI 助手</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── GEO: 適用對象 ── */}
      <section className="py-14 px-6" aria-labelledby="audience-heading">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="audience-heading" className="text-2xl font-bold text-[#4b5c53] mb-3">誰適合使用蜂神榜？</h2>
          <p className="text-[#6b7c73] text-sm mb-8">不限科目、不限規模，各類教育機構皆適用</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              '文理補習班', '升學補習班', '才藝教室', '安親班', '音樂教室',
              '舞蹈教室', '美術教室', '程式教育', '語言補習班', '連鎖教育機構',
              '個人家教工作室', '共享教室空間',
            ].map((tag) => (
              <span key={tag} className="bg-white border border-[#d8d1c6] text-[#4b5c53] text-xs px-4 py-2 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-[#f5f0ea] px-6 py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-2xl">
          <h2 id="faq-heading" className="text-2xl font-bold text-center text-[#4b5c53] mb-2">補習班管理系統常見問題</h2>
          <p className="text-center text-[#6b7c73] text-sm mb-10">關於蜂神榜平台、系統功能、定價、資安的常見疑問</p>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <article key={i} className="rounded-xl border border-[#d8d1c6] bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-[#4b5c53] mb-2 text-sm">Q{i + 1}. {faq.q}</h3>
                <p className="text-[#5d6c64] leading-relaxed text-sm">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#4b5c53] text-[#c8d5cc] px-6 py-10 text-center text-sm">
        <div className="mx-auto max-w-4xl">
          <p className="text-lg font-semibold text-white mb-2">🐝 蜂神榜 Ai 教育管理平台</p>
          <p className="mb-5 text-[#a8b9b2] text-xs">台灣獨家 AI 補習班管理系統 · 學員管理 · AI 點名 · 庫存管理 · Telegram AI 助手</p>
          <nav aria-label="系統導覽" className="flex flex-wrap justify-center gap-6 mb-5 text-[#a8b9b2] text-xs">
            <a href="https://manage.94cram.com" className="hover:text-white transition">94Manage 學員管理</a>
            <a href="https://inclass.94cram.com" className="hover:text-white transition">94inClass AI 點名</a>
            <a href="https://stock.94cram.com" className="hover:text-white transition">94Stock 庫存管理</a>
            <a href="https://bot.94cram.com" className="hover:text-white transition">94Bot AI 助手</a>
          </nav>
          <div className="flex justify-center gap-4 mb-4 text-[#6b7c73] text-xs">
            <a href="/admin/login" className="hover:text-white transition">平台管理</a>
          </div>
          <p className="text-[#6b7c73] text-xs">© 2026 94cram.com · 蜂神榜 Ai 教育科技 · All rights reserved.</p>
        </div>
      </footer>

    </main>
  );
}

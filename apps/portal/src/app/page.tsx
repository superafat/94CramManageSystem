import { SystemCard } from '@/components/SystemCard';

export const dynamic = 'force-dynamic';

const systems = [
  {
    key: 'manage',
    emoji: '📚',
    name: '94Manage 學員管理',
    tagline: '補習班全方位管理中樞',
    description: '學員資料、出勤追蹤、成績管理、帳務收費、薪資計算、AI 流失預警，一套解決補習班所有行政難題。',
    url: process.env.MANAGE_URL || 'https://cram94-manage-dashboard-1015149159553.asia-east1.run.app',
    color: '#A8B5A2',
    highlights: ['出勤 × 成績 × 帳務三合一', 'AI 學生流失預警', '薪資自動計算', '免費試用 30 天'],
  },
  {
    key: 'inclass',
    emoji: '✋',
    name: '94inClass 點名系統',
    tagline: '1 秒點名，家長即時知情',
    description: 'NFC 刷卡比刷悠遊卡還快，AI 臉辨防代簽，學生到校立即 LINE 通知家長。免硬體費用，開箱即用。',
    url: process.env.INCLASS_URL || 'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app',
    color: '#C4A9A1',
    highlights: ['NFC 刷卡 1 秒點名', 'AI 臉部辨識', 'LINE 家長即時通知', '免費試用 30 天'],
  },
  {
    key: 'stock',
    emoji: '📦',
    name: '94Stock 庫存管理',
    tagline: '教材零浪費，庫存一目瞭然',
    description: '管理講義、教材、耗材，支援多校區統一管理。AI 預測學期備貨量，低庫存自動預警，Telegram 即時推送。',
    url: process.env.STOCK_URL || 'https://cram94-stock-dashboard-1015149159553.asia-east1.run.app',
    color: '#9CADB7',
    highlights: ['多倉庫統一管理', 'AI 備貨量預測', '低庫存自動預警', '免費試用 14 天'],
  },
  {
    key: 'bot',
    emoji: '🤖',
    name: '94CramBot AI 助手',
    tagline: 'Telegram 對話即操作，管理不開電腦',
    description: '透過 Telegram 聊天機器人，用自然語言完成點名、繳費、出貨等操作。Gemini AI 理解你的指令，寫入前二次確認，安全又方便。',
    url: 'https://t.me/cram94bot',
    color: '#A89BB5',
    highlights: ['自然語言 AI 操作', 'Telegram 即時回應', '寫入操作二次確認', '跨系統統一入口'],
  },
];

const faqs = [
  {
    q: '四個系統可以單獨購買嗎？',
    a: '可以。每個系統獨立運作、按需選購。整合使用時，出勤、成績、庫存資料可自動串接，無需重複輸入。94CramBot 搭配任一系統使用即可。',
  },
  {
    q: '點名系統需要購買特殊硬體嗎？',
    a: '不需要。NFC 點名只需市售 NFC 讀卡機（約 NT$300），AI 臉辨使用一般網路攝影機即可，無需專屬設備。',
  },
  {
    q: '資料存放在哪裡？安全嗎？',
    a: '全部存放於 Google Cloud Platform 台灣/亞太區機房，SSL 加密傳輸，定期備份，符合個資法規範。94CramBot 的寫入操作皆需二次確認，不會誤操作。',
  },
  {
    q: '連鎖多校區可以統一管理嗎？',
    a: '可以。94Manage 和 94Stock 均支援多分校架構，總部可統一查看各校區數據，各分校也可獨立操作。94CramBot 支援一鍵切換不同校區。',
  },
  {
    q: '免費試用結束後資料會消失嗎？',
    a: '不會。試用期結束後資料保留 30 天，可選擇升級繼續使用，或匯出資料離開，不強制綁定。',
  },
  {
    q: '94CramBot 是什麼？怎麼用？',
    a: '94CramBot 是 Telegram 聊天機器人 AI 助手。綁定補習班帳號後，直接用自然語言對話即可操作三大系統，例如「陳小明今天請假」、「高二陳小明繳 5000 元」。所有寫入操作都會先確認才執行。',
  },
  {
    q: '94CramBot 支援哪些操作？',
    a: '目前支援：出缺勤登記與查詢、繳費登記與查詢、學生資料查詢與新增、庫存查詢與進出貨。查詢類操作即時回覆，寫入類操作需點擊確認按鈕才會執行。',
  },
  {
    q: '適合多少學員規模？',
    a: '從 10 人個人工作室到 500 人連鎖補習班均適用。各系統均有免費/基礎/專業/企業版，按需升級。',
  },
];

export default function HomePage() {
  return (
    <div className="bg-morandi-bg text-gray-700">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#e8e1d7] via-[#dde6da] to-[#d3ddd2] px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="text-6xl mb-4">🐝</div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#4b5c53] leading-tight mb-4">
            蜂神榜 Ai 教育管理平台
          </h1>
          <p className="text-xl text-[#5d6c64] mb-2 font-medium">
            補習班管理 · 智能點名 · 庫存管理 · AI 助手
          </p>
          <p className="text-base text-[#6b7c73] mb-8 max-w-xl mx-auto">
            四大系統一站整合，補習班全面數位化。<br/>
            選擇最適合您的系統，立即免費試用。
          </p>
          <p className="text-sm text-[#8a9b92]">⭐⭐⭐⭐⭐ 500+ 補習班信賴使用 · 無需信用卡</p>
        </div>
      </section>

      {/* ── 三系統介紹卡 ── */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center text-[#4b5c53] mb-2">選擇您需要的系統</h2>
          <p className="text-center text-[#6b7c73] text-sm mb-10">點擊進入各系統官方介紹頁，了解詳細功能與定價</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {systems.map((sys) => (
              <a
                key={sys.key}
                href={sys.url}
                className="group block rounded-2xl bg-white border-2 p-8 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                style={{ borderColor: sys.color + '88' }}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{sys.emoji}</div>
                <h3 className="text-xl font-bold text-[#4b5c53] mb-1">{sys.name}</h3>
                <p className="text-sm font-medium mb-3" style={{ color: sys.color }}>{sys.tagline}</p>
                <p className="text-sm text-[#6b746e] mb-5 leading-relaxed">{sys.description}</p>
                <ul className="space-y-1.5 mb-6">
                  {sys.highlights.map((h) => (
                    <li key={h} className="text-xs text-[#5d6c64] flex items-center gap-2">
                      <span className="text-[#8fa895]">✓</span> {h}
                    </li>
                  ))}
                </ul>
                <div
                  className="inline-block w-full text-center px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity group-hover:opacity-90"
                  style={{ backgroundColor: sys.color }}
                >
                  了解更多 →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── 快速選擇引導 ── */}
      <section className="bg-[#efe8dd] px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-[#4b5c53] mb-8">🤔 不知道從哪個開始？</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <a href={process.env.MANAGE_URL || '#'} className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">📋 需要管理學員 / 收費 / 薪資</p>
              <p className="text-[#6b7c73] text-xs mb-3">補習班日常行政全自動化</p>
              <span className="text-[#A8B5A2] font-semibold text-xs">→ 前往 94Manage</span>
            </a>
            <a href={process.env.INCLASS_URL || '#'} className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">✋ 需要快速點名 / 通知家長</p>
              <p className="text-[#6b7c73] text-xs mb-3">NFC + AI 臉辨，1 秒搞定</p>
              <span className="text-[#C4A9A1] font-semibold text-xs">→ 前往 94inClass</span>
            </a>
            <a href={process.env.STOCK_URL || '#'} className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">📦 需要管理講義 / 教材庫存</p>
              <p className="text-[#6b7c73] text-xs mb-3">多校區統一管理，AI 預測備貨</p>
              <span className="text-[#9CADB7] font-semibold text-xs">→ 前往 94Stock</span>
            </a>
            <a href="https://t.me/cram94bot" className="bg-white rounded-xl p-5 border border-[#d8d1c6] hover:shadow-md transition text-left">
              <p className="font-bold text-[#4b5c53] mb-2">🤖 想用手機對話操作系統</p>
              <p className="text-[#6b7c73] text-xs mb-3">Telegram AI 助手，說話就能辦事</p>
              <span className="text-[#A89BB5] font-semibold text-xs">→ 前往 94CramBot</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-center text-[#4b5c53] mb-2">常見問題 FAQ</h2>
          <p className="text-center text-[#6b7c73] text-sm mb-10">更多問題請至各系統首頁查看，或聯絡客服</p>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#d8d1c6] bg-white p-5 shadow-sm">
                <h4 className="font-semibold text-[#4b5c53] mb-2 text-sm">Q{i + 1}. {faq.q}</h4>
                <p className="text-[#5d6c64] leading-relaxed text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#4b5c53] text-[#c8d5cc] px-6 py-10 text-center text-sm">
        <div className="mx-auto max-w-4xl">
          <p className="text-lg font-semibold text-white mb-2">🐝 蜂神榜 Ai 教育管理平台</p>
          <p className="mb-5 text-[#a8b9b2] text-xs">94Manage · 94inClass · 94Stock · 94CramBot</p>
          <div className="flex flex-wrap justify-center gap-6 mb-5 text-[#a8b9b2] text-xs">
            <a href={process.env.MANAGE_URL || '#'} className="hover:text-white transition">94Manage 學員管理</a>
            <a href={process.env.INCLASS_URL || '#'} className="hover:text-white transition">94inClass 點名系統</a>
            <a href={process.env.STOCK_URL || '#'} className="hover:text-white transition">94Stock 庫存管理</a>
            <a href="https://t.me/cram94bot" className="hover:text-white transition">94CramBot AI 助手</a>
          </div>
          <p className="text-[#6b7c73] text-xs">© 2026 94cram.com · 蜂神榜 Ai 教育科技 · All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

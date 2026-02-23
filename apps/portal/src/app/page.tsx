import type { Metadata } from 'next';
import { SystemCard } from '@/components/SystemCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '蜂神榜 Ai 教育管理平台 | 補習班管理、點名、庫存一站式解決方案',
  description:
    '蜂神榜 Ai 教育管理平台整合補習班學員管理、AI 點名系統、智能庫存管理三大系統，專為台灣補習班、才藝教室、教育機構設計。免費試用 14 天，立即數位化您的補習班營運。',
  keywords:
    '補習班管理系統, 補習班點名系統, 補習班庫存管理, 學員管理系統, NFC點名, AI點名, 教育管理平台, 補習班軟體, 才藝教室管理, 94Manage, 94inClass, 94Stock',
  openGraph: {
    title: '蜂神榜 Ai 教育管理平台',
    description: '補習班管理、點名、庫存三合一解決方案',
    type: 'website',
    locale: 'zh_TW',
  },
};

const systems = [
  {
    key: 'manage',
    emoji: '📚',
    name: '94Manage 學員管理系統',
    tagline: '補習班全方位管理中樞',
    description: '從學員報名到結業，出勤、成績、帳務、薪資一站搞定。AI 自動分析學習成效，讓補習班老闆從繁瑣行政解放。',
    url: process.env.MANAGE_URL || 'http://localhost:3200',
    color: '#A8B5A2',
    features: [
      { icon: '👤', title: '學員資料管理', desc: '學員檔案、家長聯絡、班級分配一目瞭然' },
      { icon: '📋', title: '出勤追蹤', desc: '整合點名資料，自動彙整缺席/遲到紀錄' },
      { icon: '📊', title: '成績管理', desc: '考試成績輸入、成績單一鍵產出、排名追蹤' },
      { icon: '💰', title: '帳務管理', desc: '學費帳單自動開立、繳費狀態追蹤、分期設定' },
      { icon: '👨‍🏫', title: '薪資計算', desc: '教師鐘點費、獎金自動計算，月結報表匯出' },
      { icon: '🤖', title: 'AI 智能分析', desc: '學習趨勢預測、流失風險預警、招生建議' },
    ],
  },
  {
    key: 'inclass',
    emoji: '✋',
    name: '94inClass 點名系統',
    tagline: '1 秒完成點名，家長即時知情',
    description: 'NFC 刷卡點名比刷悠遊卡還快，AI 臉部辨識防代簽。學生到校/缺席立即 LINE 通知家長，提升家長滿意度。',
    url: process.env.INCLASS_URL || 'http://localhost:3201',
    color: '#C4A9A1',
    features: [
      { icon: '⚡', title: 'NFC 點名', desc: '學生刷卡 1 秒完成點名，比傳統點名快 10 倍' },
      { icon: '🤖', title: 'AI 臉部辨識', desc: '獨家視覺辨識，免購硬體，防止代簽' },
      { icon: '📱', title: 'LINE 即時通知', desc: '到校/遲到/缺席，家長 LINE 立即推送' },
      { icon: '📈', title: '出勤統計報表', desc: '班級出勤率、個人出勤趨勢自動分析' },
      { icon: '☁️', title: '雲端即時同步', desc: '多裝置同步，教室/辦公室資料一致' },
      { icon: '🔗', title: '整合 94Manage', desc: '出勤資料自動同步至學員管理系統' },
    ],
  },
  {
    key: 'stock',
    emoji: '📦',
    name: '94Stock 庫存管理系統',
    tagline: '講義教材零浪費，庫存一目瞭然',
    description: '專為教育機構打造的庫存系統，管理講義、教材、耗材。AI 預測備貨量，低庫存自動預警，連鎖多校區統一管理。',
    url: process.env.STOCK_URL || 'http://localhost:3000',
    color: '#9CADB7',
    features: [
      { icon: '📦', title: '品項分類管理', desc: '講義、教材、耗材分類，快速查詢' },
      { icon: '🏢', title: '多倉庫支援', desc: '總部與各分校庫存獨立管理，一目瞭然' },
      { icon: '📊', title: '智能報表', desc: '庫存周轉率、消耗分析、低庫存預警' },
      { icon: '🤖', title: 'AI 備貨預測', desc: '學期用量預測、自動補貨提醒、避免短缺' },
      { icon: '🔔', title: 'Telegram 通知', desc: '庫存異常即時推送，掌握每一筆變動' },
      { icon: '🔗', title: '整合 94Manage', desc: '發放記錄與學員資料自動關聯' },
    ],
  },
];

const comparisons = [
  { feature: '主要用途', manage: '學員/班級/財務全管理', inclass: '上課點名與家長通知', stock: '教材耗材庫存追蹤' },
  { feature: '核心用戶', manage: '校長/行政人員', inclass: '老師/行政', stock: '採購/倉管' },
  { feature: 'AI 功能', manage: '學習成效分析', inclass: '臉部辨識點名', stock: '備貨用量預測' },
  { feature: '家長互動', manage: '帳單/成績通知', inclass: '到校即時通知', stock: '—' },
  { feature: '報表', manage: '財務/成績/薪資', inclass: '出勤統計', stock: '庫存/消耗分析' },
  { feature: '系統整合', manage: '整合點名+庫存', inclass: '資料回傳 94Manage', stock: '資料回傳 94Manage' },
];

const faqs = [
  {
    q: '三個系統可以單獨購買嗎？',
    a: '可以。每個系統獨立運作，按需選購。但搭配使用時資料可自動串接，達到最佳效果。例如點名資料直接進入學員管理系統，無需重複輸入。',
  },
  {
    q: '94inClass 點名系統需要購買特殊硬體嗎？',
    a: '不需要。NFC 點名只需要一般 NFC 讀卡機（市售約 NT$300），AI 臉部辨識使用標準網路攝影機即可，無需購買專屬硬體設備。',
  },
  {
    q: '資料儲存在哪裡？安全性如何？',
    a: '所有資料存放於 Google Cloud Platform（台灣/亞太區機房），符合資料在地化要求。採用 SSL 加密傳輸、定期備份，並通過 Google 安全標準審核。',
  },
  {
    q: '適合多少學員規模的補習班？',
    a: '從 10 人小型個人工作室到 500 人以上連鎖補習班都適用。免費版支援基礎功能，專業版無限學員，企業版支援客製化需求。',
  },
  {
    q: '可以匯入現有的學員資料嗎？',
    a: '可以。支援 Excel/CSV 格式批量匯入學員資料，也提供遷移協助服務，讓您從舊系統切換時零損失。',
  },
  {
    q: '連鎖多校區如何管理？',
    a: '94Manage 和 94Stock 均支援多分校架構，總部可統一查看各校區資料，各校區亦可獨立操作。權限分層管理，確保資料安全。',
  },
  {
    q: '免費試用結束後資料會消失嗎？',
    a: '不會。試用期結束後資料完整保留 30 天，您可以選擇升級方案繼續使用，或匯出資料後離開，不會強制綁定。',
  },
  {
    q: '技術支援如何聯繫？',
    a: '提供 LINE 官方帳號即時客服、電話支援（工作日 9:00-18:00）、以及線上操作手冊。企業版另享 SLA 保障與專屬客戶成功經理。',
  },
];

export default function HomePage() {
  return (
    <div className="bg-morandi-bg text-gray-700">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#e8e1d7] via-[#dde6da] to-[#d3ddd2] px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="text-6xl mb-4">🐝</div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#4b5c53] leading-tight mb-4">
            蜂神榜 Ai 教育管理平台
          </h1>
          <p className="text-xl text-[#5d6c64] mb-2 font-medium">
            補習班管理 · 智能點名 · 庫存管理
          </p>
          <p className="text-base text-[#6b7c73] mb-8 max-w-2xl mx-auto">
            三大系統一站整合，從學員報名到教材管理全面數位化。
            專為台灣補習班、才藝教室、連鎖教育機構設計。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={process.env.MANAGE_URL || '#'} className="rounded-lg bg-[#8fa895] px-8 py-3 text-white font-semibold hover:bg-[#7a9380] transition">
              免費試用 14 天
            </a>
            <a href="#systems" className="rounded-lg border border-[#9fb1a0] px-8 py-3 text-[#4f5f56] font-semibold hover:bg-[#e6ddd1] transition">
              了解三大系統 ↓
            </a>
          </div>
          <p className="mt-6 text-sm text-[#8a9b92]">⭐⭐⭐⭐⭐ 已有 500+ 補習班信賴使用 · 無需信用卡即可試用</p>
        </div>
      </section>

      {/* ── 快速入口 ── */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm text-[#8a9b92] mb-6 font-medium tracking-wide uppercase">快速進入系統</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systems.map((sys) => (
              <SystemCard
                key={sys.key}
                emoji={sys.emoji}
                name={sys.key === 'manage' ? '學員管理' : sys.key === 'inclass' ? '點名系統' : '庫存管理'}
                description={sys.key === 'manage' ? '學員資料、課程排班、繳費紀錄' : sys.key === 'inclass' ? '上課點名、出勤統計、家長通知' : '教材庫存、進貨管理、發放紀錄'}
                url={sys.url}
                color={sys.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 三系統詳細介紹 ── */}
      <section id="systems" className="py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-[#4b5c53] mb-3">三大系統完整介紹</h2>
          <p className="text-center text-[#6b7c73] mb-14">各系統獨立運作，整合使用效益最大化</p>

          {systems.map((sys, idx) => (
            <div
              key={sys.key}
              className={`mb-16 rounded-2xl overflow-hidden shadow-sm border border-[#d8d1c6] ${idx % 2 === 1 ? 'bg-[#efe8dd]' : 'bg-white'}`}
            >
              {/* 系統標頭 */}
              <div className="px-8 py-8 border-b border-[#d8d1c6]">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-4xl">{sys.emoji}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-[#4b5c53]">{sys.name}</h3>
                    <p className="text-[#8fa895] font-medium">{sys.tagline}</p>
                  </div>
                </div>
                <p className="text-[#5d6c64] leading-relaxed max-w-3xl">{sys.description}</p>
                <a
                  href={sys.url}
                  className="mt-4 inline-block rounded-lg px-6 py-2.5 text-white font-semibold text-sm hover:opacity-90 transition"
                  style={{ backgroundColor: sys.color }}
                >
                  進入 {sys.name.split(' ')[0]} →
                </a>
              </div>

              {/* 功能卡片 */}
              <div className="px-8 py-8">
                <h4 className="text-lg font-semibold text-[#4b5c53] mb-5">核心功能</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sys.features.map((f) => (
                    <div key={f.title} className="bg-white/70 rounded-xl p-4 border border-[#d8d1c6]">
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <h5 className="font-semibold text-[#4f5f56] mb-1">{f.title}</h5>
                      <p className="text-sm text-[#6b746e]">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 差異比較表 ── */}
      <section className="bg-[#efe8dd] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-[#4b5c53] mb-3">三系統差異比較</h2>
          <p className="text-center text-[#6b7c73] mb-10">不確定需要哪個？對照功能一次看清楚</p>
          <div className="rounded-2xl overflow-hidden border border-[#d8d1c6] shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#4b5c53] text-white">
                  <th className="px-5 py-4 text-left font-semibold w-1/4">比較項目</th>
                  <th className="px-5 py-4 text-center font-semibold">📚 94Manage<br/><span className="font-normal text-xs opacity-80">學員管理</span></th>
                  <th className="px-5 py-4 text-center font-semibold">✋ 94inClass<br/><span className="font-normal text-xs opacity-80">點名系統</span></th>
                  <th className="px-5 py-4 text-center font-semibold">📦 94Stock<br/><span className="font-normal text-xs opacity-80">庫存管理</span></th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f5ef]'}>
                    <td className="px-5 py-3.5 font-medium text-[#4b5c53]">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center text-[#5d6c64]">{row.manage}</td>
                    <td className="px-5 py-3.5 text-center text-[#5d6c64]">{row.inclass}</td>
                    <td className="px-5 py-3.5 text-center text-[#5d6c64]">{row.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-[#8a9b92] mt-4">💡 三系統整合使用時，資料自動串接，無需重複輸入</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-[#4b5c53] mb-3">常見問題 FAQ</h2>
          <p className="text-center text-[#6b7c73] mb-10">還有疑問？聯繫我們的客服團隊</p>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#d8d1c6] bg-white p-6 shadow-sm">
                <h4 className="font-semibold text-[#4b5c53] mb-2">Q{i + 1}. {faq.q}</h4>
                <p className="text-[#5d6c64] leading-relaxed text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-[#dde6da] to-[#d3ddd2] px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl font-bold text-[#4b5c53] mb-4">立即開始數位化您的補習班</h2>
          <p className="text-[#5d6c64] mb-8">免費試用 14 天，無需信用卡，隨時可取消</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={process.env.MANAGE_URL || '#'} className="rounded-lg bg-[#8fa895] px-8 py-3 text-white font-semibold hover:bg-[#7a9380] transition shadow-md">
              📚 開始使用學員管理
            </a>
            <a href={process.env.INCLASS_URL || '#'} className="rounded-lg bg-[#b89e98] px-8 py-3 text-white font-semibold hover:bg-[#a38e88] transition shadow-md">
              ✋ 開始使用點名系統
            </a>
            <a href={process.env.STOCK_URL || '#'} className="rounded-lg bg-[#8fa0ad] px-8 py-3 text-white font-semibold hover:bg-[#7a909d] transition shadow-md">
              📦 開始使用庫存管理
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#4b5c53] text-[#c8d5cc] px-6 py-10 text-center text-sm">
        <div className="mx-auto max-w-4xl">
          <p className="text-lg font-semibold text-white mb-2">🐝 蜂神榜 Ai 教育管理平台</p>
          <p className="mb-4 text-[#a8b9b2]">補習班管理系統 · 點名系統 · 庫存管理系統</p>
          <div className="flex justify-center gap-6 mb-6 text-[#a8b9b2]">
            <a href="#systems" className="hover:text-white transition">系統介紹</a>
            <a href="#faq" className="hover:text-white transition">常見問題</a>
            <a href={process.env.MANAGE_URL || '#'} className="hover:text-white transition">聯絡我們</a>
          </div>
          <p className="text-[#6b7c73]">© 2026 94cram.app · 蜂神榜 Ai 教育科技 · All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

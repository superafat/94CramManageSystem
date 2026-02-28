import Link from 'next/link'
import { ChatDemo } from '@/components/demo'

export default function HomePage() {
  return (
    <div className="bg-bot-bg text-gray-700">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#ede6f2] via-[#e4dced] to-[#ddd5e8] px-4 py-16 md:py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="text-6xl mb-4 animate-float">🤖</div>
          <h1 className="text-3xl md:text-5xl font-bold text-[#4b4355] leading-tight mb-4">
            蜂神榜
            <br />
            補習班 Ai 助手系統
          </h1>
          <p className="text-lg md:text-xl text-[#5d5468] mb-2 font-medium">
            千里眼 × 順風耳，補習班智慧雙引擎
          </p>
          <p className="text-sm md:text-base text-[#7b7387] mb-8 max-w-xl mx-auto">
            老師用對話操作三大系統，家長即時掌握孩子動態。<br />
            Telegram Bot + AI，補習班管理從此不開電腦。
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#A89BB5] hover:bg-[#9688A3] text-white font-semibold px-8 py-3 rounded-xl transition shadow-md text-base"
          >
            免費開始使用
          </Link>
          <p className="text-xs text-[#9b92a5] mt-4">免費方案含 100 次 AI Calls / 月，無需信用卡</p>
        </div>
      </section>

      {/* ── 雙 Bot 介紹 ── */}
      <section className="py-14 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center text-[#4b4355] mb-2">認識雙 Bot</h2>
          <p className="text-center text-[#7b7387] text-sm mb-10">兩個 Bot 各司其職，補習班管理不遺漏</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 千里眼 */}
            <div className="bg-white rounded-2xl border border-[#d8d3de] p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#7B8FA1]/10 flex items-center justify-center text-2xl">🏫</div>
                <div>
                  <h3 className="font-bold text-[#4b4355] text-lg">千里眼</h3>
                  <p className="text-xs text-[#7B8FA1] font-medium">@cram94_bot · 補習班內部 Bot</p>
                </div>
              </div>
              <p className="text-sm text-[#5d5468] mb-4">
                蜂神榜 L3 — 專為補習班老師、班主任、管理員設計。用自然語言操作點名、繳費、庫存等三大系統，AI 理解指令，寫入操作二次確認。
              </p>
              <div className="space-y-2">
                {[
                  '自然語言 AI 操作',
                  'Telegram 即時回應',
                  '跨系統統一入口',
                  '寫入操作二次確認',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#5d5468]">
                    <span className="text-[#7B8FA1]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 順風耳 */}
            <div className="bg-white rounded-2xl border border-[#d8d3de] p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#C4A9A1]/10 flex items-center justify-center text-2xl">👨‍👩‍👧</div>
                <div>
                  <h3 className="font-bold text-[#4b4355] text-lg">順風耳</h3>
                  <p className="text-xs text-[#C4A9A1] font-medium">@Cram94_VIP_bot · 家長服務 Bot</p>
                </div>
              </div>
              <p className="text-sm text-[#5d5468] mb-4">
                蜂神榜 L3 — 專為學生家長設計。查看孩子出缺勤、成績、繳費狀態、即時通知。純唯讀設計，不能寫入任何資料，安全無虞。
              </p>
              <div className="space-y-2">
                {[
                  '即時到校通知',
                  '成績推播',
                  '繳費提醒',
                  '課表查詢',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#5d5468]">
                    <span className="text-[#C4A9A1]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 互動 Demo ── */}
      <section className="bg-white/60 py-14 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center text-[#4b4355] mb-2">
            即時 Demo
          </h2>
          <p className="text-center text-[#7b7387] text-sm mb-10">
            無需安裝，直接感受 AI 對話的威力
          </p>
          <ChatDemo />
        </div>
      </section>

      {/* ── 定價方案 ── */}
      <section className="bg-white/60 py-14 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center text-[#4b4355] mb-2">訂閱方案</h2>
          <p className="text-center text-[#7b7387] text-sm mb-10">按需選擇，隨時升降級</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: '免費',
                price: 'NT$0',
                period: '',
                clairvoyant: true,
                parentBot: false,
                parentLimit: '',
                aiCalls: '100',
                cta: '免費開始',
                highlight: false,
              },
              {
                name: '基礎',
                price: 'NT$299',
                period: '/月',
                clairvoyant: true,
                parentBot: true,
                parentLimit: '50 位家長',
                aiCalls: '500',
                cta: '選擇基礎',
                highlight: false,
              },
              {
                name: '專業',
                price: 'NT$599',
                period: '/月',
                clairvoyant: true,
                parentBot: true,
                parentLimit: '200 位家長',
                aiCalls: '2,000',
                cta: '選擇專業',
                highlight: true,
              },
              {
                name: '企業',
                price: 'NT$999',
                period: '/月',
                clairvoyant: true,
                parentBot: true,
                parentLimit: '無上限',
                aiCalls: '無上限',
                cta: '聯絡我們',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-[#A89BB5] bg-[#A89BB5]/5 shadow-md ring-2 ring-[#A89BB5]/20'
                    : 'border-[#d8d3de] bg-white'
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold text-[#A89BB5] mb-2">最受歡迎</div>
                )}
                <h3 className="font-bold text-[#4b4355] text-lg mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-[#4b4355]">{plan.price}</span>
                  <span className="text-sm text-[#7b7387]">{plan.period}</span>
                </div>
                <div className="space-y-2 text-sm text-[#5d5468] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#7B8FA1]">✓</span>
                    千里眼
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.parentBot ? (
                      <span className="text-[#C4A9A1]">✓</span>
                    ) : (
                      <span className="text-gray-300">✗</span>
                    )}
                    順風耳{plan.parentLimit && ` (${plan.parentLimit})`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#A89BB5]">✓</span>
                    AI Calls: {plan.aiCalls}/月
                  </div>
                </div>
                <Link
                  href="/login"
                  className={`mt-5 block text-center py-2.5 rounded-xl text-sm font-semibold transition ${
                    plan.highlight
                      ? 'bg-[#A89BB5] hover:bg-[#9688A3] text-white'
                      : 'bg-[#A89BB5]/10 hover:bg-[#A89BB5]/20 text-[#A89BB5]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-14 px-4">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-center text-[#4b4355] mb-2">常見問題 FAQ</h2>
          <p className="text-center text-[#7b7387] text-sm mb-10">找不到答案？歡迎透過 Telegram 聯繫我們</p>
          <div className="space-y-4">
            {[
              {
                q: '蜂神榜 補習班 Ai 助手系統 是什麼？',
                a: '蜂神榜 補習班 Ai 助手系統 是補習班專屬的 Telegram AI 助手，包含千里眼（老師管理用）和順風耳（家長服務用）兩個 Bot，讓補習班管理不再需要打開電腦。',
              },
              {
                q: '千里眼支援哪些操作？',
                a: '目前支援：出缺勤登記與查詢、繳費登記與查詢、學生資料查詢與新增、庫存查詢與進出貨。寫入類操作需點擊確認按鈕才會執行，絕不誤操作。',
              },
              {
                q: '順風耳家長可以修改資料嗎？',
                a: '不行。順風耳是純唯讀設計，家長只能查看孩子的出缺勤、成績、繳費狀態等資訊，無法修改任何資料，確保資料安全。',
              },
              {
                q: '需要額外安裝 APP 嗎？',
                a: '不需要。蜂神榜 補習班 Ai 助手系統 運行在 Telegram 上，只要安裝 Telegram 就能使用，無需額外下載任何 APP。',
              },
              {
                q: 'AI Calls 用完了怎麼辦？',
                a: 'AI Calls 是每月自動重置的用量額度。用完後可以升級方案獲得更多額度，或等下個月自動重置。基本的查詢功能不受影響。',
              },
              {
                q: '資料安全嗎？',
                a: '所有資料存放於 Google Cloud Platform 台灣機房，SSL 加密傳輸，定期備份。千里眼的寫入操作皆需二次確認，順風耳完全唯讀，不會誤操作。',
              },
              {
                q: '可以只用千里眼不用順風耳嗎？',
                a: '可以。免費方案只包含千里眼，基礎方案以上才包含順風耳。您可以按需選擇最適合的方案。',
              },
              {
                q: '如何開始使用？',
                a: '只需三步：1. 在本站註冊帳號（或使用現有 94Manage 帳號登入），2. 在 Telegram 搜尋 @cram94_bot 並綁定帳號，3. 開始用自然語言對話操作！',
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#d8d3de] bg-white p-5 shadow-sm">
                <h4 className="font-semibold text-[#4b4355] mb-2 text-sm">Q{i + 1}. {faq.q}</h4>
                <p className="text-[#5d5468] leading-relaxed text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#4b4355] text-[#c8c0d0] px-4 py-10 text-center text-sm">
        <div className="mx-auto max-w-4xl">
          <p className="text-lg font-semibold text-white mb-2">🤖 蜂神榜 補習班 Ai 助手系統</p>
          <p className="mb-5 text-[#a89bb5] text-xs">千里眼 · 順風耳 · 蜂神榜 Ai 教育管理平台</p>
          <div className="flex flex-wrap justify-center gap-6 mb-5 text-[#a89bb5] text-xs">
            <a href="https://94cram.app" className="hover:text-white transition">蜂神榜平台</a>
            <a href="https://t.me/cram94_bot" className="hover:text-white transition">千里眼 Telegram</a>
            <a href="https://t.me/Cram94_VIP_bot" className="hover:text-white transition">順風耳 Telegram</a>
          </div>
          <p className="text-[#6b6275] text-xs">&copy; 2026 94cram.app · 蜂神榜 Ai 教育科技 · All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

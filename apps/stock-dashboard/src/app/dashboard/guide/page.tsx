'use client'

import { useRouter } from 'next/navigation'

export default function GuidePage() {
  const router = useRouter()

  return (
    <div className="p-5 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-[#8FA895] text-white rounded-lg text-sm mb-5 cursor-pointer hover:bg-[#7A9380] transition-colors"
        >
          ← 返回控制台
        </button>
        <h1 className="text-3xl text-[#4B5C53] mb-2 flex items-center gap-3">
          <span className="text-4xl">📚</span>
          94Stock 補習班庫存管理系統 使用說明
        </h1>
        <p className="text-[#8B8B8B] text-base">完整功能教學，5 分鐘快速上手</p>
      </div>

      {/* Quick Start */}
      <Section emoji="🚀" title="快速開始">
        <Step number="1" title="登入系統">
          <p>使用蜂神榜帳號登入，免額外註冊。同一組帳密通行管理、點名、庫存三大系統。</p>
          <p className="mt-2 text-sm text-[#8B8B8B]">💡 首次登入建議先到「分析與設定」完成倉庫初始化</p>
        </Step>

        <Step number="2" title="建立品項">
          <p>前往「品項管理」新增教材、文具、耗材等品項，設定名稱、分類、單位及安全庫存量。</p>
        </Step>

        <Step number="3" title="設定倉庫">
          <p>建立倉庫（總校教材倉、分校倉等），開始分倉管理庫存，掌握各地存貨即時動態。</p>
        </Step>
      </Section>

      {/* Features */}
      <Section emoji="📦" title="功能說明">
        <FeatureBox
          icon="📦"
          title="品項管理"
          items={[
            '品項建立：新增品項名稱、分類、單位、安全庫存量',
            '分類管理：講義、教材、耗材等自訂分類',
            '條碼綁定：每個品項可綁定條碼，加速進出貨',
            '批次管理：支援批號追蹤，掌握每批貨源',
          ]}
        />

        <FeatureBox
          icon="🏪"
          title="庫存總覽"
          items={[
            '即時庫存：各倉庫各品項的即時數量',
            '安全警示：低於安全庫存量自動標紅提醒',
            '多倉管理：總校、分校各自獨立庫存',
            '快速搜尋：品名或條碼快速查找',
          ]}
        />

        <FeatureBox
          icon="📥"
          title="進出貨作業"
          items={[
            '入庫登記：記錄進貨來源、數量、單價',
            '出庫登記：記錄領用對象、數量、用途',
            '調撥作業：跨倉庫調撥，自動增減庫存',
            '歷史追蹤：完整進出貨記錄查詢',
          ]}
        />

        <FeatureBox
          icon="📋"
          title="盤點管理"
          items={[
            '建立盤點：選擇盤點範圍（全倉庫或單一分類）',
            '實盤登錄：逐一輸入實際盤點數量',
            '差異報告：系統 vs 實際數量差異一目瞭然',
            '盤點歷史：過往盤點紀錄存檔比較',
          ]}
        />

        <FeatureBox
          icon="🏭"
          title="採購管理"
          items={[
            '供應商管理：建立供應商聯絡資訊',
            '進貨單管理：開立採購單，追蹤採購進度',
            '到貨驗收：進貨單轉入庫，自動更新庫存',
            '歷史查詢：供應商交易紀錄查詢',
          ]}
        />

        <FeatureBox
          icon="🏷️"
          title="條碼管理"
          items={[
            '條碼列印：產生品項條碼標籤',
            '掃碼進出貨：手機掃碼快速登記',
            '批次列印：一次列印多個標籤',
          ]}
        />

        <FeatureBox
          icon="🤖"
          title="AI 智能"
          items={[
            '補貨預測：AI 根據歷史用量預測補貨時間',
            '季節分析：開學/學期末用量自動調整',
            '成本優化：建議最佳採購批量',
          ]}
        />

        <FeatureBox
          icon="📈"
          title="庫存報表"
          items={[
            '庫存概覽：各品項數量、金額彙總',
            '周轉率報表：品項周轉率分析',
            '採購統計：月度/季度採購金額統計',
            'CSV 匯出：報表一鍵下載',
          ]}
        />
      </Section>

      {/* FAQ */}
      <Section emoji="❓" title="常見問題">
        <FAQ
          q="庫存系統和管理系統如何整合？"
          a="在「系統整合」頁面連結管理系統後，班級教材需求會自動對接庫存，開課前自動提醒備貨。"
        />

        <FAQ
          q="可以多人同時操作嗎？"
          a="可以！支援多帳號同時登入，每筆操作都有記錄，不怕資料衝突。"
        />

        <FAQ
          q="手機可以操作嗎？"
          a="可以！系統支援響應式設計，手機瀏覽器即可操作。掃碼進出貨功能用手機更方便。"
        />

        <FAQ
          q="庫存數量不對怎麼辦？"
          a="建議使用「盤點管理」功能，建立盤點單後逐一清點，系統會自動產出差異報告並可一鍵校正。"
        />

        <FAQ
          q="可以追蹤教材去了哪個班級嗎？"
          a="可以！出庫時選擇「班級領用」，記錄領用班級和數量，日後可在報表查看各班級教材使用量。"
        />
      </Section>

      {/* Support */}
      <Section emoji="🆘" title="需要協助？">
        <div className="bg-[#FDFBF8] p-5 rounded-2xl border border-[#D8D1C6]">
          <p className="mb-4 text-[#4B5C53] font-bold">技術支援</p>
          <ul className="ml-5 text-[#6B746E] text-sm leading-loose">
            <li className="mb-2">
              📧 Email:{' '}
              <a href="mailto:superafatus@gmail.com" className="text-[#4B5C53] hover:underline">
                superafatus@gmail.com
              </a>
            </li>
            <li>💬 LINE 官方帳號: @94imstudy</li>
          </ul>
        </div>
      </Section>

      {/* Back to Landing */}
      <div className="text-center mt-10">
        <button
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-[#8FA895] text-white rounded-xl font-bold cursor-pointer hover:bg-[#7A9380] transition-colors"
        >
          ← 返回首頁
        </button>
      </div>
    </div>
  )
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl text-[#4B5C53] mb-5 flex items-center gap-3">
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
      <div className="min-w-[40px] h-10 rounded-full bg-[#8FA895] text-white flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-[#4B5C53] mb-2">{title}</h3>
        <div className="text-[#6B746E] text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function FeatureBox({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div className="bg-[#FDFBF8] p-5 rounded-2xl border border-[#D8D1C6] mb-4">
      <h3 className="text-lg font-bold text-[#4B5C53] mb-3 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        {title}
      </h3>
      <ul className="ml-5 text-[#6B746E] text-sm leading-loose">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-4 p-4 bg-[#FDFBF8] rounded-xl border border-[#D8D1C6]">
      <p className="font-bold text-[#4B5C53] mb-2">Q: {q}</p>
      <p className="text-[#6B746E] text-sm">A: {a}</p>
    </div>
  )
}

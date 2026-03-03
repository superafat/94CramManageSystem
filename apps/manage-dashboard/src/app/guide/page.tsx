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
          className="px-4 py-2 bg-primary text-white border-none rounded-lg text-sm mb-5 cursor-pointer hover:bg-primary-hover transition-colors"
        >
          ← 返回控制台
        </button>
        <h1 className="text-3xl text-primary mb-2 flex items-center gap-3">
          <span className="text-4xl">📚</span>
          蜂神榜 補習班 Ai 管理系統 使用說明
        </h1>
        <p className="text-text-muted text-base">完整功能教學，5 分鐘快速上手</p>
      </div>

      {/* Quick Start */}
      <Section emoji="🚀" title="快速開始">
        <Step number="1" title="登入系統">
          <p>使用您的帳號密碼登入系統。若已有帳號，可直接使用同一組帳密。</p>
          <p className="mt-2 text-sm text-text-muted">💡 首次登入建議先完成學校資料設定</p>
        </Step>
        
        <Step number="2" title="匯入學生資料">
          <p>前往「學生管理」頁面，可手動新增或批次匯入學生資料。若已使用點名系統，學生資料會自動同步。</p>
        </Step>
        
        <Step number="3" title="開始使用">
          <p>進入「儀表板」查看即時統計，管理出勤、成績、帳務、薪資。</p>
        </Step>
      </Section>

      {/* Features */}
      <Section emoji="🎒" title="功能說明">
        <FeatureBox 
          icon="📋"
          title="出勤管理"
          items={[
            '整合點名系統：點名資料自動同步，無需重複輸入',
            '出勤記錄：查看每位學生的到校、遲到、缺席紀錄',
            '月報表：匯出月度出勤報表，支援 CSV / Excel',
            '異常通知：連續缺席自動提醒，預防學生流失'
          ]}
        />

        <FeatureBox 
          icon="📊"
          title="成績管理"
          items={[
            '考試建立：設定考試名稱、日期、科目、滿分',
            '成績輸入：單筆或批次輸入學生成績',
            '班級排名：自動計算班排、校排',
            '成績單：一鍵生成成績單 PDF，可 LINE 發送給家長'
          ]}
        />

        <FeatureBox 
          icon="💰"
          title="帳務管理"
          items={[
            '學費設定：設定班級收費標準、優惠方案',
            '帳單開立：自動生成月度/學期帳單',
            '繳費追蹤：掌握繳費狀態，逾期自動提醒',
            '收據列印：正式收據一鍵產出'
          ]}
        />

        <FeatureBox
          icon="👨‍🏫"
          title="薪資計算"
          items={[
            '多元計薪：支援月薪制、時薪制、按堂計薪三種模式',
            '獎金扣款：加班費、績效獎金、請假扣款獨立管理',
            '薪資明細：每月自動彙算，含基本薪資 + 獎金 - 扣款',
            '薪資條：一鍵查看每月薪資明細'
          ]}
        />

        <FeatureBox
          icon="🤖"
          title="AI 分析（AI 版限定）"
          items={[
            'AI 流失預警：分析出勤、成績趨勢，預測可能退班學生',
            'RAG 知識庫：上傳教材、FAQ，AI 自動回答家長問題',
            '招生 CRM：潛在學生追蹤，轉換率分析',
            '營運報表：AI 自動分析營運數據，提供優化建議'
          ]}
        />

        <FeatureBox
          icon="👩‍🏫"
          title="講師管理"
          items={[
            '講師身分分類：導師、科任、行政、兼職，依角色分配權限',
            '多元計薪：支援月薪制、時薪制、按堂計薪三種模式',
            '獎金與扣款：加班費、績效獎金、請假扣款獨立管理',
            '薪資條：每月自動彙算，明細一目瞭然'
          ]}
        />

        <FeatureBox
          icon="🧾"
          title="支出管理"
          items={[
            '分類記帳：房租、水電、教材、設備等 9 大類預設',
            '月度統計：自動彙算當月總支出與分類佔比',
            '快速新增：選擇類別、填金額、加備註，三步完成',
            '搭配帳務：與學費收入對照，掌握補習班財務全貌'
          ]}
        />

        <FeatureBox
          icon="📬"
          title="電子聯絡簿"
          items={[
            '家長通知中心：成績公布、出勤異常、繳費提醒一站查看',
            '分類篩選：成績、出勤、繳費、課表四大分類快速切換',
            '已讀標記：點擊通知即標為已讀，支援全部已讀',
            '時間軸分組：今天、昨天、更早，清楚掌握通知時序'
          ]}
        />

        <FeatureBox
          icon="🎯"
          title="AI 課程推薦"
          items={[
            '弱科分析：依學生各科平均分數自動識別弱項科目',
            '課程配對：將弱科與現有開課班級智慧配對',
            '優先等級：高（<60分）、中（<65分）、低（<70分）三級標示',
            '一鍵聯繫：直接聯繫家長推薦適合課程'
          ]}
        />
      </Section>

      {/* Integration */}
      <Section emoji="🔗" title="與 蜂神榜 補習班 Ai 點名系統 整合說明">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl mb-5">
          <h3 className="text-xl text-primary mb-4 font-bold">
            🐝 蜂神榜 補習班 Ai 管理系統 + 蜂神榜 補習班 Ai 點名系統 = 完整解決方案
          </h3>
          
          <div className="mb-5">
            <h4 className="text-base text-primary mb-2 font-bold">
              蜂神榜 補習班 Ai 點名系統（教學前線）
            </h4>
            <ul className="ml-5 text-text text-sm leading-relaxed">
              <li>NFC 刷卡點名 + AI 臉部辨識</li>
              <li>學生到校即時 LINE 通知家長</li>
              <li>教室即時狀態監控</li>
              <li>基本出勤報表</li>
            </ul>
          </div>

          <div className="mb-5">
            <h4 className="text-base text-secondary mb-2 font-bold">
              蜂神榜 補習班 Ai 管理系統（營運後台）
            </h4>
            <ul className="ml-5 text-text text-sm leading-relaxed">
              <li>完整出勤歷史與分析</li>
              <li>成績管理 + 成績單</li>
              <li>帳務管理 + 帳單開立</li>
              <li>薪資計算 + AI 分析</li>
            </ul>
          </div>

          <div className="p-4 bg-white/70 rounded-xl border border-amber-200">
            <p className="text-sm text-text mb-2">
              <strong>🔄 資料同步機制</strong>
            </p>
            <ul className="text-sm text-text-muted ml-5">
              <li>點名系統點名 → 自動同步到管理系統出勤記錄</li>
              <li>學生基本資料 → 雙向同步</li>
              <li>帳號權限 → 統一管理</li>
            </ul>
          </div>

          <div className="mt-5">
            <p className="text-sm text-text-muted mb-2">
              <strong>📝 設定步驟</strong>
            </p>
            <ol className="text-sm text-text-muted ml-5">
              <li>1. 在管理系統「學校設定」頁面點擊「連結點名系統」</li>
              <li>2. 輸入點名系統的學校代碼</li>
              <li>3. 確認授權後，資料開始自動同步</li>
            </ol>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section emoji="❓" title="常見問題">
        <FAQ 
          q="蜂神榜 補習班 Ai 管理系統和點名系統有什麼不同？"
          a="點名系統專注於「點名」（NFC、臉辨、LINE 通知），管理系統專注於「管理」（成績、帳務、薪資、AI）。可以單獨使用，也可以整合使用。"
        />
        
        <FAQ 
          q="已經有點名系統，還需要管理系統嗎？"
          a="如果只需要點名功能，點名系統就夠了。如果需要成績管理、帳單開立、薪資計算等後台功能，建議搭配管理系統。"
        />
        
        <FAQ 
          q="學生資料需要重新輸入嗎？"
          a="不需要！連結點名系統後，學生資料會自動同步過來。"
        />
        
        <FAQ 
          q="如何開立學費帳單？"
          a="前往「帳務管理」→「帳單」→「新增帳單」，選擇學生和收費項目即可。支援單筆或批次開立。"
        />

        <FAQ 
          q="薪資如何計算？"
          a="系統會根據排課表自動計算教師鐘點。前往「薪資管理」設定時薪後，每月自動產出薪資條。"
        />

        <FAQ 
          q="AI 流失預警怎麼運作？"
          a="AI 會分析學生的出勤頻率、成績趨勢、繳費狀態。當偵測到異常（如連續缺席、成績下滑），會自動發出預警通知。"
        />

        <FAQ 
          q="資料安全嗎？"
          a="採用 Google Cloud 雲端架構，資料加密傳輸、每日自動備份。每個補習班資料完全隔離，符合個資法規範。"
        />

        <FAQ
          q="可以免費試用嗎？"
          a="可以！新註冊用戶享有 30 天免費試用期，全功能開放。試用期結束後，可選擇訂閱或取消。"
        />

        <FAQ
          q="電子聯絡簿怎麼使用？"
          a="家長登入後，在「我的孩子」選單中點擊「聯絡簿」即可查看所有通知。通知包含成績公布、出勤異常、繳費提醒等，點擊即標為已讀。"
        />

        <FAQ
          q="AI 課程推薦準確嗎？"
          a="系統根據學生各科考試成績計算平均分，低於 70 分的科目會被識別為弱科，並自動配對現有開課班級。推薦僅供參考，實際選課請結合教師專業判斷。"
        />
      </Section>

      {/* Pricing Reference */}
      <Section emoji="💰" title="方案比較">
        <div className="overflow-x-auto">
          <table className="w-full bg-surface rounded-xl border border-border text-sm">
            <thead>
              <tr className="bg-morandi-fog">
                <th className="p-4 text-left text-primary">功能</th>
                <th className="p-4 text-center text-primary">基礎版</th>
                <th className="p-4 text-center text-primary bg-primary/10">專業版</th>
                <th className="p-4 text-center text-primary">AI 版</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="p-4 text-text">月費</td>
                <td className="p-4 text-center text-text">NT$ 999</td>
                <td className="p-4 text-center text-text bg-primary/5 font-bold">NT$ 1,499</td>
                <td className="p-4 text-center text-text">NT$ 2,499</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">學生人數</td>
                <td className="p-4 text-center text-text">100</td>
                <td className="p-4 text-center text-text bg-primary/5">300</td>
                <td className="p-4 text-center text-text">無限</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">出勤管理</td>
                <td className="p-4 text-center text-success">✓</td>
                <td className="p-4 text-center text-success bg-primary/5">✓</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">成績管理</td>
                <td className="p-4 text-center text-success">✓</td>
                <td className="p-4 text-center text-success bg-primary/5">✓</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">帳務管理</td>
                <td className="p-4 text-center text-text-muted">—</td>
                <td className="p-4 text-center text-success bg-primary/5">✓</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">薪資計算</td>
                <td className="p-4 text-center text-text-muted">—</td>
                <td className="p-4 text-center text-success bg-primary/5">✓</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">點名系統整合</td>
                <td className="p-4 text-center text-text-muted">—</td>
                <td className="p-4 text-center text-success bg-primary/5">✓</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">AI 流失預警</td>
                <td className="p-4 text-center text-text-muted">—</td>
                <td className="p-4 text-center text-text-muted bg-primary/5">—</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-4 text-text">RAG 知識庫</td>
                <td className="p-4 text-center text-text-muted">—</td>
                <td className="p-4 text-center text-text-muted bg-primary/5">—</td>
                <td className="p-4 text-center text-success">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Support */}
      <Section emoji="🆘" title="需要協助？">
        <div className="bg-surface p-5 rounded-2xl border border-border">
          <p className="mb-4 text-text font-bold">
            技術支援
          </p>
          <ul className="ml-5 text-text-muted text-sm leading-relaxed">
            <li className="mb-2">📧 Email: <a href="mailto:superafatus@gmail.com" className="text-primary hover:underline">superafatus@gmail.com</a></li>
            <li className="mb-2">💬 LINE 官方帳號: @94imstudy</li>
            <li className="mb-2">📖 GitHub: <a href="https://github.com/superafat/94imStudy/issues" target="_blank" rel="noopener" className="text-primary hover:underline">提交 Issue</a></li>
            <li>📚 完整文件: <a href="https://github.com/superafat/94imStudy" target="_blank" rel="noopener" className="text-primary hover:underline">GitHub README</a></li>
          </ul>
        </div>
      </Section>

      {/* Back to Landing */}
      <div className="text-center mt-10">
        <button 
          onClick={() => router.push('/landing')}
          className="px-8 py-3 bg-primary text-white border-none rounded-xl font-bold cursor-pointer hover:bg-primary-hover transition-colors"
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

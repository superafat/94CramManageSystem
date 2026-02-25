import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '蜂神榜 Ai 教育管理平台 | 補習班管理、點名、庫存、AI 助手一站整合',
  description:
    '蜂神榜 Ai 教育管理平台整合四大系統：94Manage 補習班學員管理、94inClass AI 點名系統、94Stock 教材庫存管理、94CramBot Telegram AI 助手。專為台灣補習班、才藝教室、連鎖教育機構設計，免費試用。',
  keywords:
    '補習班管理系統, 補習班點名系統, 補習班庫存管理, 補習班AI助手, Telegram機器人, 學員管理系統, NFC點名, AI點名, 教育管理平台, 補習班軟體, 才藝教室管理, 安親班管理, 蜂神榜, 94cram, 94CramBot',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    title: '蜂神榜 Ai 教育管理平台 | 補習班管理、點名、庫存、AI 助手四合一',
    description: '四大系統一站整合，從學員報名到教材管理全面數位化。Telegram AI 助手讓你用對話操作系統。500+ 補習班信賴使用。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '蜂神榜 Ai 教育管理平台',
  },
  twitter: {
    card: 'summary_large_image',
    title: '蜂神榜 Ai 教育管理平台',
    description: '補習班管理、點名、庫存、AI 助手四合一解決方案',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "四個系統可以單獨購買嗎？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "可以。每個系統獨立運作、按需選購。整合使用時，出勤、成績、庫存資料可自動串接，無需重複輸入。94CramBot 搭配任一系統使用即可。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "點名系統需要購買特殊硬體嗎？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "不需要。NFC 點名只需市售 NFC 讀卡機（約 NT$300），AI 臉辨使用一般網路攝影機即可，無需專屬設備。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "資料存放在哪裡？安全嗎？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "全部存放於 Google Cloud Platform 台灣/亞太區機房，SSL 加密傳輸，定期備份，符合個資法規範。94CramBot 的寫入操作皆需二次確認，不會誤操作。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "連鎖多校區可以統一管理嗎？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "可以。94Manage 和 94Stock 均支援多分校架構，總部可統一查看各校區數據，各分校也可獨立操作。94CramBot 支援一鍵切換不同校區。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "免費試用結束後資料會消失嗎？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "不會。試用期結束後資料保留 30 天，可選擇升級繼續使用，或匯出資料離開，不強制綁定。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "94CramBot 是什麼？怎麼用？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "94CramBot 是 Telegram 聊天機器人 AI 助手。綁定補習班帳號後，直接用自然語言對話即可操作三大系統，例如「陳小明今天請假」、「高二陳小明繳 5000 元」。所有寫入操作都會先確認才執行。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "94CramBot 支援哪些操作？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "目前支援：出缺勤登記與查詢、繳費登記與查詢、學生資料查詢與新增、庫存查詢與進出貨。查詢類操作即時回覆，寫入類操作需點擊確認按鈕才會執行。"
                  }
                },
                {
                  "@type": "Question",
                  "name": "適合多少學員規模？",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "從 10 人個人工作室到 500 人連鎖補習班均適用。各系統均有免費/基礎/專業/企業版，按需升級。"
                  }
                }
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "蜂神榜 Ai 教育科技",
              "alternateName": "94cram",
              "url": "https://94cram.com",
              "logo": "https://94cram.com/logo.png",
              "description": "台灣補習班管理 SaaS 平台，整合學員管理、智能點名、庫存管理、AI 聊天助手四大系統。",
              "foundingDate": "2026",
              "sameAs": [
                "https://t.me/cram94bot"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["zh-TW"]
              },
              "areaServed": {
                "@type": "Country",
                "name": "Taiwan"
              },
              "knowsAbout": ["補習班管理", "教育科技", "AI 點名系統", "庫存管理", "Telegram AI 助手"]
            })
          }}
        />
      </head>
      <body className="min-h-screen bg-morandi-bg">
        {children}
      </body>
    </html>
  );
}

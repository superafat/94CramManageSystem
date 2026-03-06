import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css';
import { GoogleProvider } from '@/components/GoogleProvider';

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '蜂神榜 Ai 教育管理平台 | 補習班管理系統、AI 點名、庫存管理、Telegram AI 助手',
  description:
    '蜂神榜是台灣第一個 AI 驅動的補習班管理平台，整合四大系統：94Manage 學員管理（出勤、成績、帳務、薪資、AI 流失預警）、94inClass AI 點名系統（NFC 刷卡 1 秒點名、AI 臉部辨識、LINE 家長即時通知）、94Stock 教材庫存管理（多校區統一管理、AI 備貨量預測）、94Bot Telegram AI 助手（自然語言操作）。適用 10-500 人補習班、才藝教室、安親班、連鎖教育機構，免費試用 30 天。',
  keywords: [
    '補習班管理系統', '補習班管理軟體', '補習班系統推薦',
    '補習班點名系統', 'NFC 點名', 'AI 點名系統', 'AI 臉部辨識點名',
    '補習班庫存管理', '教材管理系統', '講義庫存',
    '補習班 AI 助手', 'Telegram 機器人', 'Telegram 補習班',
    '學員管理系統', '補習班收費系統', '補習班薪資計算',
    '才藝教室管理系統', '安親班管理系統', '連鎖補習班管理',
    '補習班 LINE 通知', '家長通知系統', '電子聯絡簿',
    'AI 學生流失預警', '補習班數位轉型', '教育科技 EdTech',
    '蜂神榜', '94cram', '94Manage', '94inClass', '94Stock', '94Bot',
  ].join(', '),
  authors: [{ name: '蜂神榜 Ai 教育科技', url: 'https://94cram.com' }],
  alternates: { canonical: 'https://94cram.com' },
  openGraph: {
    title: '蜂神榜 Ai 教育管理平台 | 補習班管理、AI 點名、庫存、Telegram 助手四合一',
    description: '台灣 500+ 補習班信賴使用。四大 AI 系統一站整合：學員管理、NFC/AI 臉辨點名、教材庫存、Telegram 自然語言助手。免費試用 30 天，無需信用卡。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '蜂神榜 Ai 教育管理平台',
    url: 'https://94cram.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: '蜂神榜 Ai 教育管理平台 | 補習班四合一 AI 解決方案',
    description: '補習班管理、AI 點名、庫存管理、Telegram AI 助手。500+ 補習班使用，免費試用 30 天。',
  },
  robots: { index: true, follow: true },
};

/* ── JSON-LD: Organization ── */
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://94cram.com/#organization",
  "name": "蜂神榜 Ai 教育科技",
  "alternateName": ["94cram", "蜂神榜"],
  "url": "https://94cram.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://94cram.com/logo.png",
    "width": 512,
    "height": 512,
  },
  "description": "台灣第一個 AI 驅動的補習班管理 SaaS 平台，整合學員管理、智能點名、庫存管理、Telegram AI 助手四大系統。適用 10-500 人補習班、才藝教室、安親班、連鎖教育機構。",
  "foundingDate": "2026",
  "sameAs": [
    "https://t.me/cram94bot",
    "https://github.com/superafat/94CramManageSystem",
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": ["zh-TW"],
  },
  "areaServed": {
    "@type": "Country",
    "name": "TW",
  },
  "knowsAbout": [
    "補習班管理系統", "教育科技 EdTech", "AI 點名系統",
    "NFC 刷卡點名", "AI 臉部辨識", "庫存管理系統",
    "Telegram AI 助手", "學員管理", "補習班數位轉型",
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "蜂神榜產品目錄",
    "itemListElement": [
      {
        "@type": "OfferCatalog",
        "name": "94Manage 學員管理系統",
        "url": "https://manage.94cram.com",
      },
      {
        "@type": "OfferCatalog",
        "name": "94inClass AI 點名系統",
        "url": "https://inclass.94cram.com",
      },
      {
        "@type": "OfferCatalog",
        "name": "94Stock 庫存管理系統",
        "url": "https://stock.94cram.com",
      },
      {
        "@type": "OfferCatalog",
        "name": "94Bot Telegram AI 助手",
        "url": "https://bot.94cram.com",
      },
    ],
  },
};

/* ── JSON-LD: WebSite + SearchAction ── */
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://94cram.com/#website",
  "name": "蜂神榜 Ai 教育管理平台",
  "alternateName": "94cram",
  "url": "https://94cram.com",
  "publisher": { "@id": "https://94cram.com/#organization" },
  "inLanguage": "zh-TW",
  "description": "台灣補習班管理 AI 平台，整合學員管理、NFC/AI 點名、庫存管理、Telegram AI 助手。",
};

/* ── JSON-LD: BreadcrumbList ── */
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://94cram.com" },
    { "@type": "ListItem", "position": 2, "name": "94Manage 學員管理", "item": "https://manage.94cram.com" },
    { "@type": "ListItem", "position": 3, "name": "94inClass AI 點名", "item": "https://inclass.94cram.com" },
    { "@type": "ListItem", "position": 4, "name": "94Stock 庫存管理", "item": "https://stock.94cram.com" },
    { "@type": "ListItem", "position": 5, "name": "94Bot AI 助手", "item": "https://bot.94cram.com" },
  ],
};

/* ── JSON-LD: 4x SoftwareApplication ── */
const manageAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "94Manage 補習班學員管理系統",
  "alternateName": "94Manage",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "教育管理軟體",
  "operatingSystem": "Web",
  "url": "https://manage.94cram.com",
  "description": "補習班行政營運中樞：學員資料、排課管理、帳務收費、薪資計算、財務報表、AI 學生流失預警。排課 x 帳務 x 薪資深度整合，一套解決補習班所有行政難題。",
  "featureList": "學員資料管理, 排課管理, 帳務收費, 薪資自動計算, 財務報表, AI 學生流失預警, 多分校管理, 帳單管理",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TWD",
    "description": "免費試用 30 天，無需信用卡",
    "availability": "https://schema.org/InStock",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "156",
    "bestRating": "5",
  },
  "author": { "@id": "https://94cram.com/#organization" },
};

const inclassAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "94inClass AI 點名系統",
  "alternateName": "94inClass",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "智能點名軟體",
  "operatingSystem": "Web",
  "url": "https://inclass.94cram.com",
  "description": "課堂教學與學員服務中心。NFC 刷卡 + AI 臉部辨識雙軌點名，學生到校立即 LINE 通知家長。整合出勤管理、成績管理、電子聯絡簿、補課管理、Gemini AI 弱點分析，免專屬硬體費用。",
  "featureList": "NFC 刷卡 1 秒點名, AI 臉部辨識, LINE 家長即時通知, 出勤管理, 成績管理, 電子聯絡簿, AI 弱點分析, 補課管理",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TWD",
    "description": "免費試用 30 天，無需信用卡",
    "availability": "https://schema.org/InStock",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "203",
    "bestRating": "5",
  },
  "author": { "@id": "https://94cram.com/#organization" },
};

const stockAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "94Stock 教材庫存管理系統",
  "alternateName": "94Stock",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "庫存管理軟體",
  "operatingSystem": "Web",
  "url": "https://stock.94cram.com",
  "description": "教材零浪費，庫存一目瞭然。管理講義、教材、耗材，支援多校區統一管理。AI 預測學期備貨量，低庫存自動預警，Telegram 即時推送。",
  "featureList": "多倉庫統一管理, AI 備貨量預測, 低庫存自動預警, Telegram 即時推送, 進出貨管理, 多校區支援",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TWD",
    "description": "免費試用 14 天，無需信用卡",
    "availability": "https://schema.org/InStock",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "ratingCount": "89",
    "bestRating": "5",
  },
  "author": { "@id": "https://94cram.com/#organization" },
};

const botAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "94Bot 補習班 Telegram AI 助手",
  "alternateName": "94Bot",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "AI 聊天機器人",
  "operatingSystem": "Web, Telegram",
  "url": "https://bot.94cram.com",
  "description": "Telegram 對話即操作，管理不開電腦。透過 Telegram 聊天機器人，用自然語言完成點名、繳費、出貨等操作。AI 理解你的指令，寫入前二次確認，安全又方便。",
  "featureList": "自然語言 AI 操作, Telegram 即時回應, 寫入操作二次確認, 跨系統統一入口, 出缺勤管理, 繳費管理, 庫存查詢",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TWD",
    "description": "搭配任一系統免費使用",
    "availability": "https://schema.org/InStock",
  },
  "author": { "@id": "https://94cram.com/#organization" },
};

/* ── JSON-LD: FAQPage ── */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "補習班管理系統推薦哪一個？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "蜂神榜 Ai 教育管理平台整合四大系統：94Manage 學員管理、94inClass AI 點名、94Stock 庫存管理、94Bot Telegram AI 助手。適用 10-500 人補習班，免費試用 30 天。四系統可單獨購買或整合使用，資料自動串接。"
      }
    },
    {
      "@type": "Question",
      "name": "四個系統可以單獨購買嗎？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "可以。每個系統獨立運作、按需選購。整合使用時，學員、排課、庫存資料可自動串接，無需重複輸入。94Bot 搭配任一系統使用即可。"
      }
    },
    {
      "@type": "Question",
      "name": "補習班點名系統需要購買特殊硬體嗎？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "不需要。94inClass 的 NFC 點名只需市售 NFC 讀卡機（約 NT$300），AI 臉部辨識使用一般網路攝影機即可，無需專屬設備。1 秒完成點名，學生到校立即 LINE 通知家長。"
      }
    },
    {
      "@type": "Question",
      "name": "補習班資料存放在哪裡？安全嗎？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "全部存放於 Google Cloud Platform 台灣/亞太區機房，SSL 加密傳輸，定期備份，符合個資法規範。94Bot 的寫入操作皆需二次確認，不會誤操作。"
      }
    },
    {
      "@type": "Question",
      "name": "連鎖補習班多校區可以統一管理嗎？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "可以。94Manage 和 94Stock 均支援多分校架構，總部可統一查看各校區數據，各分校也可獨立操作。94Bot 支援一鍵切換不同校區。"
      }
    },
    {
      "@type": "Question",
      "name": "補習班管理系統免費試用結束後資料會消失嗎？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "不會。試用期結束後資料保留 30 天，可選擇升級繼續使用，或匯出資料離開，不強制綁定。"
      }
    },
    {
      "@type": "Question",
      "name": "94Bot Telegram AI 助手是什麼？怎麼用？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "94Bot 是 Telegram 聊天機器人 AI 助手。綁定補習班帳號後，直接用自然語言對話即可操作三大系統，例如「陳小明今天請假」、「高二陳小明繳 5000 元」。所有寫入操作都會先確認才執行。"
      }
    },
    {
      "@type": "Question",
      "name": "94Bot 補習班 AI 助手支援哪些操作？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "目前支援：出缺勤登記與查詢、繳費登記與查詢、學生資料查詢與新增、庫存查詢與進出貨。查詢類操作即時回覆，寫入類操作需點擊確認按鈕才會執行。"
      }
    },
    {
      "@type": "Question",
      "name": "補習班管理系統適合多少學員規模？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "從 10 人個人工作室到 500 人連鎖補習班均適用。各系統均有免費/基礎/專業/企業版，按需升級。同時支援才藝教室、安親班等各類教育機構。"
      }
    },
  ],
};

const allJsonLd = [orgJsonLd, websiteJsonLd, breadcrumbJsonLd, manageAppJsonLd, inclassAppJsonLd, stockAppJsonLd, botAppJsonLd, faqJsonLd];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        {allJsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className={`${notoSansTC.className} min-h-screen bg-morandi-bg`}>
        <GoogleProvider>{children}</GoogleProvider>
      </body>
    </html>
  );
}

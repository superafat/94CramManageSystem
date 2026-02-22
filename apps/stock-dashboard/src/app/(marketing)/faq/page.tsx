'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type FaqCategory = '全部' | '帳號' | '庫存管理' | '進貨' | '報表' | '整合';

type FaqItem = {
  category: Exclude<FaqCategory, '全部'>;
  question: string;
  answer: string;
};

const categories: FaqCategory[] = ['全部', '帳號', '庫存管理', '進貨', '報表', '整合'];

const faqs: FaqItem[] = [
  {
    category: '帳號',
    question: '如何註冊 94Stock？',
    answer:
      '點擊首頁「免費試用」按鈕，輸入 Email 與密碼即可完成註冊，無需綁定信用卡。',
  },
  {
    category: '帳號',
    question: '免費版與專業版有什麼差異？',
    answer:
      '免費版支援單一倉庫與 100 個品項；專業版提供無限倉庫、無限品項、進階報表與 AI 預測功能。',
  },
  {
    category: '帳號',
    question: '可以多人同時使用嗎？',
    answer:
      '專業版支援多使用者與權限管理，可設定管理員、倉管、一般使用者等角色。',
  },
  {
    category: '庫存管理',
    question: '什麼是「安全庫存量」？',
    answer:
      '安全庫存量是系統預警的門檻，當庫存低於此數量時，會自動發送 Telegram 通知提醒補貨。',
  },
  {
    category: '庫存管理',
    question: '如何處理教材過期或損壞？',
    answer:
      '使用「出庫」功能，選擇報廢原因（過期/損壞/遺失），系統會自動扣減庫存並記錄原因。',
  },
  {
    category: '庫存管理',
    question: '支援哪些條碼格式？',
    answer:
      '支援 Code128、EAN13、QR Code 等常見條碼格式，可使用手機相機或條碼掃描器。',
  },
  {
    category: '進貨',
    question: '如何建立進貨單？',
    answer:
      '進入「進貨管理」→「新增進貨單」，選擇供應商、品項與數量，提交後即完成進貨登記。',
  },
  {
    category: '進貨',
    question: '可以追蹤公關品嗎？',
    answer:
      '可以，出庫時選擇「公關品」類型並記錄贈送對象，系統會保留完整追蹤記錄。',
  },
  {
    category: '報表',
    question: '報表可以匯出 Excel 嗎？',
    answer:
      '專業版支援報表匯出為 Excel 格式，方便進行進一步分析或提交給會計。',
  },
  {
    category: '報表',
    question: 'AI 預測準確嗎？',
    answer:
      'AI 會根據過去 3 個學期的歷史資料進行預測，並提供信心指數供參考，建議搭配人工判斷。',
  },
  {
    category: '整合',
    question: '什麼是 94Manage 整合？',
    answer:
      '94Manage 是我們的學員管理系統，整合後可自動同步班級、學生與學費繳交狀態，教材發放更精準。',
  },
  {
    category: '整合',
    question: '如何設定 Telegram 通知？',
    answer:
      '進入「通知設定」頁面，輸入 Telegram Bot Token 與 Chat ID，點擊「測試發送」確認無誤後即可啟用。',
  },
];

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('全部');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const categoryMatch = activeCategory === '全部' || item.category === activeCategory;
      const keyword = searchTerm.trim().toLowerCase();
      const textMatch =
        keyword.length === 0 ||
        item.question.toLowerCase().includes(keyword) ||
        item.answer.toLowerCase().includes(keyword);
      return categoryMatch && textMatch;
    });
  }, [activeCategory, searchTerm]);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f4ef] px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-4xl font-bold text-[#4b5c53]">常見問題</h1>

        <div className="relative mx-auto mt-10 max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8aa08f]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜尋 FAQ..."
            className="w-full rounded-lg border border-[#d1c8ba] bg-white py-3 pl-11 pr-4 text-[#4f5f56] outline-none focus:border-[#8fa895] focus:ring-2 focus:ring-[#dbe6d9]"
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                activeCategory === category
                  ? 'bg-[#8fa895] text-white'
                  : 'border border-[#cfc7ba] bg-[#fdfbf8] text-[#5d6c64] hover:bg-[#eee7db]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-10 space-y-4">
          {filteredFaqs.map((item) => (
            <article
              key={item.question}
              className="rounded-xl border border-[#d8d1c6] bg-[#fdfbf8] p-6 shadow-sm"
            >
              <div className="mb-2 text-sm font-medium text-[#819487]">{item.category}</div>
              <h2 className="text-lg font-semibold text-[#4f5f56]">Q: {item.question}</h2>
              <p className="mt-3 leading-relaxed text-[#66716a]">A: {item.answer}</p>
            </article>
          ))}
          {filteredFaqs.length === 0 && (
            <div className="rounded-xl border border-[#d8d1c6] bg-[#fdfbf8] p-8 text-center text-[#6b746e]">
              找不到符合條件的 FAQ，請嘗試其他關鍵字。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

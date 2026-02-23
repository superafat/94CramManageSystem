import Link from 'next/link';
import {
  BarChart3,
  Bot,
  Building2,
  Boxes,
  Link2,
  School,
  Send,
  Warehouse,
} from 'lucide-react';

const features = [
  {
    icon: Boxes,
    title: '品項管理',
    description: '講義、教材、耗材分類管理',
  },
  {
    icon: Warehouse,
    title: '多倉庫支援',
    description: '總部與分校庫存一目瞭然',
  },
  {
    icon: BarChart3,
    title: '智能報表',
    description: '庫存周轉、消耗分析、低庫存預警',
  },
  {
    icon: Bot,
    title: 'AI 預測',
    description: '學期備貨建議、自動補貨提醒',
  },
  {
    icon: Send,
    title: 'Telegram 通知',
    description: '即時掌握庫存異常',
  },
  {
    icon: Link2,
    title: '系統整合',
    description: '與 94Manage 無縫串接',
  },
];

const audiences = [
  { icon: School, label: '補習班/才藝教室' },
  { icon: Building2, label: '教育機構總部' },
  { icon: Warehouse, label: '連鎖培訓中心' },
];

const pricingPlans = [
  {
    name: '免費版',
    items: ['單一倉庫', '100 品項', '基礎報表'],
    price: '免費',
  },
  {
    name: '專業版',
    items: ['無限倉庫', '無限品項', '進階報表'],
    price: 'NT$999/月',
    featured: true,
  },
  {
    name: '企業版',
    items: ['客製化開發', '專屬客服', 'SLA 保障'],
    price: '來電洽詢',
  },
];

export default function MarketingHomePage() {
  return (
    <div className="bg-[#f7f4ef]">
      <section className="bg-gradient-to-br from-[#e8e1d7] via-[#dde6da] to-[#d3ddd2] px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[#4b5c53] md:text-5xl">
            蜂神榜 Ai 補習班庫存管理系統
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-[#5d6c64]">
            專為教育機構設計的庫存管理解決方案，讓講義、教材、耗材管理更輕鬆
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-md bg-[#8fa895] px-6 py-3 font-medium text-white transition hover:bg-[#7a9380]"
            >
              免費試用 14 天
            </Link>
            <Link
              href="#pricing"
              className="rounded-md border border-[#9fb1a0] px-6 py-3 font-medium text-[#4f5f56] transition hover:bg-[#e6ddd1]"
            >
              查看方案
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold text-[#4b5c53]">六大核心功能</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-[#d8d1c6] bg-[#fdfbf8] p-6 shadow-sm"
            >
              <Icon className="h-8 w-8 text-[#7d9383]" />
              <h3 className="mt-4 text-xl font-semibold text-[#4f5f56]">{title}</h3>
              <p className="mt-2 text-[#6b746e]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#efe8dd] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold text-[#4b5c53]">適用對象</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {audiences.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border border-[#d8d1c6] bg-[#f9f5ef] p-6 text-center"
              >
                <Icon className="mx-auto h-8 w-8 text-[#7d9383]" />
                <p className="mt-4 text-lg font-medium text-[#4f5f56]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold text-[#4b5c53]">定價方案</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 ${
                plan.featured
                  ? 'border-[#8fa895] bg-[#eef3ec] shadow-md'
                  : 'border-[#d8d1c6] bg-[#fdfbf8] shadow-sm'
              }`}
            >
              <h3 className="text-2xl font-semibold text-[#4f5f56]">{plan.name}</h3>
              <ul className="mt-5 space-y-3 text-[#66716a]">
                {plan.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="mt-8 text-2xl font-bold text-[#4b5c53]">{plan.price}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#dfe7dc] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-[#4b5c53] md:text-4xl">開始簡化您的庫存管理</h2>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-md bg-[#8fa895] px-8 py-3 font-medium text-white transition hover:bg-[#7a9380]"
          >
            立即免費註冊
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';

const features = [
  {
    emoji: '📦',
    title: '品項管理',
    description: '講義、教材、耗材分類管理，支援條碼掃描快速查詢',
    accent: '#E8734A',
  },
  {
    emoji: '🏬',
    title: '多倉庫支援',
    description: '總部與分校庫存一目瞭然，調撥作業一鍵完成',
    accent: '#5B8DEF',
  },
  {
    emoji: '📊',
    title: '智能報表',
    description: '庫存周轉率、消耗分析、低庫存預警通知',
    accent: '#8B5CF6',
  },
  {
    emoji: '🤖',
    title: 'AI 備貨預測',
    description: '根據歷史數據智慧推薦補貨量，降低缺貨風險',
    accent: '#10B981',
  },
  {
    emoji: '🔔',
    title: 'Telegram 即時通知',
    description: '低庫存警告、採購單狀態變更自動推播',
    accent: '#F59E0B',
  },
  {
    emoji: '🔗',
    title: '系統整合',
    description: '與 94Manage、94inClass 無縫串接，資料同步',
    accent: '#EC4899',
  },
];

const advantages = [
  { emoji: '🏷️', title: '條碼管理', desc: '掃碼進出貨，效率提升 3 倍', color: '#E8734A' },
  { emoji: '📋', title: '盤點管理', desc: '系統 vs 實際自動比對差異', color: '#5B8DEF' },
  { emoji: '📈', title: '採購流程', desc: '草稿→審核→核准→收貨', color: '#10B981' },
  { emoji: '🛡️', title: '審計追蹤', desc: '每筆異動完整記錄可追溯', color: '#F59E0B' },
];

const audiences = [
  { emoji: '🏫', label: '補習班 / 才藝教室', desc: '管理講義、教材發放', color: '#E8734A' },
  { emoji: '🏢', label: '教育機構總部', desc: '統一管控多校區庫存', color: '#5B8DEF' },
  { emoji: '🏭', label: '連鎖培訓中心', desc: '跨校區調撥與補貨', color: '#8B5CF6' },
];

const pricingPlans = [
  {
    name: '免費版',
    items: ['單一倉庫', '100 品項', '基礎報表', 'Email 支援'],
    price: '免費',
  },
  {
    name: '專業版',
    items: ['無限倉庫', '無限品項', 'AI 預測', 'Telegram 通知', '進階報表', '優先支援'],
    price: 'NT$999/月',
    featured: true,
  },
  {
    name: '企業版',
    items: ['所有專業版功能', '客製化開發', '專屬客服', 'SLA 保障', 'API 整合'],
    price: '來電洽詢',
  },
];

const faqs = [
  { q: '需要購買什麼硬體嗎？', a: '完全不需要！只要有瀏覽器就能使用。如需條碼掃描功能，市售 USB 條碼槍約 NT$500 即可。' },
  { q: '可以管理多個校區的倉庫嗎？', a: '當然！94Stock 支援無限倉庫，每個校區都能獨立管理庫存，總部可統一查看。' },
  { q: '與 94Manage、94inClass 如何整合？', a: '三系統共用同一帳號體系（SSO），庫存數據可自動同步，無需重複登入。' },
  { q: '資料安全如何保障？', a: '所有資料存放在台灣機房，SSL 加密傳輸、每日自動備份、多租戶完全隔離。' },
];

export default function MarketingHomePage() {
  return (
    <div className="bg-[#F5F0EB]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E8E1D7] via-[#DDE6DA] to-[#D3DDD2] px-6 py-24">
        <div className="absolute top-10 right-10 w-64 h-64 bg-[#8FA895]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#9DAEBB]/10 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="text-6xl mb-4 animate-float">🐝</div>
          <h1 className="text-4xl font-bold tracking-tight text-[#4B5C53] md:text-5xl">
            蜂神榜 補習班 AI 庫存管理系統
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-[#5D6C64]">
            專為教育機構設計的智能庫存解決方案 — 講義不缺貨、教材不囤積、耗材不浪費
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/demo"
              className="rounded-xl bg-[#8FA895] px-8 py-3.5 font-semibold text-white shadow-md transition hover:bg-[#7A9380] hover:shadow-lg"
            >
              🎬 免費 Demo 體驗
            </Link>
            <Link
              href="/register"
              className="rounded-xl border-2 border-[#8FA895] px-8 py-3.5 font-semibold text-[#4B5C53] transition hover:bg-[#8FA895]/10"
            >
              免費試用 14 天
            </Link>
            <Link
              href="#pricing"
              className="rounded-xl border border-[#D8D1C6] px-8 py-3.5 font-medium text-[#6B746E] transition hover:bg-[#E6DDD1]"
            >
              查看方案
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#8FA895] tracking-widest mb-2">FEATURES</p>
          <h2 className="text-3xl font-bold text-[#4B5C53]">六大核心功能</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ emoji, title, description, accent }) => (
            <div
              key={title}
              className="group rounded-2xl border border-[#D8D1C6] bg-[#FDFBF8] p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: accent }} />
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-3xl transition-transform group-hover:scale-110"
                style={{ background: `${accent}15` }}
              >
                {emoji}
              </div>
              <h3 className="text-xl font-semibold text-[#4B5C53]">{title}</h3>
              <p className="mt-2 text-[#6B746E] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-gradient-to-br from-[#4B5C53] to-[#3A4A42] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-white mb-10">進階管理能力</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {advantages.map(({ emoji, title, desc, color }) => (
              <div key={title} className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur transition-all hover:bg-white/15 hover:-translate-y-1">
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 text-3xl"
                  style={{ background: `${color}30` }}
                >
                  {emoji}
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-gradient-to-b from-[#F5F0EB] to-[#EFE8DD] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#C4A4A0] tracking-widest mb-2">FOR YOU</p>
            <h2 className="text-3xl font-bold text-[#4B5C53]">適用對象</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {audiences.map(({ emoji, label, desc, color }) => (
              <div
                key={label}
                className="rounded-2xl border border-[#D8D1C6] bg-[#FDFBF8] p-8 text-center transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 text-4xl"
                  style={{ background: `${color}15` }}
                >
                  {emoji}
                </div>
                <p className="text-lg font-semibold text-[#4B5C53]">{label}</p>
                <p className="mt-2 text-sm text-[#6B746E]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#8FA895] tracking-widest mb-2">PRICING</p>
          <h2 className="text-3xl font-bold text-[#4B5C53]">定價方案</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.featured
                  ? 'border-[#8FA895] bg-[#EEF3EC] shadow-lg scale-[1.02]'
                  : 'border-[#D8D1C6] bg-[#FDFBF8] shadow-sm hover:shadow-md'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8FA895] text-white text-xs font-bold px-4 py-1 rounded-full">
                  最受歡迎
                </div>
              )}
              <h3 className="text-2xl font-bold text-[#4B5C53]">{plan.name}</h3>
              <p className="mt-4 text-3xl font-bold text-[#8FA895]">{plan.price}</p>
              <ul className="mt-6 space-y-3">
                {plan.items.map((item, i) => {
                  const colors = ['#E8734A', '#5B8DEF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
                  return (
                    <li key={item} className="flex items-center gap-2 text-[#6B746E]">
                      <span style={{ color: colors[i % colors.length] }}>✓</span> {item}
                    </li>
                  )
                })}
              </ul>
              <Link
                href={plan.featured ? '/demo' : '/register'}
                className={`mt-8 block text-center rounded-xl px-6 py-3 font-semibold transition ${
                  plan.featured
                    ? 'bg-[#8FA895] text-white hover:bg-[#7A9380]'
                    : 'border-2 border-[#8FA895] text-[#4B5C53] hover:bg-[#8FA895]/10'
                }`}
              >
                {plan.featured ? '立即體驗' : '開始使用'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#EFE8DD] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#9DAEBB] tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-bold text-[#4B5C53]">常見問題</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="rounded-2xl bg-[#FDFBF8] border border-[#D8D1C6] p-6">
                <h3 className="font-semibold text-[#4B5C53]">{q}</h3>
                <p className="mt-2 text-sm text-[#6B746E] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4B5C53] to-[#3A4A42] px-6 py-24">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8FA895]/10 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="text-5xl mb-4 animate-float">🐝</div>
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            開始簡化您的庫存管理
          </h2>
          <p className="mt-4 text-lg text-white/70">
            零硬體投資 · 即開即用 · 14 天免費試用
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/demo"
              className="rounded-xl bg-[#8FA895] px-8 py-3.5 font-semibold text-white shadow-md transition hover:bg-[#7A9380] hover:shadow-lg"
            >
              🎬 免費 Demo 體驗
            </Link>
            <Link
              href="/register"
              className="rounded-xl border-2 border-white/30 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10"
            >
              立即免費註冊
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D3A2F] px-6 py-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm text-white/50">
            © 2026 蜂神榜 Ai 教育科技 — 94Stock 庫存管理系統 | 94Manage 學員管理 | 94inClass 點名系統
          </p>
        </div>
      </footer>
    </div>
  );
}

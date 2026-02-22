import { SystemCard } from '@/components/SystemCard';

const systems = [
  {
    key: 'manage',
    emoji: '📚',
    name: '學員管理',
    description: '學員資料、課程排班、繳費紀錄',
    url: process.env.NEXT_PUBLIC_MANAGE_URL || 'http://localhost:3200',
    color: '#A8B5A2',
  },
  {
    key: 'inclass',
    emoji: '✋',
    name: '點名系統',
    description: '上課點名、出勤統計、家長通知',
    url: process.env.NEXT_PUBLIC_INCLASS_URL || 'http://localhost:3201',
    color: '#C4A9A1',
  },
  {
    key: 'stock',
    emoji: '📦',
    name: '庫存管理',
    description: '教材庫存、進貨管理、發放紀錄',
    url: process.env.NEXT_PUBLIC_STOCK_URL || 'http://localhost:3000',
    color: '#9CADB7',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      {/* Logo / Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-700 mb-2">
          🏫 94 教育平台
        </h1>
        <p className="text-morandi-gray text-lg">
          選擇要進入的系統
        </p>
      </div>

      {/* System Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {systems.map((sys) => (
          <SystemCard key={sys.key} emoji={sys.emoji} name={sys.name} description={sys.description} url={sys.url} color={sys.color} />
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-morandi-gray text-sm">
        94cram.app © 2026
      </footer>
    </main>
  );
}

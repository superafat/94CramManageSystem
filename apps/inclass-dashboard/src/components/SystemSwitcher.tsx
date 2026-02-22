'use client';

const systems = [
  {
    name: '📚 學員管理',
    key: 'manage',
    url: process.env.NEXT_PUBLIC_MANAGE_URL || 'http://localhost:3200',
    color: '#A8B5A2',
    current: false,
  },
  {
    name: '✋ 點名系統',
    key: 'inclass',
    url: process.env.NEXT_PUBLIC_INCLASS_URL || 'http://localhost:3201',
    color: '#C4A9A1',
    current: true,
  },
  {
    name: '📦 庫存管理',
    key: 'stock',
    url: process.env.NEXT_PUBLIC_STOCK_URL || 'http://localhost:3000',
    color: '#9CADB7',
    current: false,
  },
];

export function SystemSwitcher() {
  return (
    <div className="flex gap-2 p-3 border-t border-gray-200">
      {systems.map((sys) => (
        <a
          key={sys.key}
          href={sys.url}
          className={`flex-1 text-center py-2 px-3 rounded-lg text-sm font-medium transition-all
            ${sys.current 
              ? 'ring-2 ring-offset-1 opacity-100' 
              : 'opacity-70 hover:opacity-100'}`}
          style={{ backgroundColor: sys.color + '33', borderColor: sys.color, color: '#555' }}
        >
          {sys.name}
        </a>
      ))}
    </div>
  );
}

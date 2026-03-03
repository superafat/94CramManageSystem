'use client';

import { useState, useEffect } from 'react';

interface BatchRecord {
  id: string;
  batchNo: string;
  itemName: string;
  sku: string;
  warehouseName: string;
  remainingQty: number;
  unit: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  receivedAt: string;
  daysUntilExpiry: number | null;
}

type TabType = 'expiring-soon' | 'expired' | 'all-batches';

// Demo 假資料
const DEMO_BATCHES: BatchRecord[] = [
  {
    id: '1',
    batchNo: 'B2024-001',
    itemName: '國中數學講義（113學年）',
    sku: 'MATH-JH-113',
    warehouseName: '主倉庫',
    remainingQty: 45,
    unit: '本',
    manufactureDate: '2024-01-15',
    expiryDate: '2026-03-10',
    receivedAt: '2024-02-01',
    daysUntilExpiry: 7,
  },
  {
    id: '2',
    batchNo: 'B2024-003',
    itemName: '高中英文閱讀測驗卷',
    sku: 'ENG-SH-RD-01',
    warehouseName: '主倉庫',
    remainingQty: 120,
    unit: '份',
    manufactureDate: '2024-03-01',
    expiryDate: '2026-03-20',
    receivedAt: '2024-03-15',
    daysUntilExpiry: 17,
  },
  {
    id: '3',
    batchNo: 'B2023-045',
    itemName: '國小自然實驗材料包',
    sku: 'SCI-ES-KIT-02',
    warehouseName: '北區分倉',
    remainingQty: 8,
    unit: '組',
    manufactureDate: '2023-06-01',
    expiryDate: '2026-03-25',
    receivedAt: '2023-07-01',
    daysUntilExpiry: 22,
  },
  {
    id: '4',
    batchNo: 'B2024-007',
    itemName: '國中社會地圖冊（112學年）',
    sku: 'SOC-JH-MAP-112',
    warehouseName: '主倉庫',
    remainingQty: 30,
    unit: '冊',
    manufactureDate: '2024-05-01',
    expiryDate: '2026-03-29',
    receivedAt: '2024-05-20',
    daysUntilExpiry: 26,
  },
  {
    id: '5',
    batchNo: 'B2023-012',
    itemName: '高中化學實驗試劑組',
    sku: 'CHEM-SH-LAB-01',
    warehouseName: '北區分倉',
    remainingQty: 3,
    unit: '組',
    manufactureDate: '2023-01-10',
    expiryDate: '2026-02-15',
    receivedAt: '2023-02-01',
    daysUntilExpiry: -16,
  },
  {
    id: '6',
    batchNo: 'B2023-028',
    itemName: '國小美術用紙（特殊規格）',
    sku: 'ART-ES-PAPER-S',
    warehouseName: '主倉庫',
    remainingQty: 200,
    unit: '張',
    manufactureDate: '2023-08-01',
    expiryDate: '2026-01-31',
    receivedAt: '2023-09-01',
    daysUntilExpiry: -31,
  },
  {
    id: '7',
    batchNo: 'B2024-015',
    itemName: '國中數學講義（114學年）',
    sku: 'MATH-JH-114',
    warehouseName: '主倉庫',
    remainingQty: 180,
    unit: '本',
    manufactureDate: '2024-08-01',
    expiryDate: '2027-07-31',
    receivedAt: '2024-08-15',
    daysUntilExpiry: 515,
  },
  {
    id: '8',
    batchNo: 'B2024-022',
    itemName: '高中物理參考書（114學年）',
    sku: 'PHY-SH-REF-114',
    warehouseName: '南區分倉',
    remainingQty: 95,
    unit: '本',
    manufactureDate: '2024-09-01',
    expiryDate: '2027-08-31',
    receivedAt: '2024-09-10',
    daysUntilExpiry: 546,
  },
  {
    id: '9',
    batchNo: 'B2024-031',
    itemName: '國小國語習作（114學年上）',
    sku: 'CHI-ES-WB-114A',
    warehouseName: '主倉庫',
    remainingQty: 250,
    unit: '本',
    manufactureDate: '2024-07-01',
    expiryDate: '2027-06-30',
    receivedAt: '2024-07-20',
    daysUntilExpiry: 484,
  },
];

function getDaysLabel(days: number | null): { label: string; className: string } {
  if (days === null) return { label: '無到期日', className: 'bg-gray-100 text-gray-600' };
  if (days < 0) return { label: `已過期 ${Math.abs(days)} 天`, className: 'bg-red-50 text-red-700' };
  if (days <= 30) return { label: `${days} 天後到期`, className: 'bg-yellow-50 text-yellow-700' };
  return { label: `${days} 天後到期`, className: 'bg-green-50 text-green-700' };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function ExpiryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('expiring-soon');
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 使用 Demo 假資料模式，API 路徑為 /api/batches/expiry-report
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/batches/expiry-report');
        if (res.ok) {
          const data = await res.json();
          setBatches(data);
        } else {
          setBatches(DEMO_BATCHES);
        }
      } catch {
        setBatches(DEMO_BATCHES);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const expiringSoon = batches.filter(
    (b) => b.daysUntilExpiry !== null && b.daysUntilExpiry >= 0 && b.daysUntilExpiry <= 30
  );
  const expired = batches.filter(
    (b) => b.daysUntilExpiry !== null && b.daysUntilExpiry < 0
  );
  const allBatches = [...batches].sort((a, b) => {
    if (a.daysUntilExpiry === null) return 1;
    if (b.daysUntilExpiry === null) return -1;
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });

  const getTabBatches = (): BatchRecord[] => {
    let list: BatchRecord[];
    if (activeTab === 'expiring-soon') list = expiringSoon;
    else if (activeTab === 'expired') list = expired;
    else list = allBatches;

    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (b) =>
        b.itemName.toLowerCase().includes(term) ||
        b.batchNo.toLowerCase().includes(term) ||
        b.sku.toLowerCase().includes(term)
    );
  };

  const displayBatches = getTabBatches();

  const tabs: { key: TabType; label: string; count: number; activeClass: string }[] = [
    {
      key: 'expiring-soon',
      label: '即將過期',
      count: expiringSoon.length,
      activeClass: 'border-yellow-500 text-yellow-700',
    },
    {
      key: 'expired',
      label: '已過期',
      count: expired.length,
      activeClass: 'border-red-500 text-red-700',
    },
    {
      key: 'all-batches',
      label: '批次總覽',
      count: allBatches.length,
      activeClass: 'border-[#8FA895] text-[#4B5C53]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">過期監控</h2>
        <p className="text-sm text-gray-500 mt-1">追蹤批次有效期限，確保先進先出（FIFO）出貨順序</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center gap-4">
          <div className="text-3xl">⚠️</div>
          <div>
            <p className="text-sm text-yellow-700 font-medium">即將過期（30天內）</p>
            <p className="text-3xl font-bold text-yellow-800">{loading ? '-' : expiringSoon.length}</p>
            <p className="text-xs text-yellow-600 mt-0.5">批次需優先出貨</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-4">
          <div className="text-3xl">🚨</div>
          <div>
            <p className="text-sm text-red-700 font-medium">已過期</p>
            <p className="text-3xl font-bold text-red-800">{loading ? '-' : expired.length}</p>
            <p className="text-xs text-red-600 mt-0.5">批次需立即處置</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-4">
          <div className="text-3xl">📦</div>
          <div>
            <p className="text-sm text-green-700 font-medium">批次總數</p>
            <p className="text-3xl font-bold text-green-800">{loading ? '-' : allBatches.length}</p>
            <p className="text-xs text-green-600 mt-0.5">所有有效批次</p>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? tab.activeClass
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.key
                      ? tab.key === 'expiring-soon'
                        ? 'bg-yellow-100 text-yellow-700'
                        : tab.key === 'expired'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-[#8FA895]/15 text-[#4B5C53]'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="py-2">
            <input
              type="text"
              placeholder="搜尋品名、批號或 SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895] w-60"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  批號
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  品名
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  倉庫
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  剩餘數量
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  入庫日期
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  到期日
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    載入中...
                  </td>
                </tr>
              ) : displayBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    {searchTerm ? '找不到符合條件的批次' : '目前沒有批次資料'}
                  </td>
                </tr>
              ) : (
                displayBatches.map((batch) => {
                  const { label, className } = getDaysLabel(batch.daysUntilExpiry);
                  const isExpired =
                    batch.daysUntilExpiry !== null && batch.daysUntilExpiry < 0;
                  const isExpiringSoon =
                    batch.daysUntilExpiry !== null &&
                    batch.daysUntilExpiry >= 0 &&
                    batch.daysUntilExpiry <= 30;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isExpired
                          ? 'bg-red-50/40'
                          : isExpiringSoon
                          ? 'bg-yellow-50/40'
                          : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {batch.batchNo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium text-gray-900">{batch.itemName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{batch.sku}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                        {batch.warehouseName}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">{batch.remainingQty}</span>
                        <span className="text-xs text-gray-400 ml-1">{batch.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(batch.receivedAt)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-700">
                        {formatDate(batch.expiryDate)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
                        >
                          {isExpired && <span className="mr-1">🚨</span>}
                          {isExpiringSoon && <span className="mr-1">⚠️</span>}
                          {!isExpired && !isExpiringSoon && batch.daysUntilExpiry !== null && (
                            <span className="mr-1">✅</span>
                          )}
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FIFO tip */}
        {activeTab === 'all-batches' && !loading && displayBatches.length > 0 && (
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-700 flex items-center gap-2">
            <span>📋</span>
            <span>
              批次已依到期日由近至遠排序，請依此順序優先出貨，確保先進先出（FIFO）原則。
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

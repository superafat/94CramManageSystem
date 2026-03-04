'use client';

import { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, Search, Warehouse, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { DemoBanner } from '@/components/DemoBanner';

interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  safetyStock: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

interface BatchRecord {
  id: string;
  batchNo: string;
  remainingQty: number;
  receivedAt: string;
  expiryDate: string | null;
  manufactureDate: string | null;
}

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  restockLeadDays: number;
  minOrderQuantity: number;
  items: Array<{
    itemId: string;
    itemName: string;
    sku: string | null;
    unit: string | null;
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    safetyStock: number;
    suggestedQty: number;
  }>;
}

// 後端 GET /inventory 回傳巢狀結構
interface RawInventoryRow {
  inventory: { id: string; itemId: string; warehouseId: string; quantity: number };
  item: { id: string; name: string; sku: string | null; unit: string | null; safetyStock: number | null; categoryId: string | null };
  warehouse: { id: string; name: string };
  category: { id: string; name: string; color: string | null; restockLeadDays: number; minOrderQuantity: number } | null;
}

const DEMO_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', itemId: 'item-1', itemName: '白板筆（紅）', sku: 'WB-R001', unit: '支', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 3, safetyStock: 10, categoryId: 'cat-1', categoryName: '文具用品', categoryColor: '#8FA895' },
  { id: 'inv-2', itemId: 'item-2', itemName: '白板筆（藍）', sku: 'WB-B001', unit: '支', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 25, safetyStock: 10, categoryId: 'cat-1', categoryName: '文具用品', categoryColor: '#8FA895' },
  { id: 'inv-3', itemId: 'item-3', itemName: 'A4 影印紙', sku: 'A4-001', unit: '包', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 2, safetyStock: 5, categoryId: 'cat-2', categoryName: '紙張耗材', categoryColor: '#B5A88A' },
  { id: 'inv-4', itemId: 'item-4', itemName: '資料夾（透明）', sku: 'FF-001', unit: '個', warehouseId: 'wh-2', warehouseName: '分校倉庫', quantity: 50, safetyStock: 20, categoryId: 'cat-2', categoryName: '紙張耗材', categoryColor: '#B5A88A' },
  { id: 'inv-5', itemId: 'item-5', itemName: '簽字筆（黑）', sku: 'SP-B001', unit: '支', warehouseId: 'wh-2', warehouseName: '分校倉庫', quantity: 8, safetyStock: 15, categoryId: 'cat-1', categoryName: '文具用品', categoryColor: '#8FA895' },
  { id: 'inv-6', itemId: 'item-6', itemName: '教材講義 A', sku: 'TM-A01', unit: '本', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 0, safetyStock: 10, categoryId: 'cat-3', categoryName: '教材', categoryColor: '#A89BB5' },
];

const DEMO_CATEGORIES = [
  { id: 'cat-1', name: '文具用品', color: '#8FA895' },
  { id: 'cat-2', name: '紙張耗材', color: '#B5A88A' },
  { id: 'cat-3', name: '教材', color: '#A89BB5' },
];

function generateDemoBatches(itemId: string): BatchRecord[] {
  const today = new Date();
  const offset = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };
  return [
    {
      id: `batch-${itemId}-1`,
      batchNo: `B${itemId.slice(-1)}001`,
      remainingQty: 5,
      receivedAt: offset(-90),
      expiryDate: offset(-5),
      manufactureDate: offset(-120),
    },
    {
      id: `batch-${itemId}-2`,
      batchNo: `B${itemId.slice(-1)}002`,
      remainingQty: 12,
      receivedAt: offset(-30),
      expiryDate: offset(20),
      manufactureDate: offset(-60),
    },
    {
      id: `batch-${itemId}-3`,
      batchNo: `B${itemId.slice(-1)}003`,
      remainingQty: 20,
      receivedAt: offset(-7),
      expiryDate: null,
      manufactureDate: null,
    },
  ];
}

function getBatchStatus(expiryDate: string | null): { label: string; className: string } {
  if (!expiryDate) return { label: '永久', className: 'bg-gray-100 text-gray-600' };
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) return { label: '已過期', className: 'bg-red-100 text-red-700' };
  if (daysUntilExpiry <= 30) return { label: '即將過期', className: 'bg-yellow-100 text-yellow-700' };
  return { label: '正常', className: 'bg-green-100 text-green-700' };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [batchCache, setBatchCache] = useState<Record<string, BatchRecord[]>>({});
  const [batchLoading, setBatchLoading] = useState<string | null>(null);
  const [creatingPO, setCreatingPO] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invRes, catRes] = await Promise.all([
        api.get<RawInventoryRow[]>('/inventory'),
        api.get<{ id: string; name: string; color: string | null }[]>('/categories'),
      ]);
      const transformed: InventoryItem[] = invRes.data.map((row) => ({
        id: row.inventory.id,
        itemId: row.inventory.itemId,
        itemName: row.item.name,
        sku: row.item.sku || '',
        unit: row.item.unit || '',
        warehouseId: row.inventory.warehouseId,
        warehouseName: row.warehouse.name,
        quantity: row.inventory.quantity,
        safetyStock: row.item.safetyStock ?? 0,
        categoryId: row.item.categoryId ?? null,
        categoryName: row.category?.name ?? null,
        categoryColor: row.category?.color ?? null,
      }));
      setInventory(transformed);
      setCategories(catRes.data);
      setIsDemo(false);
      fetchLowStockGroups(false);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      setInventory(DEMO_INVENTORY);
      setCategories(DEMO_CATEGORIES);
      setIsDemo(true);
      generateDemoLowStockGroups();
      toast('已進入 Demo 模式（API 連線失敗）', { icon: 'ℹ️' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockGroups = async (demo: boolean) => {
    if (demo) return;
    setLoadingGroups(true);
    try {
      const res = await api.get<CategoryGroup[]>('/inventory/low-stock-by-category');
      setCategoryGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch low-stock groups:', err);
      setCategoryGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const generateDemoLowStockGroups = () => {
    const lowItems = DEMO_INVENTORY.filter(i => i.quantity <= i.safetyStock);
    const groupMap = new Map<string, CategoryGroup>();
    for (const item of lowItems) {
      const catId = item.categoryId ?? 'uncategorized';
      const catName = item.categoryName ?? '未分類';
      const catColor = item.categoryColor;
      if (!groupMap.has(catId)) {
        groupMap.set(catId, {
          categoryId: catId,
          categoryName: catName,
          categoryColor: catColor,
          restockLeadDays: 7,
          minOrderQuantity: 10,
          items: [],
        });
      }
      groupMap.get(catId)!.items.push({
        itemId: item.itemId,
        itemName: item.itemName,
        sku: item.sku,
        unit: item.unit,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        quantity: item.quantity,
        safetyStock: item.safetyStock,
        suggestedQty: Math.max(1, item.safetyStock * 2 - item.quantity),
      });
    }
    setCategoryGroups(Array.from(groupMap.values()));
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        filterCategory === 'all' || item.categoryId === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, filterCategory]);

  const lowStockCount = useMemo(() => inventory.filter(i => i.quantity <= i.safetyStock).length, [inventory]);
  const warehouseCount = useMemo(() => new Set(inventory.map(i => i.warehouseName)).size, [inventory]);

  const suggestedQty = (item: InventoryItem) => Math.max(1, item.safetyStock * 2 - item.quantity);

  const createPurchaseOrder = async () => {
    const lowItems = inventory.filter(i => i.quantity <= i.safetyStock);
    if (lowItems.length === 0) return;
    if (isDemo) {
      toast.success(`已建立採購單（Demo，${lowItems.length} 項低庫存品項）`);
      return;
    }
    setCreatingPO(true);
    try {
      const byWarehouse = new Map<string, InventoryItem[]>();
      for (const item of lowItems) {
        const existing = byWarehouse.get(item.warehouseId) || [];
        existing.push(item);
        byWarehouse.set(item.warehouseId, existing);
      }
      await Promise.all(
        Array.from(byWarehouse.entries()).map(([warehouseId, items]) =>
          api.post('/purchase-orders', {
            warehouseId,
            notes: `系統自動建議：低庫存一鍵採購（${items.length} 項品項）`,
          })
        )
      );
      toast.success(`已建立 ${byWarehouse.size} 張採購單（共 ${lowItems.length} 項低庫存品項）`);
    } catch (err) {
      console.error('Failed to create purchase order:', err);
      toast.error('建立採購單失敗，請至進貨單頁面手動建立');
    } finally {
      setCreatingPO(false);
    }
  };

  const toggleRow = async (item: InventoryItem) => {
    const key = `${item.itemId}-${item.warehouseId}`;
    if (expandedRow === item.id) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(item.id);
    if (batchCache[key]) return;

    if (isDemo) {
      setBatchCache(prev => ({ ...prev, [key]: generateDemoBatches(item.itemId) }));
      return;
    }

    setBatchLoading(item.id);
    try {
      const res = await api.get<BatchRecord[]>(`/batches?itemId=${item.itemId}&warehouseId=${item.warehouseId}`);
      setBatchCache(prev => ({ ...prev, [key]: res.data }));
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      setBatchCache(prev => ({ ...prev, [key]: [] }));
      toast.error('無法載入批次資料');
    } finally {
      setBatchLoading(null);
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <Toaster position="top-right" />

      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">庫存總覽</h2>
          <p className="text-sm text-gray-500 mt-1">即時查看各分校庫存狀況與預警</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">低庫存預警: <strong>{lowStockCount}</strong> 項</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">總庫存品項</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">低庫存預警</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Warehouse className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">倉庫數量</p>
              <p className="text-2xl font-bold text-gray-900">{warehouseCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 低庫存警告區塊 - grouped by category */}
      {categoryGroups.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-800">以下品項庫存不足，建議採購</span>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#8FA895] text-white rounded-lg text-sm font-medium hover:bg-[#7a9880] transition-colors disabled:opacity-50"
              onClick={createPurchaseOrder}
              disabled={creatingPO}
            >
              <ShoppingCart className="h-4 w-4" />
              {creatingPO ? '建立中...' : '一鍵建立採購單'}
            </button>
          </div>
          {loadingGroups ? (
            <p className="text-sm text-amber-700">載入中...</p>
          ) : (
            <div className="space-y-3">
              {categoryGroups.map(group => (
                <div key={group.categoryId} className="border border-amber-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.categoryColor || '#8FA895' }}
                      />
                      <span className="font-semibold text-gray-900">{group.categoryName}</span>
                      <span className="text-xs text-gray-500">
                        備貨 {group.restockLeadDays} 天 · 最低 {group.minOrderQuantity} 件
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.items.map(item => (
                      <div
                        key={`${item.itemId}-${item.warehouseId}`}
                        className="flex items-center justify-between border border-amber-100 rounded px-3 py-2 text-sm bg-amber-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.warehouseName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">現有 <span className="font-bold text-red-600">{item.quantity}</span></p>
                          <p className="text-xs text-[#8FA895] font-medium">建議採購 +{item.suggestedQty}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜尋品名或 SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm transition duration-150 ease-in-out"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">分類篩選</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895]"
          >
            <option value="all">全部分類</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品名</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">倉庫</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">單位</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">目前庫存</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">安全庫存</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  載入中...
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  找不到符合條件的庫存資料
                </td>
              </tr>
            ) : (
              filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.safetyStock;
                const isExpanded = expandedRow === item.id;
                const batchKey = `${item.itemId}-${item.warehouseId}`;
                const batches = batchCache[batchKey];
                const isBatchLoading = batchLoading === item.id;

                return (
                  <>
                    <tr
                      key={item.id}
                      className={`transition-colors cursor-pointer ${isLowStock ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}
                      onClick={() => toggleRow(item)}
                      title="點擊查看批次資料"
                    >
                      <td className="px-3 py-4 text-gray-400">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.itemName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.categoryName ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: item.categoryColor || '#8FA895' }}
                          >
                            {item.categoryName}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">未分類</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.warehouseName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.safetyStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3" />
                            庫存不足
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            正常
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-batches`} className="bg-gray-50 border-t-0">
                        <td colSpan={9} className="px-8 py-4">
                          {isBatchLoading ? (
                            <p className="text-sm text-gray-500">載入批次資料中...</p>
                          ) : !batches || batches.length === 0 ? (
                            <p className="text-sm text-gray-500">此品項目前無批次紀錄</p>
                          ) : (
                            <>
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase">
                                    <th className="pr-6 py-2 text-left font-medium">批號</th>
                                    <th className="pr-6 py-2 text-left font-medium">入庫日期</th>
                                    <th className="pr-6 py-2 text-left font-medium">到期日</th>
                                    <th className="pr-6 py-2 text-left font-medium">剩餘數量</th>
                                    <th className="py-2 text-left font-medium">狀態</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {batches.map(batch => {
                                    const status = getBatchStatus(batch.expiryDate);
                                    return (
                                      <tr key={batch.id}>
                                        <td className="pr-6 py-2 font-mono text-gray-800">{batch.batchNo}</td>
                                        <td className="pr-6 py-2 text-gray-600">{batch.receivedAt}</td>
                                        <td className="pr-6 py-2 text-gray-600">{batch.expiryDate ?? '—'}</td>
                                        <td className="pr-6 py-2 font-semibold text-gray-900">{batch.remainingQty} {item.unit}</td>
                                        <td className="py-2">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                                            {status.label}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <p className="mt-3 text-xs text-gray-500">
                                ⚡ FIFO 出庫順序：系統自動優先消耗最早入庫的批次
                              </p>
                              {isLowStock && (
                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-700">
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <ShoppingCart className="h-4 w-4" />
                                    <span className="font-medium">採購建議</span>
                                  </span>
                                  <span>目前庫存：<strong className="text-red-600">{item.quantity} {item.unit}</strong></span>
                                  <span>安全庫存：<strong>{item.safetyStock} {item.unit}</strong></span>
                                  <span className="text-[#8FA895] font-semibold">建議採購：<strong>+{suggestedQty(item)} {item.unit}</strong></span>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

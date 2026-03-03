'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, Warehouse, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

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
}

// 後端 GET /inventory 回傳巢狀結構
interface RawInventoryRow {
  inventory: { id: string; itemId: string; warehouseId: string; quantity: number };
  item: { id: string; name: string; sku: string | null; unit: string | null; safetyStock: number | null };
  warehouse: { id: string; name: string };
}

const DEMO_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', itemId: 'item-1', itemName: '白板筆（紅）', sku: 'WB-R001', unit: '支', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 3, safetyStock: 10 },
  { id: 'inv-2', itemId: 'item-2', itemName: '白板筆（藍）', sku: 'WB-B001', unit: '支', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 25, safetyStock: 10 },
  { id: 'inv-3', itemId: 'item-3', itemName: 'A4 影印紙', sku: 'A4-001', unit: '包', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 2, safetyStock: 5 },
  { id: 'inv-4', itemId: 'item-4', itemName: '資料夾（透明）', sku: 'FF-001', unit: '個', warehouseId: 'wh-2', warehouseName: '分校倉庫', quantity: 50, safetyStock: 20 },
  { id: 'inv-5', itemId: 'item-5', itemName: '簽字筆（黑）', sku: 'SP-B001', unit: '支', warehouseId: 'wh-2', warehouseName: '分校倉庫', quantity: 8, safetyStock: 15 },
  { id: 'inv-6', itemId: 'item-6', itemName: '教材講義 A', sku: 'TM-A01', unit: '本', warehouseId: 'wh-1', warehouseName: '總部倉庫', quantity: 0, safetyStock: 10 },
];

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [creatingPO, setCreatingPO] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get<RawInventoryRow[]>('/inventory');
      const transformed: InventoryItem[] = res.data.map((row) => ({
        id: row.inventory.id,
        itemId: row.inventory.itemId,
        itemName: row.item.name,
        sku: row.item.sku || '',
        unit: row.item.unit || '',
        warehouseId: row.inventory.warehouseId,
        warehouseName: row.warehouse.name,
        quantity: row.inventory.quantity,
        safetyStock: row.item.safetyStock ?? 0,
      }));
      setInventory(transformed);
      setIsDemo(false);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      setInventory(DEMO_INVENTORY);
      setIsDemo(true);
      toast('已進入 Demo 模式（API 連線失敗）', { icon: 'ℹ️' });
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.safetyStock);

  // 建議採購數量 = safetyStock * 2 - quantity（至少 1）
  const suggestedQty = (item: InventoryItem) => Math.max(1, item.safetyStock * 2 - item.quantity);

  const createPurchaseOrder = async () => {
    if (lowStockItems.length === 0) return;
    if (isDemo) {
      toast.success(`已建立採購單（Demo，${lowStockItems.length} 項低庫存品項）`);
      return;
    }
    setCreatingPO(true);
    try {
      const warehouseId = lowStockItems[0].warehouseId;
      const payload = {
        warehouseId,
        notes: `系統自動建議：低庫存一鍵採購（${lowStockItems.length} 項品項）`,
      };
      await api.post('/purchase-orders', payload);
      toast.success(`已建立採購單（${lowStockItems.length} 項低庫存品項）`);
    } catch (err) {
      console.error('Failed to create purchase order:', err);
      toast.error('建立採購單失敗，請至進貨單頁面手動建立');
    } finally {
      setCreatingPO(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <Toaster position="top-right" />

      {isDemo && (
        <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2 text-blue-700 text-sm">
          目前為 Demo 模式，資料不會真實寫入
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">庫存總覽</h2>
          <p className="text-sm text-gray-500 mt-1">即時查看各分校庫存狀況與預警</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">低庫存預警: <strong>{lowStockItems.length}</strong> 項</span>
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
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{new Set(inventory.map(i => i.warehouseName)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 低庫存警告區塊 */}
      {lowStockItems.length > 0 && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white border border-amber-200 rounded px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.itemName}</p>
                  <p className="text-xs text-gray-500">{item.warehouseName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">現有 <span className="font-bold text-red-600">{item.quantity}</span></p>
                  <p className="text-xs text-[#8FA895] font-medium">建議採購 +{suggestedQty(item)}</p>
                </div>
              </div>
            ))}
          </div>
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
      </div>

      {/* Data Table */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品名</th>
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
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  載入中...
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  找不到符合條件的庫存資料
                </td>
              </tr>
            ) : (
              filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.safetyStock;
                const isExpanded = expandedRow === item.id;
                return (
                  <>
                    <tr
                      key={item.id}
                      className={`transition-colors ${isLowStock ? 'bg-yellow-50 hover:bg-yellow-100 cursor-pointer' : 'hover:bg-gray-50'}`}
                      onClick={isLowStock ? () => toggleRow(item.id) : undefined}
                      title={isLowStock ? '點擊查看採購建議' : undefined}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.itemName}</td>
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
                    {isLowStock && isExpanded && (
                      <tr key={`${item.id}-detail`} className="bg-amber-50 border-t-0">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 text-amber-700">
                              <ShoppingCart className="h-4 w-4" />
                              <span className="font-medium">採購建議</span>
                            </div>
                            <div className="text-gray-700">
                              目前庫存：<strong className="text-red-600">{item.quantity} {item.unit}</strong>
                            </div>
                            <div className="text-gray-700">
                              安全庫存：<strong>{item.safetyStock} {item.unit}</strong>
                            </div>
                            <div className="text-[#8FA895] font-semibold">
                              建議採購數量：<strong>+{suggestedQty(item)} {item.unit}</strong>
                            </div>
                            <div className="text-gray-500 text-xs">
                              （= 安全庫存 × 2 - 現有庫存）
                            </div>
                          </div>
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

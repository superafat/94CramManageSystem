'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import ItemFormModal from './ItemFormModal';

interface StockItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  safetyStock: number;
  schoolYear: string;
  version: string;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

export default function ItemsPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [categories, setCategories] = useState<{id: string; name: string; color: string | null}[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/items');
      setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch items', error);
      setError('載入品項資料失敗');
      toast.error('無法載入資料');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const handleCreate = () => {
    setEditItem(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (item: StockItem) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`確定要刪除品項「${name}」嗎？`)) return;
    try {
      await api.delete(`/items/${id}`);
      toast.success('已刪除');
      fetchItems();
    } catch (error) {
      console.error('Delete failed', error);
      toast.error('刪除失敗');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && item.isActive) ||
      (filterStatus === 'inactive' && !item.isActive);
    const matchesCategory = filterCategory === 'all' || item.categoryId === filterCategory;
    return matchesSearch && matchesFilter && matchesCategory;
  });

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">品項管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理各分校的教材、耗材與公關品</p>
        </div>
        <button 
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-[#8FA895] text-white text-sm font-medium rounded-md hover:bg-[#7a9380] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895]"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增品項
        </button>
      </div>

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
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895]"
          >
            <option value="all">全部分類</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895]"
          >
            <option value="all">全部狀態</option>
            <option value="active">啟用中</option>
            <option value="inactive">已停用</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#8FA895] mb-3"></div>
          <p className="text-sm text-gray-500">載入品項資料中...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <p className="text-sm text-gray-500 mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={fetchItems}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
          >
            重新載入
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? '找不到符合條件的品項' : '尚未建立任何品項'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm ? '試試其他關鍵字' : '點擊「新增品項」建立第一個品項'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增品項
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && filteredItems.length > 0 && (
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品名</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">學年/版本</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">單位</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">安全庫存</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">動作</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(
            filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.categoryName ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${item.categoryColor || '#8FA895'}20`, color: item.categoryColor || '#8FA895' }}>
                        {item.categoryName}
                      </span>
                    ) : (
                      <span className="text-gray-400">未分類</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.schoolYear ? `${item.schoolYear}學年` : '-'} {item.version ? `v${item.version}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.safetyStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        啟用
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        停用
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3 text-gray-400">
                      <button onClick={() => handleEdit(item)} className="hover:text-blue-600 transition-colors" title="編輯">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.name)} className="hover:text-red-600 transition-colors" title="刪除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <ItemFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchItems}
        editItem={editItem}
      />
    </div>
  );
}

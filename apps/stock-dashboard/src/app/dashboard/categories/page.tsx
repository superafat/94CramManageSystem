'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  restockLeadDays: number;
  minOrderQuantity: number;
  createdAt: string;
}

const PRESET_COLORS = ['#8FA895', '#C4956A', '#9DAEBB', '#B5706E', '#A8B5A2', '#7B8FA1'];

const DEMO_CATEGORIES: Category[] = [
  { id: 'cat1', name: '講義', description: '各科講義教材', color: '#8FA895', restockLeadDays: 14, minOrderQuantity: 50, createdAt: '2026-01-01' },
  { id: 'cat2', name: '教材', description: '教學輔助教材', color: '#C4956A', restockLeadDays: 7, minOrderQuantity: 20, createdAt: '2026-01-01' },
  { id: 'cat3', name: '耗材', description: '辦公耗材用品', color: '#9DAEBB', restockLeadDays: 3, minOrderQuantity: 10, createdAt: '2026-01-01' },
];

const defaultForm = {
  name: '',
  color: '#8FA895',
  restockLeadDays: 7,
  minOrderQuantity: 1,
  description: '',
};

type FormState = typeof defaultForm;

interface ModalProps {
  isOpen: boolean;
  editCategory: Category | null;
  onClose: () => void;
  onSaved: () => void;
  isDemo: boolean;
}

function CategoryModal({ isOpen, editCategory, onClose, onSaved, isDemo }: ModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editCategory) {
        setForm({
          name: editCategory.name,
          color: editCategory.color,
          restockLeadDays: editCategory.restockLeadDays,
          minOrderQuantity: editCategory.minOrderQuantity,
          description: editCategory.description ?? '',
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [isOpen, editCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('請輸入分類名稱');
      return;
    }
    if (isDemo) {
      toast.error('Demo 模式無法儲存');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        restockLeadDays: form.restockLeadDays,
        minOrderQuantity: form.minOrderQuantity,
        description: form.description.trim() || null,
      };
      if (editCategory) {
        await api.put(`/categories/${editCategory.id}`, payload);
        toast.success('分類已更新');
      } else {
        await api.post('/categories', payload);
        toast.success('分類已新增');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save category:', err);
      toast.error(editCategory ? '更新失敗' : '新增失敗');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">
          {editCategory ? '編輯分類' : '新增分類'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分類名稱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分類名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例：講義、耗材"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895]"
            />
          </div>

          {/* 色標 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">色標</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: form.color === color ? '#374151' : 'transparent',
                    transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* 備貨天數 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備貨天數</label>
            <input
              type="number"
              min={0}
              value={form.restockLeadDays}
              onChange={(e) => setForm({ ...form, restockLeadDays: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895]"
            />
          </div>

          {/* 最低訂購量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最低訂購量</label>
            <input
              type="number"
              min={1}
              value={form.minOrderQuantity}
              onChange={(e) => setForm({ ...form, minOrderQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895]"
            />
          </div>

          {/* 說明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="選填說明文字"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8FA895] focus:border-[#8FA895] resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#8FA895] rounded-md hover:bg-[#7a9380] transition-colors disabled:opacity-60"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Category[]>('/categories');
      setCategories(res.data);
      setIsDemo(false);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      toast.error('無法載入分類資料，已切換為 Demo 模式');
      setIsDemo(true);
      setCategories(DEMO_CATEGORIES);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = () => {
    setEditCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`確定要刪除分類「${name}」嗎？`)) return;
    if (isDemo) {
      toast.error('Demo 模式無法刪除');
      return;
    }
    try {
      await api.delete(`/categories/${id}`);
      toast.success('已刪除');
      fetchCategories();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('刪除失敗');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">分類管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理教材品項分類、備貨天數與最低訂購量</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-[#8FA895] text-white text-sm font-medium rounded-md hover:bg-[#7a9380] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895]"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增分類
        </button>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          目前為 Demo 模式，顯示範例資料。實際操作需連線至後端服務。
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#8FA895] mb-3" />
          <p className="text-sm text-gray-500">載入分類資料中...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <p className="text-sm text-gray-500 mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={fetchCategories}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9380] transition-colors"
          >
            重新載入
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && categories.length === 0 && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">尚未建立任何分類</h3>
          <p className="text-sm text-gray-500 mb-4">點擊「新增分類」建立第一個品項分類</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9380] transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增分類
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && categories.length > 0 && (
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">色標</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類名稱</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備貨天數</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最低訂購量</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-block w-5 h-5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                      title={cat.color}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.restockLeadDays} 天</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.minOrderQuantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <span className="truncate block" title={cat.description ?? ''}>
                      {cat.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3 text-gray-400">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="hover:text-blue-600 transition-colors"
                        title="編輯"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="hover:text-red-600 transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        editCategory={editCategory}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchCategories}
        isDemo={isDemo}
      />
    </div>
  );
}

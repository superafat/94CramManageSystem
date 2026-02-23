'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

type ClassInfo = {
  id: string;
  name: string;
  grade: string | null;
  subject: string | null;
  schoolYear: string | null;
  studentCount: number | null;
};

type MaterialRow = {
  material: { id: string; itemId: string; quantityPerStudent: number };
  item: { id: string; name: string };
};

type RequiredRow = {
  itemId: string;
  itemName: string;
  requiredQty: number;
  currentQty: number;
  shortageQty: number;
};

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [requiredRows, setRequiredRows] = useState<RequiredRow[]>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [newMaterial, setNewMaterial] = useState({ itemId: '', quantityPerStudent: 1 });
  const [warehouseId, setWarehouseId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id;

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [classRes, materialRes, itemRes, warehouseRes] = await Promise.all([
        api.get<ClassInfo[]>('/classes'),
        api.get<MaterialRow[]>(`/classes/${id}/materials`),
        api.get<Array<{ id: string; name: string }>>('/items'),
        api.get<Array<{ id: string; name: string }>>('/warehouses'),
      ]);
      const foundClass = classRes.data.find((row) => row.id === id) || null;
      setClassInfo(foundClass);
      setMaterials(materialRes.data);
      setItems(itemRes.data);
      setWarehouses(warehouseRes.data);
      if (!warehouseId && warehouseRes.data.length > 0) {
        setWarehouseId(warehouseRes.data[0].id);
      }
    } catch (err) {
      setError('載入班級資料失敗');
      console.error('Failed to load class details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const calculateRequired = async () => {
    const res = await api.get<RequiredRow[]>(`/classes/${id}/required-stock`);
    setRequiredRows(res.data);
  };

  const addMaterial = async () => {
    if (!newMaterial.itemId) return;
    await api.post(`/classes/${id}/materials`, newMaterial);
    setNewMaterial({ itemId: '', quantityPerStudent: 1 });
    await load();
  };

  const removeMaterial = async (materialId: string) => {
    await api.delete(`/classes/${id}/materials/${materialId}`);
    await load();
  };

  const distribute = async () => {
    if (!warehouseId || requiredRows.length === 0) return;
    const records = requiredRows
      .filter((row) => row.requiredQty > 0)
      .map((row) => ({
        warehouseId,
        itemId: row.itemId,
        distributedQuantity: row.requiredQty,
      }));
    await api.post(`/classes/${id}/distribute`, { records });
    await calculateRequired();
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white border rounded-lg p-4 space-y-3 animate-pulse">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#8FA895] mb-3"></div>
          <p className="text-sm text-gray-500">載入班級資料中...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-4">
        <button className="text-sm text-gray-600" onClick={() => router.push('/dashboard/classes')}>← 返回班級列表</button>
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <p className="text-sm text-gray-500 mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!classInfo) {
    return (
      <div className="space-y-4">
        <button className="text-sm text-gray-600" onClick={() => router.push('/dashboard/classes')}>← 返回班級列表</button>
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">找不到此班級</h3>
          <p className="text-sm text-gray-500 mb-4">班級可能已被刪除或不存在</p>
          <button
            onClick={() => router.push('/dashboard/classes')}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
          >
            返回班級列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button className="text-sm text-gray-600" onClick={() => router.push('/dashboard/classes')}>← 返回班級列表</button>
      <h2 className="text-2xl font-bold text-gray-900">{classInfo.name} 教材配發</h2>
      <div className="bg-white border rounded-lg p-4 text-sm text-gray-700">
        年級：{classInfo.grade || '-'} / 科目：{classInfo.subject || '-'} / 學年：{classInfo.schoolYear || '-'} / 學生數：{classInfo.studentCount || 0}
      </div>

      <div className="bg-white border rounded-lg p-4 grid md:grid-cols-4 gap-2">
        <select className="border rounded px-2 py-2" value={newMaterial.itemId} onChange={(e) => setNewMaterial({ ...newMaterial, itemId: e.target.value })}>
          <option value="">選擇教材</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="border rounded px-2 py-2" type="number" min={1} value={newMaterial.quantityPerStudent} onChange={(e) => setNewMaterial({ ...newMaterial, quantityPerStudent: Number(e.target.value || 1) })} />
        <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={addMaterial}>新增班級教材</button>
      </div>

      {/* Materials List - Empty State */}
      {materials.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="text-base font-medium text-gray-900 mb-2">尚未設定教材</h3>
          <p className="text-sm text-gray-500">使用上方表單新增第一個教材</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">教材</th>
                <th className="p-2 text-left">每生用量</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((row) => (
                <tr key={row.material.id} className="border-t">
                  <td className="p-2">{row.item.name}</td>
                  <td className="p-2">{row.material.quantityPerStudent}</td>
                  <td className="p-2"><button className="text-red-700" onClick={() => removeMaterial(row.material.id)}>移除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={calculateRequired}>計算所需數量</button>
          <select className="border rounded px-2 py-2" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">選擇出庫倉庫</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
          <button className="bg-blue-600 text-white rounded px-3 py-2" onClick={distribute}>批次配發</button>
        </div>
        {requiredRows.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            點擊「計算所需數量」開始計算
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">教材</th>
                <th className="p-2 text-left">需求數量</th>
                <th className="p-2 text-left">現有庫存</th>
                <th className="p-2 text-left">差額</th>
              </tr>
            </thead>
            <tbody>
              {requiredRows.map((row) => (
                <tr key={row.itemId} className="border-t">
                  <td className="p-2">{row.itemName}</td>
                  <td className="p-2">{row.requiredQty}</td>
                  <td className="p-2">{row.currentQty}</td>
                  <td className={`p-2 ${row.shortageQty > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}`}>{row.shortageQty > 0 ? `缺 ${row.shortageQty}` : '足夠'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

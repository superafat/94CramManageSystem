'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRightLeft, Package, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

const transferSchema = z.object({
  fromWarehouseId: z.string().uuid('請選擇來源倉庫'),
  toWarehouseId: z.string().uuid('請選擇目標倉庫'),
  itemId: z.string().uuid('請選擇品項'),
  quantity: z.number().min(1, '數量必須大於 0'),
  notes: z.string().optional(),
}).refine(data => data.fromWarehouseId !== data.toWarehouseId, {
  message: '來源與目標倉庫不能相同',
  path: ['toWarehouseId'],
});

type TransferFormData = z.infer<typeof transferSchema>;

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Item {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

export default function TransferPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      quantity: 1,
    }
  });

  const fromWarehouseId = watch('fromWarehouseId');
  const selectedItemId = watch('itemId');
  const selectedItem = items.find(i => i.id === selectedItemId);

  useEffect(() => {
    fetchWarehouses();
    fetchItems();
    fetchRecentTransfers();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch items', error);
    }
  };

  const fetchRecentTransfers = async () => {
    try {
      const res = await api.get('/inventory/transactions');
      setRecentTransfers(res.data.filter((t: any) => t.transaction.transactionType === 'transfer_out').slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch transfers', error);
    }
  };

  const onSubmit = async (data: TransferFormData) => {
    try {
      await api.post('/inventory/transfer', data);
      toast.success('調撥成功');
      reset({ quantity: 1 });
      fetchRecentTransfers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || '調撥失敗');
    }
  };

  const fromWarehouse = warehouses.find(w => w.id === fromWarehouseId);

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">調撥作業</h2>
          <p className="text-sm text-gray-500 mt-1">分校間庫存轉移</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[#8FA895]" />
            新增調撥
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">來源倉庫 <span className="text-red-500">*</span></label>
                <select 
                  {...register('fromWarehouseId')} 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm bg-white"
                >
                  <option value="">選擇...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.fromWarehouseId && <p className="mt-1 text-xs text-red-500">{errors.fromWarehouseId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">目標倉庫 <span className="text-red-500">*</span></label>
                <select 
                  {...register('toWarehouseId')} 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm bg-white"
                >
                  <option value="">選擇...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.toWarehouseId && <p className="mt-1 text-xs text-red-500">{errors.toWarehouseId.message}</p>}
              </div>
            </div>

            {fromWarehouse && (
              <div className="flex items-center justify-center py-2">
                <div className="text-center">
                  <p className="text-sm text-gray-500">{fromWarehouse.name}</p>
                  <ArrowRight className="h-6 w-6 text-[#8FA895] mx-auto my-1" />
                  <p className="text-sm text-gray-500">目標倉庫</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">品項 <span className="text-red-500">*</span></label>
              <select 
                {...register('itemId')} 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm bg-white"
              >
                <option value="">選擇品項...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku || '無SKU'})
                  </option>
                ))}
              </select>
              {errors.itemId && <p className="mt-1 text-xs text-red-500">{errors.itemId.message}</p>}
            </div>

            {selectedItem && (
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
                <span className="font-medium">單位：</span> {selectedItem.unit}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">數量 <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                {...register('quantity', { valueAsNumber: true })} 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">備註</label>
              <textarea 
                {...register('notes')} 
                rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-[#8FA895] text-white text-sm font-medium rounded-md hover:bg-[#7a9380] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895] disabled:opacity-50"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {isSubmitting ? '處理中...' : '確認調撥'}
            </button>
          </form>
        </div>

        {/* Recent Transfers */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近調撥記錄</h3>
          
          {recentTransfers.length === 0 ? (
            <p className="text-gray-500 text-sm">暫無調撥記錄</p>
          ) : (
            <div className="space-y-3">
              {recentTransfers.map((t, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{t.item.name}</span>
                    <span className="font-bold text-[#8FA895]">{t.transaction.quantity}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t.warehouse.name} → 目標倉庫</p>
                  <p className="text-xs text-gray-400">{new Date(t.transaction.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

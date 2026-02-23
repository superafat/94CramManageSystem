'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { Plus, Package, Search, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import BarcodeScanner from '@/components/BarcodeScanner';

const stockInSchema = z.object({
  warehouseId: z.string().uuid('請選擇倉庫'),
  itemId: z.string().uuid('請選擇品項'),
  quantity: z.number().min(1, '數量必須大於 0'),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

type StockInFormData = z.infer<typeof stockInSchema>;

interface Warehouse {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface RecentTransaction {
  item: { name: string };
  warehouse: { name: string };
  transaction: { transactionType: string; quantity: number; createdAt: string };
}

export default function StockInPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [scanMode, setScanMode] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<StockInFormData>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      quantity: 1,
    }
  });

  const selectedItemId = watch('itemId');
  const selectedItem = items.find(i => i.id === selectedItemId);

  const handleScanDetected = async (barcode: string) => {
    try {
      const res = await api.get(`/barcodes/lookup/${encodeURIComponent(barcode)}`);
      setValue('itemId', res.data.item.id);
      toast.success(`已選取品項：${res.data.item.name}`);
      setScanMode(false);
    } catch {
      toast.error('找不到對應條碼');
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchItems();
    fetchRecentTransactions();
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

  const fetchRecentTransactions = async () => {
    try {
      const res = await api.get<RecentTransaction[]>('/inventory/transactions');
      setRecentTransactions(res.data.filter((t) => t.transaction.transactionType === 'purchase_in').slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    }
  };

  const onSubmit = async (data: StockInFormData) => {
    try {
      await api.post('/inventory/in', {
        ...data,
        referenceType: 'manual_stock_in'
      });
      toast.success('入庫成功');
      reset({ quantity: 1, warehouseId: data.warehouseId });
      fetchRecentTransactions();
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
        : undefined;
      toast.error(errorMessage || '入庫失敗');
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">入庫作業</h2>
          <p className="text-sm text-gray-500 mt-1">記錄進貨或盤盈入庫</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#8FA895]" />
            新增入庫
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">倉庫 <span className="text-red-500">*</span></label>
              <select 
                {...register('warehouseId')} 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm bg-white"
              >
                <option value="">選擇倉庫...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {errors.warehouseId && <p className="mt-1 text-xs text-red-500">{errors.warehouseId.message}</p>}
            </div>

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
              <button type="button" className="mt-2 text-sm text-[#6f8d75]" onClick={() => setScanMode((prev) => !prev)}>
                {scanMode ? '關閉掃描' : '掃描條碼選擇品項'}
              </button>
              {scanMode ? <div className="mt-2"><BarcodeScanner onDetected={handleScanDetected} /></div> : null}
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
              <label className="block text-sm font-medium text-gray-700">參考單號</label>
              <input 
                type="text" 
                {...register('referenceId')} 
                placeholder="例如：進貨單號"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">備註</label>
              <textarea 
                {...register('notes')} 
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-[#8FA895] text-white text-sm font-medium rounded-md hover:bg-[#7a9380] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895] disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? '處理中...' : '確認入庫'}
            </button>
          </form>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近入庫記錄</h3>
          
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-sm">暫無入庫記錄</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{t.item.name}</p>
                    <p className="text-xs text-gray-500">{t.warehouse.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#8FA895]">+{t.transaction.quantity}</p>
                    <p className="text-xs text-gray-400">{new Date(t.transaction.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

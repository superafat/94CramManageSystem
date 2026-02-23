'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { Minus, Package, User, Gift } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import BarcodeScanner from '@/components/BarcodeScanner';

const stockOutSchema = z.object({
  warehouseId: z.string().uuid('請選擇倉庫'),
  itemId: z.string().uuid('請選擇品項'),
  quantity: z.number().min(1, '數量必須大於 0'),
  transactionType: z.enum(['sale_out', 'promo_out', 'internal_use']),
  recipientName: z.string().optional(),
  recipientNote: z.string().optional(),
  referenceId: z.string().optional(),
});

type StockOutFormData = z.infer<typeof stockOutSchema>;

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

export default function StockOutPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [scanMode, setScanMode] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<StockOutFormData>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      quantity: 1,
      transactionType: 'sale_out',
    }
  });

  const transactionType = watch('transactionType');
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
      const outTypes = ['sale_out', 'promo_out', 'internal_use'];
      setRecentTransactions(res.data.filter((t) => outTypes.includes(t.transaction.transactionType)).slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    }
  };

  const onSubmit = async (data: StockOutFormData) => {
    try {
      await api.post('/inventory/out', {
        ...data,
        referenceType: 'manual_stock_out'
      });
      toast.success('出庫成功');
      reset({ quantity: 1, transactionType: 'sale_out', warehouseId: data.warehouseId });
      fetchRecentTransactions();
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
        : undefined;
      toast.error(errorMessage || '出庫失敗');
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'sale_out': return '銷售出庫';
      case 'promo_out': return '公關品';
      case 'internal_use': return '內部領用';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">出庫作業</h2>
          <p className="text-sm text-gray-500 mt-1">記錄銷售、公關品或內部領用</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Minus className="h-5 w-5 text-red-500" />
            新增出庫
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">出庫類型 <span className="text-red-500">*</span></label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {[
                  { value: 'sale_out', label: '銷售', icon: Package },
                  { value: 'promo_out', label: '公關品', icon: Gift },
                  { value: 'internal_use', label: '內部領用', icon: User },
                ].map(({ value, label, icon: Icon }) => (
                  <label key={value} className={`cursor-pointer flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                    transactionType === value 
                      ? 'bg-[#8FA895] text-white border-[#8FA895]' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      value={value}
                      {...register('transactionType')}
                      className="sr-only"
                    />
                    <Icon className="h-4 w-4" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

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

            {transactionType === 'promo_out' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">接收對象 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    {...register('recipientName')} 
                    placeholder="例如：王大明 / 某某活動"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">用途說明</label>
                  <textarea 
                    {...register('recipientNote')} 
                    placeholder="例如：開幕活動贈品"
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Minus className="mr-2 h-4 w-4" />
              {isSubmitting ? '處理中...' : '確認出庫'}
            </button>
          </form>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近出庫記錄</h3>
          
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-sm">暫無出庫記錄</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{t.item.name}</p>
                    <p className="text-xs text-gray-500">{t.warehouse.name}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
                      {getTransactionTypeLabel(t.transaction.transactionType)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500">{t.transaction.quantity}</p>
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

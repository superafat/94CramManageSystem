import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// 跟 Schema 對齊
const itemSchema = z.object({
  name: z.string().min(1, '請輸入品名'),
  sku: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  unit: z.string().min(1, '請輸入單位'),
  safetyStock: z.number().min(0, '必須為正數'),
  schoolYear: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: any;
}

export default function ItemFormModal({ isOpen, onClose, onSuccess, editItem }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const isEdit = !!editItem;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      sku: '',
      categoryId: '',
      unit: '本',
      safetyStock: 0,
      schoolYear: '',
      version: '',
      description: '',
      isActive: true,
    }
  });

  // 取得分類清單
  useEffect(() => {
    if (isOpen) {
      api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to fetch categories', err));

      if (isEdit && editItem) {
        reset({
          name: editItem.name,
          sku: editItem.sku || '',
          categoryId: editItem.categoryId || '',
          unit: editItem.unit,
          safetyStock: editItem.safetyStock || 0,
          schoolYear: editItem.schoolYear || '',
          version: editItem.version || '',
          description: editItem.description || '',
          isActive: editItem.isActive,
        });
      } else {
        reset({
          name: '', sku: '', categoryId: '', unit: '本',
          safetyStock: 0, schoolYear: '', version: '', description: '', isActive: true
        });
      }
    }
  }, [isOpen, isEdit, editItem, reset]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId === '' ? undefined : data.categoryId
      };

      if (isEdit) {
        await api.put(`/items/${editItem.id}`, payload);
        toast.success('更新成功');
      } else {
        await api.post('/items', payload);
        toast.success('新增成功');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || '操作失敗');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEdit ? '編輯品項' : '新增品項'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">品名 <span className="text-red-500">*</span></label>
                  <input type="text" {...register('name')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU (編號)</label>
                  <input type="text" {...register('sku')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">單位 <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="本、盒、個..." {...register('unit')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
                  {errors.unit && <p className="mt-1 text-xs text-red-500">{errors.unit.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">學年</label>
                  <input type="text" placeholder="例如：113" {...register('schoolYear')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">版本</label>
                  <input type="text" placeholder="例如：上冊、V2" {...register('version')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">安全庫存</label>
                  <input type="number" 
                         {...register('safetyStock', { valueAsNumber: true })} 
                         className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
                  {errors.safetyStock && <p className="mt-1 text-xs text-red-500">{errors.safetyStock.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">分類</label>
                  <select {...register('categoryId')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm bg-white">
                    <option value="">未分類</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">備註說明</label>
                <textarea {...register('description')} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#8FA895] focus:border-[#8FA895] sm:text-sm" />
              </div>

              <div className="flex items-center mt-4">
                <input type="checkbox" id="isActive" {...register('isActive')} className="h-4 w-4 text-[#8FA895] focus:ring-[#8FA895] border-gray-300 rounded" />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  啟用此品項
                </label>
              </div>
            </form>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              form="item-form"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#8FA895] text-base font-medium text-white hover:bg-[#7a9380] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FA895] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

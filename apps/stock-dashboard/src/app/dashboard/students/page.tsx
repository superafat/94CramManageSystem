'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type StudentRow = {
  student: {
    id: string;
    name: string;
    email?: string | null;
    externalId: string;
    tuitionPaid: boolean;
    isActive: boolean;
  };
  className?: string | null;
};

export default function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);

  useEffect(() => {
    api.get<StudentRow[]>('/integrations/students')
      .then((res) => setRows(res.data))
      .catch(() => toast.error('載入學生資料失敗'));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">學生管理</h2>
      <div className="bg-white rounded border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">姓名</th>
              <th className="p-2 text-left">班級</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">學費狀態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.student.id} className="border-t">
                <td className="p-2">{row.student.name}</td>
                <td className="p-2">{row.className || '-'}</td>
                <td className="p-2">{row.student.email || '-'}</td>
                <td className="p-2">
                  <span className={row.student.tuitionPaid ? 'text-green-700' : 'text-red-700'}>
                    {row.student.tuitionPaid ? '已繳費' : '未繳費'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="p-3 text-gray-500" colSpan={4}>尚無學生資料</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client'

export interface AdjustmentFormState {
  teacherId: string
  type: 'bonus' | 'deduction'
  name: string
  amount: string
  notes: string
}

export interface AdjustmentModalProps {
  teachers: { id: string; name: string }[]
  form: AdjustmentFormState
  onFormChange: (form: AdjustmentFormState) => void
  onSave: () => void
  onClose: () => void
}

export function AdjustmentModal({ teachers, form, onFormChange, onSave, onClose }: AdjustmentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-text mb-4">新增獎金/扣薪</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-muted mb-1">講師</label>
            <select
              value={form.teacherId}
              onChange={(e) => onFormChange({ ...form, teacherId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
            >
              <option value="">選擇講師</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">類型</label>
              <select
                value={form.type}
                onChange={(e) => onFormChange({ ...form, type: e.target.value as 'bonus' | 'deduction' })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
              >
                <option value="bonus">獎金</option>
                <option value="deduction">扣薪</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">金額</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                placeholder="金額"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">名目</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
              placeholder="如：全勤獎金、遲到扣薪"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">備註</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
              placeholder="選填"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-text">取消</button>
            <button onClick={onSave} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium">新增</button>
          </div>
        </div>
      </div>
    </div>
  )
}

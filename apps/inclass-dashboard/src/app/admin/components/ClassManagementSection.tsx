'use client'

interface ClassInfo {
  id: string
  name: string
  grade?: string
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

interface ClassForm {
  name: string
  grade: string
  feeMonthly: number
  feeQuarterly: number
  feeSemester: number
  feeYearly: number
}

interface ClassManagementSectionProps {
  classes: ClassInfo[]
  showClassForm: boolean
  editingClass: ClassInfo | null
  classForm: ClassForm
  onShowAddForm: () => void
  onHideForm: () => void
  onEditClass: (cls: ClassInfo) => void
  onDeleteClass: (id: string) => void
  onSaveClass: () => void
  onClassFormChange: (form: ClassForm) => void
}

export default function ClassManagementSection({
  classes,
  showClassForm,
  editingClass,
  classForm,
  onShowAddForm,
  onHideForm,
  onEditClass,
  onDeleteClass,
  onSaveClass,
  onClassFormChange,
}: ClassManagementSectionProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '24px auto' }}>
      <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📚 班級管理
          </h2>
          <button
            onClick={onShowAddForm}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ➕ 新增班級
          </button>
        </div>

        {showClassForm && (
          <div style={{ background: 'var(--background)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>{editingClass ? '✏️ 編輯班級' : '➕ 新增班級'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>班級名稱</label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => onClassFormChange({ ...classForm, name: e.target.value })}
                  placeholder="例：國一數學"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>年級</label>
                <input
                  type="text"
                  value={classForm.grade}
                  onChange={(e) => onClassFormChange({ ...classForm, grade: e.target.value })}
                  placeholder="例：一年級"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>月費</label>
                <input
                  type="number"
                  value={classForm.feeMonthly}
                  onChange={(e) => onClassFormChange({ ...classForm, feeMonthly: Number(e.target.value) })}
                  placeholder="3000"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>季費</label>
                <input
                  type="number"
                  value={classForm.feeQuarterly}
                  onChange={(e) => onClassFormChange({ ...classForm, feeQuarterly: Number(e.target.value) })}
                  placeholder="9000"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>學期費</label>
                <input
                  type="number"
                  value={classForm.feeSemester}
                  onChange={(e) => onClassFormChange({ ...classForm, feeSemester: Number(e.target.value) })}
                  placeholder="15000"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>學年費</label>
                <input
                  type="number"
                  value={classForm.feeYearly}
                  onChange={(e) => onClassFormChange({ ...classForm, feeYearly: Number(e.target.value) })}
                  placeholder="30000"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={onHideForm}
                style={{ flex: 1, padding: '10px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={onSaveClass}
                style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                儲存
              </button>
            </div>
          </div>
        )}

        {classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <p>還沒有班級</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {classes.map((cls) => (
              <div
                key={cls.id}
                style={{
                  padding: '16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{cls.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {cls.grade && `${cls.grade} · `}
                    月費 ${cls.feeMonthly || 0} · 季費 ${cls.feeQuarterly || 0} · 學期 ${cls.feeSemester || 0} · 學年 ${cls.feeYearly || 0}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onEditClass(cls)}
                    style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDeleteClass(cls.id)}
                    style={{ padding: '6px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

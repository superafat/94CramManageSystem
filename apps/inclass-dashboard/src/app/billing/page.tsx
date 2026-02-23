'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface ClassInfo {
  id: string
  name: string
  grade?: string
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

interface StudentBilling {
  id: string
  name: string
  grade?: string
  isPaid: boolean
  paymentRecord?: {
    id: string
    amount: number
    paymentType: string
    paymentDate: string
  }
}

interface BillingData {
  class: ClassInfo
  periodMonth: string
  students: StudentBilling[]
  stats: {
    total: number
    paid: number
    unpaid: number
  }
}

export default function BillingPage() {
  const router = useRouter()
  const { school } = useAuth()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  // 勾選狀態與實際金額
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [paymentType, setPaymentType] = useState<'monthly' | 'quarterly' | 'semester' | 'yearly'>('monthly')

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      fetchBilling()
    }
  }, [selectedClassId, selectedMonth])

  const fetchClasses = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.getClasses()
      setClasses(data.classes || [])
      if (data.classes?.length > 0) {
        setSelectedClassId(data.classes[0].id)
      } else {
        setSelectedClassId('')
        setBillingData(null)
      }
    } catch (e) {
      console.error(e)
      setError('讀取班級失敗，請稍後再試')
      showMessage('❌ 讀取班級失敗')
    }
    setLoading(false)
  }

  const fetchBilling = async () => {
    if (!selectedClassId) return
    setError('')
    setLoading(true)
    try {
      const data = await api.getClassBilling(selectedClassId, selectedMonth)
      setBillingData(data)
      
      // 初始化勾選狀態（未繳費的預設勾選）與金額
      const newSelected: Record<string, boolean> = {}
      const newAmounts: Record<string, number> = {}
      const defaultFee = getDefaultFee(data.class)
      
      data.students.forEach((s: StudentBilling) => {
        newSelected[s.id] = !s.isPaid
        newAmounts[s.id] = s.paymentRecord?.amount || defaultFee
      })
      
      setSelected(newSelected)
      setAmounts(newAmounts)
    } catch (e) {
      console.error(e)
      setBillingData(null)
      setError('讀取繳費資料失敗，請稍後再試')
      showMessage('❌ 讀取繳費資料失敗')
    }
    setLoading(false)
  }

  const getDefaultFee = (classInfo: ClassInfo): number => {
    switch (paymentType) {
      case 'monthly': return classInfo.feeMonthly || 0
      case 'quarterly': return classInfo.feeQuarterly || 0
      case 'semester': return classInfo.feeSemester || 0
      case 'yearly': return classInfo.feeYearly || 0
      default: return classInfo.feeMonthly || 0
    }
  }

  const handlePaymentTypeChange = (type: 'monthly' | 'quarterly' | 'semester' | 'yearly') => {
    setPaymentType(type)
    if (billingData) {
      const defaultFee = (() => {
        switch (type) {
          case 'monthly': return billingData.class.feeMonthly || 0
          case 'quarterly': return billingData.class.feeQuarterly || 0
          case 'semester': return billingData.class.feeSemester || 0
          case 'yearly': return billingData.class.feeYearly || 0
        }
      })()
      
      // 更新未繳費學生的預設金額
      const newAmounts = { ...amounts }
      billingData.students.forEach(s => {
        if (!s.isPaid) {
          newAmounts[s.id] = defaultFee
        }
      })
      setAmounts(newAmounts)
    }
  }

  const handleBatchPay = async () => {
    if (!billingData) return
    
    const selectedStudents = billingData.students.filter(s => selected[s.id] && !s.isPaid)
    if (selectedStudents.length === 0) {
      return showMessage('❌ 請先勾選要繳費的學生')
    }
    
    const today = new Date().toISOString().split('T')[0]
    const records = selectedStudents.map(s => ({
      studentId: s.id,
      classId: selectedClassId,
      paymentType,
      amount: amounts[s.id] || 0,
      periodMonth: selectedMonth,
      paymentDate: today,
    }))
    
    setSubmitting(true)
    try {
      await api.createPaymentRecordsBatch(records)
      showMessage(`✅ 成功為 ${records.length} 位學生繳費！`)
      fetchBilling() // 重新載入
    } catch (e) {
      showMessage(`❌ ${e instanceof Error ? e.message : '繳費失敗'}`)
    }
    setSubmitting(false)
  }

  const toggleSelectAll = () => {
    if (!billingData) return
    const unpaidStudents = billingData.students.filter(s => !s.isPaid)
    const allSelected = unpaidStudents.every(s => selected[s.id])
    
    const newSelected = { ...selected }
    unpaidStudents.forEach(s => {
      newSelected[s.id] = !allSelected
    })
    setSelected(newSelected)
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const formatCurrency = (num?: number) => {
    if (num === undefined || num === null) return '-'
    return `$${num.toLocaleString()}`
  }

  if (loading && classes.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>載入中...</div>
  }

  if (!loading && classes.length === 0) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}>💰 學費繳費管理</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>目前沒有可用班級，請先建立班級資料</div>
        <button
          onClick={fetchClasses}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
        >
          重新載入
        </button>
      </main>
    )
  }

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', margin: 0 }}>
            💰 學費繳費管理
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {school?.name}
          </p>
        </div>
        <button 
          onClick={() => router.push('/main')}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer' }}
        >
          ← 返回首頁
        </button>
      </div>

      {/* 選擇區 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>班級</label>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>月份</label>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
            />
          </div>
        </div>
        
        {/* 繳費類型選擇 */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>繳費類型</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['monthly', 'quarterly', 'semester', 'yearly'] as const).map(type => (
              <button
                key={type}
                onClick={() => handlePaymentTypeChange(type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: paymentType === type ? 'var(--primary)' : 'var(--background)',
                  color: paymentType === type ? 'white' : 'var(--text-primary)',
                  border: `2px solid ${paymentType === type ? 'var(--primary)' : 'var(--border)'}`,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {type === 'monthly' ? '月費' : type === 'quarterly' ? '季費' : type === 'semester' ? '學期費' : '學年費'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.35)', color: 'var(--error)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button
            onClick={() => (selectedClassId ? fetchBilling() : fetchClasses())}
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}
          >
            重試
          </button>
        </div>
      )}

      {loading && classes.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', border: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'center' }}>
          載入繳費資料中...
        </div>
      )}

      {!loading && !error && !billingData && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          目前沒有可顯示的繳費資料，請確認月份或稍後重試。
        </div>
      )}

      {/* 學費資訊 */}
      {billingData && (
        <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', color: 'white' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
            📊 {billingData.class.name} - 學費設定
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '13px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>月費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeMonthly)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>季費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeQuarterly)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>學期費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeSemester)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>學年費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeYearly)}</div>
            </div>
          </div>
          
          {/* 統計 */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{billingData.stats.total}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>總人數</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#90EE90' }}>{billingData.stats.paid}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>已繳費</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFB6C1' }}>{billingData.stats.unpaid}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>未繳費</div>
            </div>
          </div>
        </div>
      )}

      {/* 學生列表 */}
      {billingData && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: 'bold', margin: 0 }}>
              👥 學生繳費狀態
            </h2>
            <button 
              onClick={toggleSelectAll}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}
            >
              全選/取消
            </button>
          </div>
          
          {billingData.students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              此班級尚無學生
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {billingData.students.map(student => (
                <div 
                  key={student.id} 
                  style={{ 
                    padding: '12px', 
                    borderBottom: '1px solid var(--border)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: student.isPaid ? 'rgba(144, 238, 144, 0.1)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!student.isPaid && (
                      <input 
                        type="checkbox"
                        checked={selected[student.id] || false}
                        onChange={(e) => setSelected({ ...selected, [student.id]: e.target.checked })}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{student.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{student.grade || '-'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {student.isPaid ? (
                      <span style={{ 
                        padding: '6px 12px', 
                        borderRadius: 'var(--radius-sm)', 
                        background: 'var(--success)', 
                        color: 'white', 
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>
                        ✅ 已繳 {formatCurrency(student.paymentRecord?.amount)}
                      </span>
                    ) : (
                      <input 
                        type="number"
                        value={amounts[student.id] || 0}
                        onChange={(e) => setAmounts({ ...amounts, [student.id]: Number(e.target.value) })}
                        style={{ 
                          width: '100px', 
                          padding: '8px', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '2px solid var(--border)', 
                          fontSize: '14px',
                          textAlign: 'right'
                        }}
                        min="0"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 批次繳費按鈕 */}
      {billingData && billingData.stats.unpaid > 0 && (
        <button 
          onClick={handleBatchPay}
          disabled={submitting}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)', 
            background: submitting ? 'var(--text-secondary)' : 'var(--accent)', 
            color: 'white', 
            border: 'none', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {submitting ? '處理中...' : `💳 批次繳費 (${Object.values(selected).filter(Boolean).length} 人)`}
        </button>
      )}

      {/* Toast Message */}
      {message && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          background: 'rgba(74, 74, 74, 0.9)', 
          color: 'white', 
          padding: '16px 32px', 
          borderRadius: 'var(--radius-md)', 
          fontSize: '16px', 
          fontWeight: 'bold', 
          zIndex: 200, 
          boxShadow: 'var(--shadow-lg)' 
        }}>
          {message}
        </div>
      )}
    </main>
  )
}

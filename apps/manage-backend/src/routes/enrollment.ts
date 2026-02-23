// src/routes/enrollment.ts - 招生 API
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import type { RBACVariables } from '../middleware/rbac';

// ==================== 類型定義 ====================

interface Lead {
  id: number;
  name: string;
  phone: string;
  student_name: string;
  student_grade: string;
  interest_subjects: string;
  status: 'new' | 'contacted' | 'trial_scheduled' | 'trial_completed' | 'enrolled' | 'lost';
  follow_up_date?: string;
  trial_date?: string;
  trial_time?: string;
  created_at: string;
  updated_at?: string;
}

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface ConversionStats {
  period: 'week' | 'month' | 'quarter';
  startDate: string;
  endDate: string;
  newLeads: number;
  contacted: number;
  trialScheduled: number;
  trialCompleted: number;
  enrolled: number;
  lost: number;
  conversionRates: {
    leadToTrial: number;
    trialToEnrollment: number;
    overall: number;
  };
  avgDaysToConvert: number;
}

// ==================== 輔助函式與常數 ====================

const validPeriods = ['week', 'month', 'quarter'] as const;
type Period = typeof validPeriods[number];
const leadStatuses = ['new', 'contacted', 'trial_scheduled', 'trial_completed', 'enrolled', 'lost'] as const;
const trialRequestSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^09\d{8}$/, '電話格式錯誤（應為 09 開頭的 10 碼）'),
  student_name: z.string().min(1).max(100),
  student_grade: z.string().min(1).max(50),
  interest_subjects: z.string().max(200).optional(),
  trial_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '試聽日期格式錯誤（YYYY-MM-DD）'),
  trial_time: z.string().min(1).max(100),
});
const leadStatusUpdateSchema = z.object({
  status: z.enum(leadStatuses),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '跟進日期格式錯誤（YYYY-MM-DD）').optional(),
});
const leadIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, '無效的 Lead ID').transform((v) => Number(v)).refine((v) => Number.isFinite(v) && v > 0, '無效的 Lead ID'),
});
const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
const sanitizeString = (s: unknown) => typeof s === 'string' ? s.replace(/[<>]/g, '').trim() : '';
const toIntInRange = (input: string | undefined, min: number, max: number, def: number) => {
  const n = parseInt(String(input), 10);
  if (!Number.isFinite(n) || n < min || n > max) return def;
  return n;
};

// ==================== 路由設定 ====================

const enrollment = new Hono<{ Variables: RBACVariables }>();

// CORS 設定
enrollment.use('/*', cors());
enrollment.use('/*', authMiddleware);

// ==================== 資料庫模擬（實際應使用真實 DB） ====================

// 這裡應該連接到你的資料庫
// 暫時使用模擬數據
let mockLeads: Lead[] = [
  {
    id: 1,
    name: '王小明',
    phone: '0912345678',
    student_name: '王大寶',
    student_grade: '國一',
    interest_subjects: '數學,英文',
    status: 'trial_scheduled',
    trial_date: '2026-02-20',
    trial_time: '週六 14:00-15:30',
    follow_up_date: '2026-02-19',
    created_at: '2026-02-10T10:00:00Z'
  },
  {
    id: 2,
    name: '李美華',
    phone: '0923456789',
    student_name: '李小花',
    student_grade: '小五',
    interest_subjects: '數學,自然',
    status: 'contacted',
    follow_up_date: '2026-02-15',
    created_at: '2026-02-12T14:30:00Z'
  }
];

// ==================== API 端點 ====================

/**
 * GET /api/admin/enrollment/funnel
 * 招生漏斗數據
 */
enrollment.get('/funnel', async (c) => {
  try {
    const { period } = c.req.query();
    const per: Period = period && (validPeriods as readonly string[]).includes(period) ? (period as Period) : 'month';
    
    // 計算時間範圍
    const endDate = new Date();
    const startDate = new Date();
    
    switch (per) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }
    
    // 實際應該查詢資料庫
    // const leads = await db.query('SELECT * FROM leads WHERE created_at >= ? AND created_at <= ?', [startDate, endDate]);
    
    // 模擬數據
    const totalLeads = mockLeads.length;
    const statusCounts = {
      new: mockLeads.filter(l => l.status === 'new').length,
      contacted: mockLeads.filter(l => l.status === 'contacted').length,
      trial_scheduled: mockLeads.filter(l => l.status === 'trial_scheduled').length,
      trial_completed: mockLeads.filter(l => l.status === 'trial_completed').length,
      enrolled: mockLeads.filter(l => l.status === 'enrolled').length,
      lost: mockLeads.filter(l => l.status === 'lost').length
    };
    
    const funnelData: FunnelData[] = [
      {
        stage: '新諮詢',
        count: totalLeads,
        percentage: 100
      },
      {
        stage: '已聯絡',
        count: totalLeads - statusCounts.new,
        percentage: Math.round(((totalLeads - statusCounts.new) / totalLeads) * 100)
      },
      {
        stage: '預約試聽',
        count: statusCounts.trial_scheduled + statusCounts.trial_completed + statusCounts.enrolled,
        percentage: Math.round(((statusCounts.trial_scheduled + statusCounts.trial_completed + statusCounts.enrolled) / totalLeads) * 100)
      },
      {
        stage: '完成試聽',
        count: statusCounts.trial_completed + statusCounts.enrolled,
        percentage: Math.round(((statusCounts.trial_completed + statusCounts.enrolled) / totalLeads) * 100)
      },
      {
        stage: '正式報名',
        count: statusCounts.enrolled,
        percentage: Math.round((statusCounts.enrolled / totalLeads) * 100)
      }
    ];
    
    return c.json({
      success: true,
      data: {
        period: per,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalLeads,
        funnel: funnelData,
        statusBreakdown: statusCounts
      }
    });
  } catch (error) {
    console.error('獲取漏斗數據失敗:', error);
    return c.json({ success: false, error: '獲取數據失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/conversion
 * 轉換率統計
 */
enrollment.get('/conversion', async (c) => {
  try {
    const { period } = c.req.query();
    const per: Period = period && (validPeriods as readonly string[]).includes(period) ? (period as Period) : 'month';
    
    // 計算時間範圍
    const endDate = new Date();
    const startDate = new Date();
    
    switch (per) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }
    
    // 實際應該查詢資料庫並計算轉換天數
    // const leads = await db.query('SELECT * FROM leads WHERE created_at >= ? AND created_at <= ?', [startDate, endDate]);
    
    const newLeads = mockLeads.length;
    const contacted = mockLeads.filter(l => ['contacted', 'trial_scheduled', 'trial_completed', 'enrolled'].includes(l.status)).length;
    const trialScheduled = mockLeads.filter(l => ['trial_scheduled', 'trial_completed', 'enrolled'].includes(l.status)).length;
    const trialCompleted = mockLeads.filter(l => ['trial_completed', 'enrolled'].includes(l.status)).length;
    const enrolled = mockLeads.filter(l => l.status === 'enrolled').length;
    const lost = mockLeads.filter(l => l.status === 'lost').length;
    
    const stats: ConversionStats = {
      period: per,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      newLeads,
      contacted,
      trialScheduled,
      trialCompleted,
      enrolled,
      lost,
      conversionRates: {
        leadToTrial: newLeads > 0 ? trialScheduled / newLeads : 0,
        trialToEnrollment: trialCompleted > 0 ? enrolled / trialCompleted : 0,
        overall: newLeads > 0 ? enrolled / newLeads : 0
      },
      avgDaysToConvert: 7 // 模擬數據
    };
    
    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('獲取轉換率統計失敗:', error);
    return c.json({ success: false, error: '獲取數據失敗' }, 500);
  }
});

/**
 * POST /api/admin/enrollment/trial
 * 預約試聽
 */
enrollment.post('/trial', zValidator('json', trialRequestSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const name = sanitizeString(body.name);
    const studentName = sanitizeString(body.student_name);
    const studentGrade = sanitizeString(body.student_grade);
    const interestSubjects = sanitizeString(body.interest_subjects || '');
    const phone = body.phone.trim();
    
    // 檢查試聽日期是否為未來
    const trialDate = new Date(body.trial_date);
    if (isNaN(trialDate.getTime())) {
      return c.json({ success: false, error: '試聽日期格式錯誤（YYYY-MM-DD）' }, 400);
    }
    if (trialDate < new Date()) {
      return c.json({
        success: false,
        error: '試聽日期必須是未來時間'
      }, 400);
    }
    
    // 建立新 lead
    const newLead: Lead = {
      id: mockLeads.length + 1,
      name: name,
      phone: phone,
      student_name: studentName,
      student_grade: studentGrade,
      interest_subjects: interestSubjects,
      status: 'trial_scheduled',
      trial_date: body.trial_date,
      trial_time: sanitizeString(body.trial_time),
      follow_up_date: body.trial_date, // 試聽當天跟進
      created_at: new Date().toISOString()
    };
    
    // 實際應該存入資料庫
    // await db.query('INSERT INTO leads SET ?', [newLead]);
    
    mockLeads.push(newLead);
    
    // 發送通知（應該整合 notifications.ts）
    // await onTrialScheduled(bot, newLead.id, chatId);
    
    return c.json({
      success: true,
      data: {
        leadId: newLead.id,
        message: '試聽預約成功！',
        trial: {
          date: newLead.trial_date,
          time: newLead.trial_time,
          student: newLead.student_name
        }
      }
    }, 201);
  } catch (error) {
    console.error('預約試聽失敗:', error);
    return c.json({ success: false, error: '預約失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/trial/available-slots
 * 獲取可用試聽時段
 */
enrollment.get('/trial/available-slots', async (c) => {
  try {
    const { date } = c.req.query();
    if (date && !isValidISODate(date)) {
      return c.json({ success: false, error: '日期格式錯誤（YYYY-MM-DD）' }, 400);
    }
    
    // 預設時段
    const allSlots = [
      { time: '09:00-10:30', available: true },
      { time: '10:30-12:00', available: true },
      { time: '14:00-15:30', available: true },
      { time: '15:30-17:00', available: true },
      { time: '18:00-19:30', available: true },
      { time: '19:30-21:00', available: true }
    ];
    
    // 如果指定日期，檢查該日期的預約情況
    if (date) {
      // 實際應該查詢資料庫
      // const bookedSlots = await db.query('SELECT trial_time FROM leads WHERE trial_date = ?', [date]);
      
      const bookedSlots = mockLeads
        .filter(l => l.trial_date === date)
        .map(l => l.trial_time);
      
      allSlots.forEach(slot => {
        if (bookedSlots.includes(slot.time)) {
          slot.available = false;
        }
      });
    }
    
    return c.json({
      success: true,
      data: {
        date: date || '未指定',
        slots: allSlots
      }
    });
  } catch (error) {
    console.error('獲取可用時段失敗:', error);
    return c.json({ success: false, error: '獲取時段失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/stats/daily
 * 每日招生統計（Dashboard 用）
 */
enrollment.get('/stats/daily', async (c) => {
  try {
    const { days } = c.req.query();
    const numDays = toIntInRange(days, 1, 30, 7);
    
    const dailyStats = [];
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // 實際應該查詢資料庫
      const dayLeads = mockLeads.filter(l => l.created_at.startsWith(dateString));
      
      dailyStats.push({
        date: dateString,
        newLeads: dayLeads.length,
        trials: dayLeads.filter(l => l.status === 'trial_scheduled').length,
        enrolled: dayLeads.filter(l => l.status === 'enrolled').length
      });
    }
    
    return c.json({
      success: true,
      data: dailyStats
    });
  } catch (error) {
    console.error('獲取每日統計失敗:', error);
    return c.json({ success: false, error: '獲取統計失敗' }, 500);
  }
});

/**
 * PATCH /api/admin/enrollment/lead/:id/status
 * 更新 Lead 狀態
 */
enrollment.patch('/lead/:id/status',
  zValidator('param', leadIdParamSchema),
  zValidator('json', leadStatusUpdateSchema),
  async (c) => {
  try {
    const { id: leadId } = c.req.valid('param');
    const { status, follow_up_date } = c.req.valid('json');
    
    // 尋找 lead
    const leadIndex = mockLeads.findIndex(l => l.id === leadId);
    if (leadIndex === -1) {
      return c.json({
        success: false,
        error: 'Lead 不存在'
      }, 404);
    }
    
    // 更新狀態
    mockLeads[leadIndex].status = status;
    if (follow_up_date) {
      if (!isValidISODate(follow_up_date)) {
        return c.json({ success: false, error: '跟進日期格式錯誤（YYYY-MM-DD）' }, 400);
      }
      mockLeads[leadIndex].follow_up_date = follow_up_date;
    }
    mockLeads[leadIndex].updated_at = new Date().toISOString();
    
    // 實際應該更新資料庫
    // await db.query('UPDATE leads SET status = ?, follow_up_date = ?, updated_at = NOW() WHERE id = ?', 
    //   [status, follow_up_date, leadId]);
    
    return c.json({
      success: true,
      data: mockLeads[leadIndex]
    });
  } catch (error) {
    console.error('更新 Lead 狀態失敗:', error);
    return c.json({ success: false, error: '更新失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/performance
 * 顧問績效統計（如果有多位顧問）
 */
enrollment.get('/performance', async (c) => {
  try {
    const { period = 'month', advisor_id } = c.req.query();
    
    // 這裡應該根據顧問統計業績
    // 暫時回傳總體數據
    
    const performance = {
      advisor: advisor_id || 'all',
      period,
      metrics: {
        totalLeads: mockLeads.length,
        conversionRate: 0.3,
        avgResponseTime: '2.5 小時',
        trialsScheduled: mockLeads.filter(l => l.status === 'trial_scheduled').length,
        enrollments: mockLeads.filter(l => l.status === 'enrolled').length,
        revenue: mockLeads.filter(l => l.status === 'enrolled').length * 5000 // 假設平均學費
      }
    };
    
    return c.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('獲取績效統計失敗:', error);
    return c.json({ success: false, error: '獲取統計失敗' }, 500);
  }
});

// ==================== 匯出路由 ====================

export default enrollment;

// ==================== 使用範例（在主 app 中整合） ====================

/*
// app.ts
import { Hono } from 'hono';
import enrollment from './routes/enrollment';

const app = new Hono();

app.route('/api/admin/enrollment', enrollment);

export default app;
*/

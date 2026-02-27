// src/routes/enrollment.ts - 招生 API（Drizzle ORM 版本）
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gte, isNull, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { RBACVariables } from '../middleware/rbac';
import { db } from '../db';
import { manageLeads } from '../db/schema';
import { logger } from '../utils/logger'

// ==================== 類型定義 ====================

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
  id: z.string().uuid('無效的 Lead ID'),
});

const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
const sanitizeString = (s: unknown) => typeof s === 'string' ? s.replace(/[<>]/g, '').trim() : '';
const toIntInRange = (input: string | undefined, min: number, max: number, def: number) => {
  const n = parseInt(String(input), 10);
  if (!Number.isFinite(n) || n < min || n > max) return def;
  return n;
};
const toPercentage = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;
const getTenantId = (c: Context<{ Variables: RBACVariables }>): string | null => {
  const user = c.get('user');
  if (!user?.tenant_id || typeof user.tenant_id !== 'string' || user.tenant_id.trim().length === 0) return null;
  return user.tenant_id;
};

// 將 Drizzle row 轉換為 snake_case 回應格式
function toSnakeCase(lead: typeof manageLeads.$inferSelect) {
  return {
    id: lead.id,
    tenant_id: lead.tenantId,
    name: lead.name,
    phone: lead.phone,
    student_name: lead.studentName,
    student_grade: lead.studentGrade,
    interest_subjects: lead.interestSubjects,
    status: lead.status,
    follow_up_date: lead.followUpDate ? lead.followUpDate.toISOString().split('T')[0] : null,
    trial_date: lead.trialDate ? lead.trialDate.toISOString().split('T')[0] : null,
    trial_time: lead.trialTime,
    assigned_to: lead.assignedTo,
    notes: lead.notes,
    created_at: lead.createdAt ? lead.createdAt.toISOString() : null,
    updated_at: lead.updatedAt ? lead.updatedAt.toISOString() : null,
  };
}

// ==================== 路由設定 ====================

const enrollment = new Hono<{ Variables: RBACVariables }>();

enrollment.use('/*', authMiddleware);

// ==================== API 端點 ====================

/**
 * GET /api/admin/enrollment/funnel
 * 招生漏斗數據
 */
enrollment.get('/funnel', async (c) => {
  try {
    const currentTenantId = getTenantId(c);
    if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
    const { period } = c.req.query();
    const per: Period = period && (validPeriods as readonly string[]).includes(period) ? (period as Period) : 'month';

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

    const leads = await db.select().from(manageLeads).where(
      and(
        eq(manageLeads.tenantId, currentTenantId),
        isNull(manageLeads.deletedAt),
        gte(manageLeads.createdAt, startDate)
      )
    );

    const totalLeads = leads.length;
    const statusCounts = {
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      trial_scheduled: leads.filter(l => l.status === 'trial_scheduled').length,
      trial_completed: leads.filter(l => l.status === 'trial_completed').length,
      enrolled: leads.filter(l => l.status === 'enrolled').length,
      lost: leads.filter(l => l.status === 'lost').length,
    };

    const funnelData: FunnelData[] = [
      {
        stage: '新諮詢',
        count: totalLeads,
        percentage: 100,
      },
      {
        stage: '已聯絡',
        count: totalLeads - statusCounts.new,
        percentage: toPercentage(totalLeads - statusCounts.new, totalLeads),
      },
      {
        stage: '預約試聽',
        count: statusCounts.trial_scheduled + statusCounts.trial_completed + statusCounts.enrolled,
        percentage: toPercentage(statusCounts.trial_scheduled + statusCounts.trial_completed + statusCounts.enrolled, totalLeads),
      },
      {
        stage: '完成試聽',
        count: statusCounts.trial_completed + statusCounts.enrolled,
        percentage: toPercentage(statusCounts.trial_completed + statusCounts.enrolled, totalLeads),
      },
      {
        stage: '正式報名',
        count: statusCounts.enrolled,
        percentage: toPercentage(statusCounts.enrolled, totalLeads),
      },
    ];

    return c.json({
      success: true,
      data: {
        period: per,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalLeads,
        funnel: funnelData,
        statusBreakdown: statusCounts,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '獲取漏斗數據失敗:');
    return c.json({ success: false, error: '獲取數據失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/conversion
 * 轉換率統計
 */
enrollment.get('/conversion', async (c) => {
  try {
    const currentTenantId = getTenantId(c);
    if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
    const { period } = c.req.query();
    const per: Period = period && (validPeriods as readonly string[]).includes(period) ? (period as Period) : 'month';

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

    const leads = await db.select().from(manageLeads).where(
      and(
        eq(manageLeads.tenantId, currentTenantId),
        isNull(manageLeads.deletedAt),
        gte(manageLeads.createdAt, startDate)
      )
    );

    const newLeads = leads.length;
    const contacted = leads.filter(l => ['contacted', 'trial_scheduled', 'trial_completed', 'enrolled'].includes(l.status)).length;
    const trialScheduled = leads.filter(l => ['trial_scheduled', 'trial_completed', 'enrolled'].includes(l.status)).length;
    const trialCompleted = leads.filter(l => ['trial_completed', 'enrolled'].includes(l.status)).length;
    const enrolled = leads.filter(l => l.status === 'enrolled').length;
    const lost = leads.filter(l => l.status === 'lost').length;

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
        overall: newLeads > 0 ? enrolled / newLeads : 0,
      },
      avgDaysToConvert: 0,
    };

    return c.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ err: error }, '獲取轉換率統計失敗:');
    return c.json({ success: false, error: '獲取數據失敗' }, 500);
  }
});

/**
 * POST /api/admin/enrollment/trial
 * 預約試聽
 */
enrollment.post('/trial', zValidator('json', trialRequestSchema), async (c) => {
  try {
    const currentTenantId = getTenantId(c);
    if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
    const body = c.req.valid('json');
    const name = sanitizeString(body.name);
    const studentName = sanitizeString(body.student_name);
    const studentGrade = sanitizeString(body.student_grade);
    const interestSubjects = sanitizeString(body.interest_subjects || '');
    const phone = body.phone.trim();

    const trialDate = new Date(body.trial_date);
    if (isNaN(trialDate.getTime())) {
      return c.json({ success: false, error: '試聽日期格式錯誤（YYYY-MM-DD）' }, 400);
    }
    if (trialDate < new Date()) {
      return c.json({ success: false, error: '試聽日期必須是未來時間' }, 400);
    }

    const [newLead] = await db.insert(manageLeads).values({
      tenantId: currentTenantId,
      name,
      phone,
      studentName,
      studentGrade,
      interestSubjects,
      status: 'trial_scheduled',
      trialDate,
      trialTime: sanitizeString(body.trial_time),
      followUpDate: trialDate,
    }).returning();

    return c.json({
      success: true,
      data: {
        leadId: newLead.id,
        message: '試聽預約成功！',
        trial: {
          date: newLead.trialDate ? newLead.trialDate.toISOString().split('T')[0] : null,
          time: newLead.trialTime,
          student: newLead.studentName,
        },
      },
    }, 201);
  } catch (error) {
    logger.error({ err: error }, '預約試聽失敗:');
    return c.json({ success: false, error: '預約失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/trial/available-slots
 * 獲取可用試聽時段
 */
enrollment.get('/trial/available-slots', async (c) => {
  try {
    const currentTenantId = getTenantId(c);
    if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
    const { date } = c.req.query();
    if (date && !isValidISODate(date)) {
      return c.json({ success: false, error: '日期格式錯誤（YYYY-MM-DD）' }, 400);
    }

    const allSlots = [
      { time: '09:00-10:30', available: true },
      { time: '10:30-12:00', available: true },
      { time: '14:00-15:30', available: true },
      { time: '15:30-17:00', available: true },
      { time: '18:00-19:30', available: true },
      { time: '19:30-21:00', available: true },
    ];

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const bookedLeads = await db.select({ trialTime: manageLeads.trialTime })
        .from(manageLeads)
        .where(
          and(
            eq(manageLeads.tenantId, currentTenantId),
            isNull(manageLeads.deletedAt),
            gte(manageLeads.trialDate, targetDate),
            sql`${manageLeads.trialDate} < ${nextDay}`
          )
        );

      const bookedTimes = new Set(bookedLeads.map(l => l.trialTime).filter(Boolean));
      allSlots.forEach(slot => {
        if (bookedTimes.has(slot.time)) {
          slot.available = false;
        }
      });
    }

    return c.json({
      success: true,
      data: {
        date: date || '未指定',
        slots: allSlots,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '獲取可用時段失敗:');
    return c.json({ success: false, error: '獲取時段失敗' }, 500);
  }
});

/**
 * GET /api/admin/enrollment/stats/daily
 * 每日招生統計（Dashboard 用）
 */
enrollment.get('/stats/daily', async (c) => {
  try {
    const currentTenantId = getTenantId(c);
    if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
    const { days } = c.req.query();
    const numDays = toIntInRange(days, 1, 30, 7);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (numDays - 1));
    startDate.setHours(0, 0, 0, 0);

    const leads = await db.select().from(manageLeads).where(
      and(
        eq(manageLeads.tenantId, currentTenantId),
        isNull(manageLeads.deletedAt),
        gte(manageLeads.createdAt, startDate)
      )
    );

    const dailyStats = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const dayLeads = leads.filter(l => l.createdAt && l.createdAt.toISOString().startsWith(dateString));

      dailyStats.push({
        date: dateString,
        newLeads: dayLeads.length,
        trials: dayLeads.filter(l => l.status === 'trial_scheduled').length,
        enrolled: dayLeads.filter(l => l.status === 'enrolled').length,
      });
    }

    return c.json({ success: true, data: dailyStats });
  } catch (error) {
    logger.error({ err: error }, '獲取每日統計失敗:');
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
      const currentTenantId = getTenantId(c);
      if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
      const { id: leadId } = c.req.valid('param');
      const { status, follow_up_date } = c.req.valid('json');

      if (follow_up_date && !isValidISODate(follow_up_date)) {
        return c.json({ success: false, error: '跟進日期格式錯誤（YYYY-MM-DD）' }, 400);
      }

      const updateValues: Partial<typeof manageLeads.$inferInsert> = {
        status,
        updatedAt: new Date(),
      };

      if (follow_up_date) {
        updateValues.followUpDate = new Date(follow_up_date);
      }

      const [updated] = await db.update(manageLeads)
        .set(updateValues)
        .where(
          and(
            eq(manageLeads.id, leadId),
            eq(manageLeads.tenantId, currentTenantId),
            isNull(manageLeads.deletedAt)
          )
        )
        .returning();

      if (!updated) {
        return c.json({ success: false, error: 'Lead 不存在' }, 404);
      }

      return c.json({ success: true, data: toSnakeCase(updated) });
    } catch (error) {
      logger.error({ err: error }, '更新 Lead 狀態失敗:');
      return c.json({ success: false, error: '更新失敗' }, 500);
    }
  }
);

/**
 * GET /api/admin/enrollment/performance
 * 顧問績效統計
 */
enrollment.get('/performance', async (c) => {
  try {
    const currentTenantId = getTenantId(c);
    if (!currentTenantId) return c.json({ success: false, error: 'Missing tenant context' }, 400);
    const { period = 'month', advisor_id } = c.req.query();

    const startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const whereConditions = [
      eq(manageLeads.tenantId, currentTenantId),
      isNull(manageLeads.deletedAt),
      gte(manageLeads.createdAt, startDate),
    ];

    if (advisor_id) {
      whereConditions.push(eq(manageLeads.assignedTo, advisor_id));
    }

    const leads = await db.select().from(manageLeads).where(and(...whereConditions));

    const performance = {
      advisor: advisor_id || 'all',
      period,
      metrics: {
        totalLeads: leads.length,
        conversionRate: leads.length > 0 ? leads.filter(l => l.status === 'enrolled').length / leads.length : 0,
        avgResponseTime: '—',
        trialsScheduled: leads.filter(l => l.status === 'trial_scheduled').length,
        enrollments: leads.filter(l => l.status === 'enrolled').length,
        revenue: leads.filter(l => l.status === 'enrolled').length * 5000,
      },
    };

    return c.json({ success: true, data: performance });
  } catch (error) {
    logger.error({ err: error }, '獲取績效統計失敗:');
    return c.json({ success: false, error: '獲取統計失敗' }, 500);
  }
});

// ==================== 匯出路由 ====================

export default enrollment;

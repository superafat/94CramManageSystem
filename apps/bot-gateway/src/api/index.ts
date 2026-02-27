import { Hono } from 'hono';
import { randomInt } from 'crypto';
import { verify } from '@94cram/shared/auth';
import { config } from '../config';
import { dashboardAuth, type DashboardUser } from '../middleware/auth';
import { getOrCreateSubscription, upsertSubscription } from '../firestore/subscriptions';
import { getBinding, type UserBinding } from '../firestore/bindings';
import { getSettings, upsertSettings } from '../firestore/settings';
import { getUsage } from '../firestore/usage';
import { getParentBinding, listParentBindings, deleteParentBinding } from '../firestore/parent-bindings';
import { createParentInvite, listParentInvites, generateInviteCode } from '../firestore/parent-invites';
import { firestore } from '../firestore/client';

type Env = { Variables: { user: DashboardUser } };

export const apiRouter = new Hono<Env>();

// --- Auth verify (no middleware — this IS the auth check endpoint) ---
apiRouter.post('/auth/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ valid: false }, 401);
  }

  const jwtSecret = config.JWT_SECRET;
  if (!jwtSecret) {
    return c.json({ valid: false, error: 'Auth not configured' }, 500);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, jwtSecret);
    return c.json({
      valid: true,
      user: {
        userId: payload.userId,
        tenantId: payload.tenantId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch {
    return c.json({ valid: false }, 401);
  }
});

// All other /api/* routes require JWT auth
apiRouter.use('/*', dashboardAuth);

// --- Subscriptions ---
apiRouter.get('/subscriptions', async (c) => {
  const user = c.get('user');
  const sub = await getOrCreateSubscription(user.tenantId);
  return c.json(sub);
});

apiRouter.put('/subscriptions', async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;
  const allowed = [
    'plan', 'admin_bot_active', 'parent_bot_active',
    'parent_limit', 'ai_calls_limit',
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  await upsertSubscription(user.tenantId, updates);
  const sub = await getOrCreateSubscription(user.tenantId);
  return c.json(sub);
});

// --- Bind Codes (千里眼 admin bot) ---
apiRouter.post('/bind-codes', async (c) => {
  const user = c.get('user');
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await firestore.collection('bot_bind_codes').doc(code).set({
    code,
    tenant_id: user.tenantId,
    tenant_name: user.name,
    used: false,
    created_by: user.userId,
    created_at: new Date(),
    expires_at: expiresAt,
  });

  return c.json({ code, expires_at: expiresAt.toISOString() }, 201);
});

apiRouter.get('/bind-codes', async (c) => {
  const user = c.get('user');
  const snapshot = await firestore
    .collection('bot_bind_codes')
    .where('tenant_id', '==', user.tenantId)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get();

  const codes = snapshot.docs.map((doc) => doc.data());
  return c.json(codes);
});

// --- Bindings (千里眼 admin bot users) ---
apiRouter.get('/bindings', async (c) => {
  const user = c.get('user');
  const snapshot = await firestore.collection('bot_user_bindings').get();

  const bindings: Array<Record<string, unknown>> = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() as UserBinding;
    const hasTenant = data.bindings.some((b) => b.tenant_id === user.tenantId);
    if (hasTenant) {
      bindings.push({ telegram_user_id: doc.id, ...data });
    }
  }
  return c.json(bindings);
});

apiRouter.delete('/bindings/:userId', async (c) => {
  const user = c.get('user');
  const targetUserId = c.req.param('userId');
  const ref = firestore.collection('bot_user_bindings').doc(targetUserId);
  const doc = await ref.get();

  if (!doc.exists) {
    return c.json({ error: 'Binding not found' }, 404);
  }

  const data = doc.data() as UserBinding;
  const updatedBindings = data.bindings.filter((b) => b.tenant_id !== user.tenantId);

  if (updatedBindings.length === 0) {
    await ref.delete();
  } else {
    const newActive = updatedBindings[0];
    await ref.update({
      bindings: updatedBindings,
      active_tenant_id: data.active_tenant_id === user.tenantId ? newActive.tenant_id : data.active_tenant_id,
      active_tenant_name: data.active_tenant_id === user.tenantId ? newActive.tenant_name : data.active_tenant_name,
    });
  }

  return c.json({ success: true });
});

// --- Parent Invites (順風耳 parent bot) ---
apiRouter.post('/parent-invites', async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;
  const { student_id, student_name } = body as { student_id?: string; student_name?: string };

  if (!student_id || !student_name) {
    return c.json({ error: 'student_id and student_name are required' }, 400);
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await createParentInvite({
    code,
    tenant_id: user.tenantId,
    student_id,
    student_name,
    expires_at: expiresAt,
  });

  return c.json({ code, expires_at: expiresAt.toISOString() }, 201);
});

apiRouter.get('/parent-invites', async (c) => {
  const user = c.get('user');
  const invites = await listParentInvites(user.tenantId);
  return c.json(invites);
});

// --- Parent Bindings (順風耳 bound parents) ---
apiRouter.get('/parent-bindings', async (c) => {
  const user = c.get('user');
  const bindings = await listParentBindings(user.tenantId);
  return c.json(bindings);
});

apiRouter.delete('/parent-bindings/:userId', async (c) => {
  const targetUserId = c.req.param('userId');
  const binding = await getParentBinding(targetUserId);

  if (!binding) {
    return c.json({ error: 'Parent binding not found' }, 404);
  }

  await deleteParentBinding(targetUserId);
  return c.json({ success: true });
});

// --- Usage ---
apiRouter.get('/usage', async (c) => {
  const user = c.get('user');
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const usage = await getUsage(user.tenantId, month);

  return c.json(usage ?? {
    tenant_id: user.tenantId,
    month,
    ai_calls: 0,
    api_calls: 0,
    ai_tokens_used: 0,
    daily_breakdown: {},
  });
});

// --- Settings ---
apiRouter.get('/settings', async (c) => {
  const user = c.get('user');
  const settings = await getSettings(user.tenantId);

  return c.json(settings ?? {
    tenant_id: user.tenantId,
    enabled_modules: ['manage', 'inclass', 'stock'],
    welcome_message: '歡迎使用 蜂神榜 補習班 Ai 助手系統！',
    plan: 'free',
    max_bindings: 5,
    max_ai_calls: 100,
    log_retention_days: 30,
  });
});

apiRouter.put('/settings', async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;
  const allowed = [
    'enabled_modules', 'welcome_message', 'max_bindings',
    'max_ai_calls', 'log_retention_days',
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  await upsertSettings(user.tenantId, updates);
  const settings = await getSettings(user.tenantId);
  return c.json(settings);
});

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index';
import { tenants, users, authSessions, authSessionEvents, userTenantMemberships, userBranchMemberships, userSystemEntitlements } from '@94cram/shared/db';
import { sign, signRefreshToken, verifyRefreshToken, setAuthCookie, setRefreshCookie, clearAuthCookie, extractRefreshToken, hashSessionToken, getRefreshTokenExpiryDate } from '@94cram/shared/auth';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';
import { badRequest, unauthorized, forbidden, notFound, conflict, internalError } from '../utils/response';

const app = new Hono();

async function ensureIdentityRecords(userId: string, tenantId: string, branchId?: string | null) {
  const [membership] = await db.select().from(userTenantMemberships).where(and(
    eq(userTenantMemberships.userId, userId),
    eq(userTenantMemberships.tenantId, tenantId),
    eq(userTenantMemberships.status, 'active')
  ));

  if (!membership) {
    await db.insert(userTenantMemberships).values({
      userId,
      tenantId,
      membershipRole: 'member',
      status: 'active',
      primaryBranchId: branchId ?? undefined,
    });
  }

  if (branchId) {
    const [branchMembership] = await db.select().from(userBranchMemberships).where(and(
      eq(userBranchMemberships.userId, userId),
      eq(userBranchMemberships.tenantId, tenantId),
      eq(userBranchMemberships.branchId, branchId),
      eq(userBranchMemberships.status, 'active')
    ));

    if (!branchMembership) {
      await db.insert(userBranchMemberships).values({
        userId,
        tenantId,
        branchId,
        branchRole: 'member',
        status: 'active',
      });
    }
  }

  const [entitlement] = await db.select().from(userSystemEntitlements).where(and(
    eq(userSystemEntitlements.userId, userId),
    eq(userSystemEntitlements.tenantId, tenantId),
    eq(userSystemEntitlements.systemKey, 'stock'),
    eq(userSystemEntitlements.status, 'active')
  ));

  if (!entitlement) {
    await db.insert(userSystemEntitlements).values({
      userId,
      tenantId,
      systemKey: 'stock',
      accessLevel: 'member',
      status: 'active',
    });
  }
}

async function revokeSessionByRefreshToken(refreshToken: string | null, eventType: string) {
  if (!refreshToken) return;

  const refreshTokenHash = hashSessionToken(refreshToken);
  const sessions = await db
    .update(authSessions)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(authSessions.refreshTokenHash, refreshTokenHash), isNull(authSessions.revokedAt)))
    .returning({ id: authSessions.id, userId: authSessions.userId, tenantId: authSessions.tenantId });

  if (sessions.length > 0) {
    await db.insert(authSessionEvents).values(sessions.map((session) => ({
      sessionId: session.id,
      userId: session.userId,
      tenantId: session.tenantId ?? undefined,
      eventType,
      createdAt: new Date(),
    })));
  }
}

async function setAuthTokens(c: import('hono').Context, accessToken: string, userId: string, tenantId: string, branchId?: string | null, eventType = 'login') {
  setAuthCookie(c, accessToken);
  const refreshToken = await signRefreshToken({ userId, tenantId });
  setRefreshCookie(c, refreshToken);

  await ensureIdentityRecords(userId, tenantId, branchId);

  const session = await db.insert(authSessions).values({
    userId,
    tenantId,
    branchId: branchId ?? undefined,
    refreshTokenHash: hashSessionToken(refreshToken),
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: c.req.header('user-agent'),
    expiresAt: getRefreshTokenExpiryDate(),
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: authSessions.id });

  if (session[0]) {
    await db.insert(authSessionEvents).values({
      sessionId: session[0].id,
      userId,
      tenantId,
      eventType,
      ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: c.req.header('user-agent'),
      createdAt: new Date(),
    });
  }
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  tenantName: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
  name: z.string().trim().min(1),
});

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

app.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return badRequest(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || user.isActive === false) {
    return unauthorized(c, 'Invalid email or password');
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return unauthorized(c, 'Invalid email or password');
  }

  // Update last login timestamp
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const token = await sign({
    userId: user.id,
    tenantId: user.tenantId ?? '',
    email: user.email,
    name: user.name,
    role: user.role,
    systems: ['stock'],
  });

  await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'login');
  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
});

app.post('/register', async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return badRequest(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }
  const { tenantName, slug, email, password, name } = parsed.data;

  // Registration disabled — new tenants must be created by platform admin
  return forbidden(c, 'Registration is disabled. Contact platform admin to create a new tenant.');
});

app.use('/me', authMiddleware, tenantMiddleware);
app.get('/me', async (c) => {
  const authUser = getAuthUser(c);
  const [user] = await db.select().from(users).where(and(
    eq(users.id, authUser.id),
    eq(users.tenantId, getTenantId(c)),
  ));

  if (!user) {
    return notFound(c, 'User');
  }

  return c.json({
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  });
});

app.use('/setup-tenant', authMiddleware);
app.post('/setup-tenant', async (c) => {
  const authUser = getAuthUser(c);
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return forbidden(c, 'Admin role required');
  }
  const body = await c.req.json().catch(() => ({}));
  const [existing] = await db.select().from(tenants).where(eq(tenants.id, authUser.tenantId));
  if (existing) {
    return c.json(existing);
  }

  // FIXME: tenant bootstrap should be owned by manage system orchestration.
  const [created] = await db.insert(tenants).values({
    id: authUser.tenantId,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `Tenant-${authUser.tenantId.slice(0, 8)}`,
    slug: typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : authUser.tenantId.slice(0, 8),
  }).returning();

  return c.json(created, 201);
});

app.use('/users', authMiddleware, tenantMiddleware);

app.post('/users', async (c) => {
  const authUser = getAuthUser(c);
  if (authUser.role !== 'admin') {
    return forbidden(c);
  }

  const tenantId = getTenantId(c);
  const parsedBody = createUserSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return badRequest(c, 'Missing required fields');
  }
  const { email, password, name, role } = parsedBody.data;

  const [existingUser] = await db.select().from(users).where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
  if (existingUser) {
    return conflict(c, 'Email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({
    tenantId,
    email,
    passwordHash,
    name,
    role,
    isActive: true,
  }).returning();

  return c.json(user, 201);
});

app.get('/users', async (c) => {
  const authUser = getAuthUser(c);
  if (authUser.role !== 'admin') {
    return forbidden(c);
  }

  const tenantId = getTenantId(c);
  const tenantUsers = await db.select({
    id: users.id,
    tenantId: users.tenantId,
    email: users.email,
    name: users.name,
    role: users.role,
    isActive: users.isActive,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.tenantId, tenantId));

  return c.json(tenantUsers);
});

app.post('/google', async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const credential = body.credential as string | undefined;

  if (!credential) {
    return badRequest(c, '缺少 Google credential');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return internalError(c, new Error('Google OAuth 未設定'));
  }

  try {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenInfoRes.ok) {
      return unauthorized(c, 'Google 憑證驗證失敗');
    }

    const tokenInfo = await tokenInfoRes.json() as {
      aud: string;
      email: string;
      email_verified: string;
      error_description?: string;
    };

    if (tokenInfo.error_description || tokenInfo.aud !== clientId || tokenInfo.email_verified !== 'true') {
      return unauthorized(c, 'Google 憑證無效');
    }

    const [user] = await db.select().from(users).where(eq(users.email, tokenInfo.email));
    if (!user || user.isActive === false) {
      return unauthorized(c, '此 Google 帳號尚未在系統中建立，請聯繫管理員');
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['stock'],
    });

    await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'google_login');
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
    });
  } catch (err: unknown) {
    return internalError(c, err instanceof Error ? err : new Error(String(err)));
  }
});

app.post('/refresh', async (c) => {
  const refreshToken = extractRefreshToken(c);
  if (!refreshToken) {
    return unauthorized(c, 'No refresh token');
  }

  try {
    const { userId, tenantId } = await verifyRefreshToken(refreshToken);

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.isActive) {
      clearAuthCookie(c);
      return unauthorized(c, 'User not found or inactive');
    }

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['stock'],
    });

    await revokeSessionByRefreshToken(refreshToken, 'refresh_replaced');
    await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'refresh');
    return c.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch {
    clearAuthCookie(c);
    return unauthorized(c, 'Invalid or expired refresh token');
  }
});

app.post('/logout', async (c) => {
  await revokeSessionByRefreshToken(extractRefreshToken(c), 'logout');
  clearAuthCookie(c);
  return c.json({ success: true });
});

export default app;

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { tenants, users } from '@94cram/shared/db';
import { sign, setAuthCookie, clearAuthCookie } from '@94cram/shared/auth';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const app = new Hono();

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
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || user.isActive === false) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return c.json({ error: 'Invalid email or password' }, 401);
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

  setAuthCookie(c, token);
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
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const { tenantName, slug, email, password, name } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.transaction(async (tx) => {
      // Check slug uniqueness
      const [existingTenant] = await tx.select().from(tenants).where(eq(tenants.slug, slug));
      if (existingTenant) {
        throw Object.assign(new Error('Slug already taken'), { statusCode: 400 });
      }

      // Check email uniqueness
      const [existingUser] = await tx.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
      }

      const [tenant] = await tx.insert(tenants).values({
        name: tenantName,
        slug,
      }).returning();

      await tx.insert(users).values({
        tenantId: tenant.id,
        email,
        passwordHash,
        name,
        role: 'admin',
        isActive: true,
      });
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      return c.json({ error: e.message }, 400);
    }
    throw err;
  }

  return c.json({ message: 'Registration successful' }, 201);
});

app.use('/me', authMiddleware, tenantMiddleware);
app.get('/me', async (c) => {
  const authUser = getAuthUser(c);
  const [user] = await db.select().from(users).where(and(
    eq(users.id, authUser.id),
    eq(users.tenantId, getTenantId(c)),
  ));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
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
    return c.json({ error: 'Forbidden: admin role required' }, 403);
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
    return c.json({ error: 'Forbidden' }, 403);
  }

  const tenantId = getTenantId(c);
  const parsedBody = createUserSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  const { email, password, name, role } = parsedBody.data;

  const [existingUser] = await db.select().from(users).where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
  if (existingUser) {
    return c.json({ error: 'Email already exists' }, 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
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
    return c.json({ error: 'Forbidden' }, 403);
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

app.post('/logout', async (c) => {
  clearAuthCookie(c);
  return c.json({ success: true });
});

export default app;

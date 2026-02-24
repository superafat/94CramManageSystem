import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { tenants, users } from '@94cram/shared/db';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const app = new Hono();
const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
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

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
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

export default app;

import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockTenants, stockUsers } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';

const app = new Hono();
const JWT_SECRET = process.env.JWT_SECRET || '94stock-secret-key-change-in-prod';

app.post('/register', async (c) => {
  const body = await c.req.json();
  const { tenantName, slug, email, password, name } = body;

  if (!tenantName || !slug || !email || !password || !name) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const [existingTenant] = await db.select().from(stockTenants).where(eq(stockTenants.slug, slug));
  if (existingTenant) {
    return c.json({ error: 'Slug already exists' }, 400);
  }

  const [existingUser] = await db.select().from(stockUsers).where(eq(stockUsers.email, email));
  if (existingUser) {
    return c.json({ error: 'Email already exists' }, 400);
  }

  const [tenant] = await db.insert(stockTenants).values({ name: tenantName, slug }).returning();
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(stockUsers).values({
    tenantId: tenant.id,
    email,
    passwordHash,
    name,
    role: 'admin',
    isActive: true,
  }).returning();

  const token = await sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
    JWT_SECRET,
  );

  return c.json({
    token,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
  }, 201);
});

app.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const [user] = await db.select().from(stockUsers).where(eq(stockUsers.email, email));
  if (!user || !user.isActive) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  await db.update(stockUsers).set({ lastLoginAt: new Date() }).where(eq(stockUsers.id, user.id));

  const token = await sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
    JWT_SECRET,
  );

  return c.json({
    token,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

app.use('/me', authMiddleware, tenantMiddleware);
app.get('/me', async (c) => {
  const authUser = getAuthUser(c);
  const [user] = await db.select().from(stockUsers).where(and(
    eq(stockUsers.id, authUser.id),
    eq(stockUsers.tenantId, getTenantId(c)),
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

app.use('/users', authMiddleware, tenantMiddleware);

app.post('/users', async (c) => {
  const authUser = getAuthUser(c);
  if (authUser.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const tenantId = getTenantId(c);
  const body = await c.req.json();
  const { email, password, name, role } = body;

  if (!email || !password || !name || !role) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const [existingUser] = await db.select().from(stockUsers).where(eq(stockUsers.email, email));
  if (existingUser) {
    return c.json({ error: 'Email already exists' }, 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(stockUsers).values({
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
  const users = await db.select({
    id: stockUsers.id,
    tenantId: stockUsers.tenantId,
    email: stockUsers.email,
    name: stockUsers.name,
    role: stockUsers.role,
    isActive: stockUsers.isActive,
    lastLoginAt: stockUsers.lastLoginAt,
    createdAt: stockUsers.createdAt,
  }).from(stockUsers).where(eq(stockUsers.tenantId, tenantId));

  return c.json(users);
});

export default app;

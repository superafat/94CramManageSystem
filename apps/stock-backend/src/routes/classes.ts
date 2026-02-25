import { Hono } from 'hono';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { stockClasses, stockClassMaterials, stockInventory, stockItems, stockMaterialDistributions, stockStudents } from '@94cram/shared/db';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { z } from 'zod';

const app = new Hono();
const uuidString = z.string().uuid();
const uuidParamSchema = z.object({ id: z.string().uuid() });

const classBodySchema = z.object({
  name: z.string().trim().min(1),
  grade: z.string().optional(),
  subject: z.string().optional(),
  schoolYear: z.string().optional(),
  studentCount: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const classMaterialBodySchema = z.object({
  itemId: z.string().uuid(),
  quantityPerStudent: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const distributeSchema = z.object({
  records: z.array(z.object({
    warehouseId: uuidString,
    itemId: uuidString,
    distributedQuantity: z.number().int().positive(),
    studentId: uuidString.optional(),
    studentName: z.string().optional(),
    notes: z.string().optional(),
  })).default([]),
});
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const classes = await db.select().from(stockClasses).where(eq(stockClasses.tenantId, tenantId));
  return c.json(classes);
});

app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = classBodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsed.data;
  const [created] = await db.insert(stockClasses).values({
    tenantId,
    name: body.name,
    grade: body.grade,
    subject: body.subject,
    schoolYear: body.schoolYear,
    studentCount: body.studentCount ?? 0,
    isActive: body.isActive ?? true,
  }).returning();
  return c.json(created, 201);
});

app.put('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid class id' }, 400);
  }
  const { id } = parsedParams.data;
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = classBodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsed.data;
  const [updated] = await db.update(stockClasses).set({
    name: body.name,
    grade: body.grade,
    subject: body.subject,
    schoolYear: body.schoolYear,
    studentCount: body.studentCount,
    isActive: body.isActive,
  }).where(and(eq(stockClasses.id, id), eq(stockClasses.tenantId, tenantId))).returning();

  if (!updated) return c.json({ error: 'Class not found' }, 404);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  await db.delete(stockClassMaterials).where(and(eq(stockClassMaterials.classId, id), eq(stockClassMaterials.tenantId, tenantId)));
  const [deleted] = await db.delete(stockClasses).where(and(eq(stockClasses.id, id), eq(stockClasses.tenantId, tenantId))).returning();
  if (!deleted) return c.json({ error: 'Class not found' }, 404);
  return c.json({ message: 'Class deleted' });
});

app.get('/:id/materials', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const materials = await db.select({
    material: stockClassMaterials,
    item: stockItems,
  }).from(stockClassMaterials)
    .innerJoin(stockItems, eq(stockClassMaterials.itemId, stockItems.id))
    .where(and(eq(stockClassMaterials.classId, id), eq(stockClassMaterials.tenantId, tenantId)));
  return c.json(materials);
});

app.post('/:id/materials', async (c) => {
  const tenantId = getTenantId(c);
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid class id' }, 400);
  }
  const { id } = parsedParams.data;
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = classMaterialBodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsed.data;
  const [created] = await db.insert(stockClassMaterials).values({
    tenantId,
    classId: id,
    itemId: body.itemId,
    quantityPerStudent: body.quantityPerStudent ?? 1,
    notes: body.notes,
  }).returning();
  return c.json(created, 201);
});

app.delete('/:id/materials/:materialId', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const materialId = c.req.param('materialId');
  const [deleted] = await db.delete(stockClassMaterials).where(and(
    eq(stockClassMaterials.id, materialId),
    eq(stockClassMaterials.classId, id),
    eq(stockClassMaterials.tenantId, tenantId),
  )).returning();
  if (!deleted) return c.json({ error: 'Material mapping not found' }, 404);
  return c.json({ message: 'Material mapping deleted' });
});

app.get('/:id/required-stock', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const [targetClass] = await db.select().from(stockClasses).where(and(eq(stockClasses.id, id), eq(stockClasses.tenantId, tenantId)));
  if (!targetClass) return c.json({ error: 'Class not found' }, 404);

  const materials = await db.select({ material: stockClassMaterials, item: stockItems })
    .from(stockClassMaterials)
    .innerJoin(stockItems, eq(stockClassMaterials.itemId, stockItems.id))
    .where(and(eq(stockClassMaterials.classId, id), eq(stockClassMaterials.tenantId, tenantId)));

  const inventoryRows = await db.select().from(stockInventory).where(eq(stockInventory.tenantId, tenantId));

  const requirements = materials.map(({ material, item }) => {
    const requiredQty = (targetClass.studentCount || 0) * material.quantityPerStudent;
    const currentQty = inventoryRows
      .filter((row) => row.itemId === material.itemId)
      .reduce((sum, row) => sum + row.quantity, 0);
    return {
      classId: id,
      itemId: item.id,
      itemName: item.name,
      studentCount: targetClass.studentCount || 0,
      quantityPerStudent: material.quantityPerStudent,
      requiredQty,
      currentQty,
      shortageQty: Math.max(requiredQty - currentQty, 0),
    };
  });

  return c.json(requirements);
});

app.post('/:id/distribute', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const authUser = getAuthUser(c);
  const parsedBody = distributeSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const [targetClass] = await db.select().from(stockClasses).where(and(eq(stockClasses.id, id), eq(stockClasses.tenantId, tenantId)));
  if (!targetClass) return c.json({ error: 'Class not found' }, 404);

  const { records } = parsedBody.data;
  for (const record of records) {
    if (record.studentId || record.studentName) {
      const studentCondition = record.studentId
        ? eq(stockStudents.id, record.studentId)
        : eq(stockStudents.name, record.studentName!);
      const [student] = await db.select().from(stockStudents).where(and(
        eq(stockStudents.tenantId, tenantId),
        studentCondition,
      ));
      if (student && !student.tuitionPaid) {
        return c.json({ error: `Student tuition not paid: ${student.name}` }, 400);
      }
    }

    const [updatedInventory] = await db.update(stockInventory).set({
      quantity: sql`${stockInventory.quantity} - ${record.distributedQuantity}`,
      lastUpdatedAt: new Date(),
    }).where(and(
      eq(stockInventory.tenantId, tenantId),
      eq(stockInventory.warehouseId, record.warehouseId),
      eq(stockInventory.itemId, record.itemId),
      gte(stockInventory.quantity, record.distributedQuantity),
    )).returning();

    if (!updatedInventory) {
      return c.json({ error: `Insufficient stock for item ${record.itemId}` }, 400);
    }

    await db.insert(stockMaterialDistributions).values({
      tenantId,
      classId: id,
      warehouseId: record.warehouseId,
      itemId: record.itemId,
      distributedQuantity: record.distributedQuantity,
      studentName: record.studentName,
      performedBy: authUser.id,
      notes: record.notes,
      distributedAt: new Date(),
    });
  }

  return c.json({ message: 'Distribution completed' });
});

export default app;

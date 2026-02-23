import { Hono } from 'hono';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { stockClasses, stockClassMaterials, stockInventory, stockItems, stockMaterialDistributions, stockStudents } from '../db/schema';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { authMiddleware, getAuthUser } from '../middleware/auth';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const classes = await db.select().from(stockClasses).where(eq(stockClasses.tenantId, tenantId));
  return c.json(classes);
});

app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  const [created] = await db.insert(stockClasses).values({
    tenantId,
    name: body.name,
    grade: body.grade,
    subject: body.subject,
    schoolYear: body.schoolYear,
    studentCount: body.studentCount || 0,
    isActive: body.isActive ?? true,
  }).returning();
  return c.json(created, 201);
});

app.put('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
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
  const id = c.req.param('id');
  const body = await c.req.json();
  const [created] = await db.insert(stockClassMaterials).values({
    tenantId,
    classId: id,
    itemId: body.itemId,
    quantityPerStudent: body.quantityPerStudent || 1,
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
  const body = await c.req.json();

  const [targetClass] = await db.select().from(stockClasses).where(and(eq(stockClasses.id, id), eq(stockClasses.tenantId, tenantId)));
  if (!targetClass) return c.json({ error: 'Class not found' }, 404);

  const records = Array.isArray(body.records) ? body.records : [];
  for (const record of records) {
    if (record.studentId || record.studentName) {
      const [student] = await db.select().from(stockStudents).where(and(
        eq(stockStudents.tenantId, tenantId),
        record.studentId ? eq(stockStudents.id, record.studentId) : eq(stockStudents.name, record.studentName),
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

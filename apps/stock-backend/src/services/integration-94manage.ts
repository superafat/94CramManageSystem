import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockClasses, stockIntegrationSettings, stockStudents } from '@94cram/shared/db';

type IntegrationSettingsInput = {
  apiEndpoint?: string;
  apiKey?: string;
  isEnabled?: boolean;
};

type SyncedStudent = {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  className?: string;
  tuitionPaid?: boolean;
  isActive?: boolean;
};

async function fetch94Manage(settings: { apiEndpoint?: string | null; apiKey?: string | null }, path: string) {
  if (!settings.apiEndpoint || !settings.apiKey) return [];
  const res = await fetch(`${settings.apiEndpoint.replace(/\/$/, '')}${path}`, {
    headers: { Authorization: `Bearer ${settings.apiKey}` },
  });
  if (!res.ok) throw new Error(`94Manage API error: ${res.status}`);
  return await res.json() as unknown[];
}

export async function getIntegrationSettings(tenantId: string) {
  const [row] = await db.select().from(stockIntegrationSettings).where(and(
    eq(stockIntegrationSettings.tenantId, tenantId),
    eq(stockIntegrationSettings.integrationType, '94manage'),
  ));
  return row ?? null;
}

export async function upsertIntegrationSettings(tenantId: string, input: IntegrationSettingsInput) {
  const existing = await getIntegrationSettings(tenantId);
  if (existing) {
    const [updated] = await db.update(stockIntegrationSettings).set({
      apiEndpoint: input.apiEndpoint ?? existing.apiEndpoint,
      apiKey: input.apiKey ?? existing.apiKey,
      isEnabled: input.isEnabled ?? existing.isEnabled,
      updatedAt: new Date(),
    }).where(eq(stockIntegrationSettings.id, existing.id)).returning();
    return updated;
  }

  const [created] = await db.insert(stockIntegrationSettings).values({
    tenantId,
    integrationType: '94manage',
    apiEndpoint: input.apiEndpoint,
    apiKey: input.apiKey,
    isEnabled: input.isEnabled ?? false,
  }).returning();
  return created;
}

export async function syncClasses(tenantId: string) {
  const settings = await getIntegrationSettings(tenantId);
  if (!settings?.isEnabled) return { synced: 0 };

  const remote = await fetch94Manage(settings, '/classes');
  let synced = 0;
  for (const item of remote) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { name?: string; grade?: string; subject?: string; schoolYear?: string; studentCount?: number };
    if (!row.name) continue;

    const [existing] = await db.select().from(stockClasses).where(and(eq(stockClasses.tenantId, tenantId), eq(stockClasses.name, row.name)));
    if (existing) {
      await db.update(stockClasses).set({
        grade: row.grade ?? existing.grade,
        subject: row.subject ?? existing.subject,
        schoolYear: row.schoolYear ?? existing.schoolYear,
        studentCount: row.studentCount ?? existing.studentCount,
      }).where(eq(stockClasses.id, existing.id));
    } else {
      await db.insert(stockClasses).values({
        tenantId,
        name: row.name,
        grade: row.grade,
        subject: row.subject,
        schoolYear: row.schoolYear,
        studentCount: row.studentCount ?? 0,
      });
    }
    synced += 1;
  }

  return { synced };
}

export async function syncStudents(tenantId: string) {
  const settings = await getIntegrationSettings(tenantId);
  if (!settings?.isEnabled) return { synced: 0 };

  const classes = await db.select().from(stockClasses).where(eq(stockClasses.tenantId, tenantId));
  const classByName = new Map(classes.map((c) => [c.name, c.id]));
  const remote = await fetch94Manage(settings, '/students');
  let synced = 0;

  for (const item of remote) {
    if (!item || typeof item !== 'object') continue;
    const row = item as SyncedStudent;
    if (!row.externalId || !row.name) continue;

    const [existing] = await db.select().from(stockStudents).where(and(
      eq(stockStudents.tenantId, tenantId),
      eq(stockStudents.externalId, row.externalId),
    ));

    const classId = row.className ? classByName.get(row.className) : undefined;
    if (existing) {
      await db.update(stockStudents).set({
        name: row.name,
        email: row.email ?? existing.email,
        phone: row.phone ?? existing.phone,
        classId: classId ?? existing.classId,
        tuitionPaid: row.tuitionPaid ?? existing.tuitionPaid,
        isActive: row.isActive ?? existing.isActive,
        updatedAt: new Date(),
      }).where(eq(stockStudents.id, existing.id));
    } else {
      await db.insert(stockStudents).values({
        tenantId,
        externalId: row.externalId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        classId,
        tuitionPaid: row.tuitionPaid ?? false,
        isActive: row.isActive ?? true,
      });
    }
    synced += 1;
  }

  return { synced };
}

export async function syncTuition(tenantId: string) {
  const settings = await getIntegrationSettings(tenantId);
  if (!settings?.isEnabled) return { synced: 0 };

  const remote = await fetch94Manage(settings, '/tuition');
  let synced = 0;
  for (const item of remote) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { externalId?: string; tuitionPaid?: boolean };
    if (!row.externalId) continue;

    const [existing] = await db.select().from(stockStudents).where(and(
      eq(stockStudents.tenantId, tenantId),
      eq(stockStudents.externalId, row.externalId),
    ));
    if (!existing) continue;

    await db.update(stockStudents).set({
      tuitionPaid: row.tuitionPaid ?? existing.tuitionPaid,
      updatedAt: new Date(),
    }).where(eq(stockStudents.id, existing.id));
    synced += 1;
  }

  return { synced };
}

export async function syncAll(tenantId: string) {
  const classes = await syncClasses(tenantId);
  const students = await syncStudents(tenantId);
  const tuition = await syncTuition(tenantId);

  const settings = await getIntegrationSettings(tenantId);
  if (settings) {
    await db.update(stockIntegrationSettings).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(stockIntegrationSettings.id, settings.id));
  }

  return {
    classes,
    students,
    tuition,
    syncedAt: new Date().toISOString(),
  };
}

export async function getStudents(tenantId: string) {
  return db.select({
    student: stockStudents,
    className: stockClasses.name,
  }).from(stockStudents)
    .leftJoin(stockClasses, eq(stockStudents.classId, stockClasses.id))
    .where(eq(stockStudents.tenantId, tenantId));
}

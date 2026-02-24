import { firestore } from './client';

export interface TenantBinding {
  tenant_id: string;
  tenant_name: string;
  role: string;
}

export interface UserBinding {
  bindings: TenantBinding[];
  active_tenant_id: string;
  active_tenant_name: string;
  created_at: Date;
  last_active_at: Date;
}

const col = firestore.collection('bot_user_bindings');

export async function getBinding(telegramUserId: string): Promise<UserBinding | null> {
  const doc = await col.doc(telegramUserId).get();
  return doc.exists ? (doc.data() as UserBinding) : null;
}

export async function addBinding(
  telegramUserId: string,
  tenantId: string,
  tenantName: string
): Promise<void> {
  const ref = col.doc(telegramUserId);
  const doc = await ref.get();

  if (doc.exists) {
    const data = doc.data() as UserBinding;
    const exists = data.bindings.some((b) => b.tenant_id === tenantId);
    if (!exists) {
      data.bindings.push({ tenant_id: tenantId, tenant_name: tenantName, role: 'admin' });
    }
    await ref.update({
      bindings: data.bindings,
      active_tenant_id: tenantId,
      active_tenant_name: tenantName,
      last_active_at: new Date(),
    });
  } else {
    await ref.set({
      bindings: [{ tenant_id: tenantId, tenant_name: tenantName, role: 'admin' }],
      active_tenant_id: tenantId,
      active_tenant_name: tenantName,
      created_at: new Date(),
      last_active_at: new Date(),
    });
  }
}

export async function switchTenant(
  telegramUserId: string,
  tenantId: string
): Promise<TenantBinding | null> {
  const ref = col.doc(telegramUserId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as UserBinding;
  const binding = data.bindings.find((b) => b.tenant_id === tenantId);
  if (!binding) return null;

  await ref.update({
    active_tenant_id: tenantId,
    active_tenant_name: binding.tenant_name,
    last_active_at: new Date(),
  });
  return binding;
}

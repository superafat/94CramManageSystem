import { getBinding, type UserBinding } from '../firestore/bindings';

export interface AuthContext {
  telegramUserId: string;
  tenantId: string;
  tenantName: string;
  binding: UserBinding;
}

export async function authenticate(telegramUserId: string): Promise<AuthContext | null> {
  const binding = await getBinding(telegramUserId);
  if (!binding || binding.bindings.length === 0) return null;

  return {
    telegramUserId,
    tenantId: binding.active_tenant_id,
    tenantName: binding.active_tenant_name,
    binding,
  };
}

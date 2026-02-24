import { getBinding, type UserBinding } from '../firestore/bindings';
import { getEnabledModules } from '../firestore/settings';

export interface AuthContext {
  telegramUserId: string;
  tenantId: string;
  tenantName: string;
  binding: UserBinding;
  enabledModules: string[];
}

export async function authenticate(telegramUserId: string): Promise<AuthContext | null> {
  const binding = await getBinding(telegramUserId);
  if (!binding || binding.bindings.length === 0) return null;

  const activeTenant = binding.bindings.find(
    (b) => b.tenant_id === binding.active_tenant_id
  );

  let enabledModules: string[];
  if (activeTenant?.enabled_modules && activeTenant.enabled_modules.length > 0) {
    enabledModules = activeTenant.enabled_modules;
  } else {
    enabledModules = await getEnabledModules(binding.active_tenant_id);
  }

  return {
    telegramUserId,
    tenantId: binding.active_tenant_id,
    tenantName: binding.active_tenant_name,
    binding,
    enabledModules,
  };
}

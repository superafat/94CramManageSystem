import { firestore } from './client';

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface Subscription {
  tenant_id: string;
  plan: SubscriptionPlan;
  admin_bot_active: boolean;
  parent_bot_active: boolean;
  parent_limit: number;
  ai_calls_limit: number;
  ai_calls_used: number;
  created_at: Date;
  updated_at: Date;
}

const PLAN_DEFAULTS: Record<SubscriptionPlan, Pick<Subscription, 'parent_limit' | 'ai_calls_limit'>> = {
  free: { parent_limit: 10, ai_calls_limit: 100 },
  basic: { parent_limit: 50, ai_calls_limit: 500 },
  pro: { parent_limit: 200, ai_calls_limit: 2000 },
  enterprise: { parent_limit: 1000, ai_calls_limit: 10000 },
};

const col = firestore.collection('bot_subscriptions');

export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  const doc = await col.doc(tenantId).get();
  return doc.exists ? (doc.data() as Subscription) : null;
}

export async function upsertSubscription(tenantId: string, data: Partial<Subscription>): Promise<void> {
  await col.doc(tenantId).set(
    { ...data, tenant_id: tenantId, updated_at: new Date() },
    { merge: true }
  );
}

export async function getOrCreateSubscription(tenantId: string): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  if (existing) return existing;

  const defaults = PLAN_DEFAULTS.free;
  const sub: Subscription = {
    tenant_id: tenantId,
    plan: 'free',
    admin_bot_active: true,
    parent_bot_active: false,
    parent_limit: defaults.parent_limit,
    ai_calls_limit: defaults.ai_calls_limit,
    ai_calls_used: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await col.doc(tenantId).set(sub);
  return sub;
}

export { PLAN_DEFAULTS };

import { firestore } from './client';

export interface OperationLog {
  telegram_user_id: string;
  tenant_id: string;
  tenant_name: string;
  intent: string;
  params: Record<string, unknown>;
  status: 'confirmed' | 'cancelled' | 'error';
  api_response?: Record<string, unknown>;
  error_message?: string;
  created_at: Date;
}

const col = firestore.collection('bot_operation_logs');

export async function logOperation(log: OperationLog): Promise<void> {
  await col.add(log);
}

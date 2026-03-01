import { callBotApi, type BotApiResponse } from '../modules/api-client';
import type { IntentResult } from '../modules/ai-engine';
import type { AuthContext } from '../modules/auth-manager';

const QUERY_INTENTS = [
  'inclass.query_list', 'inclass.query_report',
  'manage.query_student', 'manage.query_finance', 'manage.query_history',
  'stock.query', 'stock.query_history',
];
const WRITE_INTENTS = [
  'inclass.leave', 'inclass.late', 'inclass.checkin',
  'manage.payment', 'manage.add_student',
  'stock.ship', 'stock.restock',
];

export function isQueryIntent(intent: string): boolean {
  return QUERY_INTENTS.includes(intent);
}

export function isWriteIntent(intent: string): boolean {
  return WRITE_INTENTS.includes(intent);
}

const INTENT_API_MAP: Record<string, { service: 'manage' | 'inclass' | 'stock'; path: string }> = {
  'inclass.leave': { service: 'inclass', path: '/attendance/leave' },
  'inclass.late': { service: 'inclass', path: '/attendance/late' },
  'inclass.checkin': { service: 'inclass', path: '/attendance/checkin' },
  'inclass.query_list': { service: 'inclass', path: '/attendance/list' },
  'inclass.query_report': { service: 'inclass', path: '/attendance/report' },
  'manage.payment': { service: 'manage', path: '/finance/payment' },
  'manage.add_student': { service: 'manage', path: '/student/create' },
  'manage.query_student': { service: 'manage', path: '/student/search' },
  'manage.query_finance': { service: 'manage', path: '/finance/summary' },
  'manage.query_history': { service: 'manage', path: '/finance/history' },
  'stock.ship': { service: 'stock', path: '/stock/ship' },
  'stock.restock': { service: 'stock', path: '/stock/restock' },
  'stock.query': { service: 'stock', path: '/stock/check' },
  'stock.query_history': { service: 'stock', path: '/stock/history' },
};

export async function executeIntent(
  intent: IntentResult,
  auth: AuthContext
): Promise<BotApiResponse> {
  const mapping = INTENT_API_MAP[intent.intent];
  if (!mapping) {
    return { success: false, error: 'unknown_intent', message: '無法處理此指令' };
  }

  const body = {
    tenant_id: auth.tenantId,
    ...intent.params,
  };

  return callBotApi(mapping.service, mapping.path, body);
}

export function formatResponse(res: BotApiResponse): string {
  if (res.success) {
    return res.message ?? '操作完成';
  }

  let text = `⚠️ ${res.message ?? '操作失敗，請稍後再試'}`;
  if (res.suggestions && res.suggestions.length > 0) {
    text += '\n\n是不是這幾個？';
    res.suggestions.forEach((s, i) => {
      const name = (s.name ?? s.student_name ?? JSON.stringify(s)) as string;
      text += `\n${i + 1}. ${name}`;
    });
  }
  return text;
}

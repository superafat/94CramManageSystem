import { GoogleAuth } from 'google-auth-library';
import { config } from '../config';
import { logger } from '../utils/logger';

const SERVICES = {
  manage: config.MANAGE_URL,
  inclass: config.INCLASS_URL,
  stock: config.STOCK_URL,
} as const;

type ServiceName = keyof typeof SERVICES;

const auth = new GoogleAuth();

export interface BotApiResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
  suggestions?: Array<Record<string, unknown>>;
}

async function callBotApiBase(
  service: ServiceName,
  method: 'GET' | 'POST',
  path: string,
  options?: { body?: Record<string, unknown>; query?: Record<string, string | number> }
): Promise<BotApiResponse> {
  const baseUrl = SERVICES[service];
  const prefix = service === 'manage' ? '/api/bot-ext' : '/api/bot';
  let url = `${baseUrl}${prefix}${path}`;

  if (options?.query) {
    const params = new URLSearchParams(
      Object.entries(options.query).map(([k, v]) => [k, String(v)])
    ).toString();
    if (params) url += `?${params}`;
  }

  try {
    const client = await auth.getIdTokenClient(baseUrl);
    const res = await client.request<BotApiResponse>({
      url,
      method,
      ...(options?.body ? { data: options.body, headers: { 'Content-Type': 'application/json' } } : {}),
    });
    return res.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown API error';
    logger.error({ err: error instanceof Error ? error : new Error(message) }, `[API Client] ${method} ${service}${path} failed`);
    return { success: false, error: 'api_error', message };
  }
}

export async function callBotApi(
  service: ServiceName,
  path: string,
  body: Record<string, unknown>
): Promise<BotApiResponse> {
  return callBotApiBase(service, 'POST', path, { body });
}

export async function callBotApiGet(
  service: ServiceName,
  path: string,
  query: Record<string, string | number>
): Promise<BotApiResponse> {
  return callBotApiBase(service, 'GET', path, { query });
}

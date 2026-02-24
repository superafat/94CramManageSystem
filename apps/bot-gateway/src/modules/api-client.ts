import { GoogleAuth } from 'google-auth-library';
import { config } from '../config';

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

export async function callBotApi(
  service: ServiceName,
  path: string,
  body: Record<string, unknown>
): Promise<BotApiResponse> {
  const baseUrl = SERVICES[service];
  const prefix = service === 'manage' ? '/api/bot-ext' : '/api/bot';
  const url = `${baseUrl}${prefix}${path}`;

  try {
    const client = await auth.getIdTokenClient(baseUrl);
    const res = await client.request<BotApiResponse>({
      url,
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown API error';
    console.error(`[API Client] ${service}${path} failed:`, message);
    return { success: false, error: 'api_error', message };
  }
}

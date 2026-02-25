import { config } from '../config';

const SERVICES = {
  manage: config.MANAGE_URL,
  inclass: config.INCLASS_URL,
} as const;

type ParentServiceName = keyof typeof SERVICES;

export interface ParentApiResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export async function callParentApi(
  service: ParentServiceName,
  path: string,
  tenantId: string,
  options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> }
): Promise<ParentApiResponse> {
  const baseUrl = SERVICES[service];
  const url = `${baseUrl}/api/parent-ext${path}`;
  const method = options?.method ?? 'GET';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    };
    if (config.INTERNAL_API_KEY) {
      headers['X-Internal-Key'] = config.INTERNAL_API_KEY;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(options?.body ?? {}) : undefined,
    });

    return await res.json() as ParentApiResponse;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown API error';
    console.error(`[Parent API] ${service}${path} failed:`, message);
    return { success: false, error: 'api_error', message };
  }
}

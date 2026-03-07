import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';

const uuidLikeSchema = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'Invalid UUID-like tenant id'
);

const envSchema = z.object({
  MANAGE_URL: z.string().url(),
  INCLASS_URL: z.string().url(),
  STOCK_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(1),
  SMOKE_TENANT_ID: uuidLikeSchema.default('11111111-1111-1111-1111-111111111111'),
});

const env = envSchema.parse(process.env);
const auth = new GoogleAuth();

type SmokeTarget = {
  label: string;
  baseUrl: string;
  path: string;
  successStatuses?: number[];
};

type FailureCategory =
  | 'oidc'
  | 'internal-key'
  | 'service-config'
  | 'tenant'
  | 'http'
  | 'network'
  | 'unknown';

type SmokeResult = {
  label: string;
  ok: boolean;
  status?: number;
  category?: FailureCategory;
  detail: string;
  dataSummary: string;
};

const targets: SmokeTarget[] = [
  {
    label: 'manage',
    baseUrl: env.MANAGE_URL,
    path: '/api/bot-ext/data/students',
  },
  {
    label: 'inclass',
    baseUrl: env.INCLASS_URL,
    path: '/api/bot/data/students',
  },
  {
    label: 'stock',
    baseUrl: env.STOCK_URL,
    path: '/api/bot/data/items',
  },
];

type JsonResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: unknown;
};

function summarizeData(data: unknown): string {
  if (Array.isArray(data)) {
    return `${data.length} items`;
  }

  if (data && typeof data === 'object') {
    return `object:${Object.keys(data as Record<string, unknown>).length}`;
  }

  return 'no data';
}

function categorizeFailure(status: number | undefined, detail: string): FailureCategory {
  if (status === 401 && detail.includes('token')) return 'oidc';
  if (status === 401 && detail.includes('內部金鑰')) return 'internal-key';
  if (status === 503 && detail.includes('服務未設定')) return 'service-config';
  if (status === 404 && detail.includes('Tenant not found')) return 'tenant';
  if (typeof status === 'number') return 'http';
  if (/ECONNREFUSED|ENOTFOUND|network|fetch failed|socket/i.test(detail)) return 'network';
  return 'unknown';
}

async function callTarget(target: SmokeTarget): Promise<SmokeResult> {
  const client = await auth.getIdTokenClient(target.baseUrl);
  const url = `${target.baseUrl}${target.path}`;

  try {
    const response = await client.request<JsonResponse>({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': env.INTERNAL_API_KEY,
      },
      data: {
        tenant_id: env.SMOKE_TENANT_ID,
      },
      validateStatus: () => true,
    });

    const body = response.data ?? {};
    const successStatuses = new Set(target.successStatuses ?? [200]);
    const isHealthy = successStatuses.has(response.status) && body.success === true;

    const detail = body.message ?? body.error ?? 'unknown response';
    const dataSummary = summarizeData(body.data);

    if (!isHealthy) {
      return {
        label: target.label,
        ok: false,
        status: response.status,
        category: categorizeFailure(response.status, detail),
        detail,
        dataSummary,
      };
    }

    return {
      label: target.label,
      ok: true,
      status: response.status,
      detail,
      dataSummary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      label: target.label,
      ok: false,
      category: categorizeFailure(undefined, message),
      detail: message,
      dataSummary: 'request failed',
    };
  }
}

async function main() {
  const results: SmokeResult[] = [];

  for (const target of targets) {
    results.push(await callTarget(target));
  }

  for (const result of results) {
    if (result.ok) {
      console.log(`[smoke] ${result.label}: ok (${result.dataSummary})`);
      continue;
    }

    const suffix = result.status ? `HTTP ${result.status}` : 'request error';
    console.error(`[smoke] ${result.label}: fail [${result.category}] ${suffix} - ${result.detail}`);
  }

  const failures = results.filter((result) => !result.ok);

  if (failures.length > 0) {
    console.error('[smoke] summary:', JSON.stringify(results, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log('[smoke] bot downstream checks passed');
}

void main();
/**
 * JWT Auth utilities — 統一使用 jose library
 * 三個系統共用：manage / inclass / stock
 */
import { SignJWT, jwtVerify, type JWTPayload as JosePayload } from 'jose';

export interface JWTPayload {
  sub?: string;       // = userId（標準 claim）
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  systems?: string[]; // ['manage', 'inclass', 'stock']
}

function getSecret(secret?: string): Uint8Array {
  const s = secret || process.env.JWT_SECRET;
  if (!s) {
    throw new Error('JWT_SECRET is required. Set JWT_SECRET environment variable or pass secret explicitly.');
  }
  return new TextEncoder().encode(s);
}

export async function sign(payload: Omit<JWTPayload, 'sub'>, secret?: string): Promise<string> {
  const jwt = new SignJWT({
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    permissions: payload.permissions || [],
    systems: payload.systems || [],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('7d');

  return jwt.sign(getSecret(secret));
}

export async function verify(token: string, secret?: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret(secret));

  const userId = (typeof payload.userId === 'string' ? payload.userId : null) ?? payload.sub ?? null;
  const tenantId = typeof payload.tenantId === 'string' ? payload.tenantId : null;
  const email = typeof payload.email === 'string' ? payload.email : null;
  const name = typeof payload.name === 'string' ? payload.name : null;
  const role = typeof payload.role === 'string' ? payload.role : null;

  if (!userId || !tenantId || !email || !name || !role) {
    throw new Error('JWT payload is missing required fields: userId, tenantId, email, name, role');
  }

  return {
    sub: payload.sub,
    userId,
    tenantId,
    email,
    name,
    role,
    permissions: Array.isArray(payload.permissions) ? (payload.permissions as string[]) : [],
    systems: Array.isArray(payload.systems) ? (payload.systems as string[]) : [],
  };
}

export function decode(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return {
      sub: payload.sub,
      userId: payload.userId || payload.sub || '',
      tenantId: payload.tenantId || '',
      email: payload.email || '',
      name: payload.name || '',
      role: payload.role || '',
      permissions: payload.permissions || [],
      systems: payload.systems || [],
    };
  } catch {
    return null;
  }
}

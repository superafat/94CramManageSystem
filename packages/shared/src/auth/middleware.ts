// Auth Middleware - for Hono
import { verify, JWTPayload } from './jwt';

export interface AuthContext {
  user: JWTPayload;
}

export function authMiddleware(token: string) {
  try {
    const payload = verify(token);
    return { user: payload };
  } catch (e) {
    return null;
  }
}

// Internal API key check
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-key-change-in-prod';

export function verifyInternalKey(key: string): boolean {
  return key === INTERNAL_API_KEY;
}

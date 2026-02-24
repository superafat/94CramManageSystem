import jwt from 'jsonwebtoken';

const TOKEN_KEY = 'token';

export type CurrentUser = {
  userId?: string;
  tenantId?: string;
  role?: string;
  email?: string;
  name?: string;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getCurrentUser(): CurrentUser | null {
  const token = getToken();
  if (!token) return null;

  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string') return null;

  return {
    userId: typeof decoded.userId === 'string' ? decoded.userId : undefined,
    tenantId: typeof decoded.tenantId === 'string' ? decoded.tenantId : undefined,
    role: typeof decoded.role === 'string' ? decoded.role : undefined,
    email: typeof decoded.email === 'string' ? decoded.email : undefined,
    name: typeof decoded.name === 'string' ? decoded.name : undefined,
  };
}

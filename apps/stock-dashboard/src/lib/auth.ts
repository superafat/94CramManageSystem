export type CurrentUser = {
  userId?: string;
  tenantId?: string;
  role?: string;
  email?: string;
  name?: string;
};

export async function removeToken() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

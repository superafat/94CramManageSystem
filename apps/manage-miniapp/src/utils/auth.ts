export type UserRole = 'superadmin' | 'admin' | 'staff' | 'teacher' | 'parent' | 'student' | 'demo';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  tenantId: string;
  branchId?: string;
}

/**
 * 從 localStorage 讀取使用者資料
 */
export function getUser(): User | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 取得目前使用者角色（預設 'demo'）
 */
export function getUserRole(): UserRole {
  const user = getUser();
  return user?.role || 'demo';
}

/**
 * 判斷是否為訪客（Telegram 自動建立，無 DB 記錄）
 */
export function isGuest(): boolean {
  const user = getUser();
  return !user || (user.id?.startsWith('tg-') ?? false);
}

/**
 * 判斷是否為管理員
 */
export function isAdmin(): boolean {
  return getUserRole() === 'admin';
}

/**
 * 判斷是否為教師
 */
export function isTeacher(): boolean {
  return getUserRole() === 'teacher';
}

/**
 * 判斷是否為家長
 */
export function isParent(): boolean {
  return getUserRole() === 'parent';
}

/**
 * 判斷是否為學生
 */
export function isStudent(): boolean {
  return getUserRole() === 'student';
}

/**
 * 取得角色顯示名稱
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    superadmin: '系統管理員',
    admin: '館長',
    staff: '行政',
    teacher: '教師',
    parent: '家長',
    student: '學生',
    demo: '展示',
  };
  return names[role] || '未知';
}

/**
 * 取得角色顏色（莫蘭迪色系）
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    superadmin: 'var(--rose)',
    admin: 'var(--rose)',
    staff: 'var(--blue)',
    teacher: 'var(--sage)',
    parent: 'var(--sand)',
    student: 'var(--sand)',
    demo: 'var(--stone)',
  };
  return colors[role] || 'var(--stone)';
}

import { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

// 角色定義
export enum Role {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  STAFF = 'staff',
  MANAGER = 'manager',
  TEACHER = 'teacher',
  PARENT = 'parent',
  STUDENT = 'student',
}

// 權限列表
export enum Permission {
  STUDENTS_READ = 'students.read',
  STUDENTS_WRITE = 'students.write',
  SCHEDULE_READ = 'schedule.read',
  SCHEDULE_WRITE = 'schedule.write',
  BILLING_READ = 'billing.read',
  BILLING_WRITE = 'billing.write',
  REPORTS_READ = 'reports.read',
  ATTENDANCE_READ = 'attendance.read',
  ATTENDANCE_WRITE = 'attendance.write',
  GRADES_READ = 'grades.read',
  GRADES_WRITE = 'grades.write',
  SETTINGS_READ = 'settings.read',
  SETTINGS_WRITE = 'settings.write',
  SYSTEM_ADMIN = 'system.admin',
}

// 所有權限（superadmin 用）
const ALL_PERMISSIONS = Object.values(Permission)

// 角色權限對應表
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPERADMIN]: ALL_PERMISSIONS,
  [Role.ADMIN]: [
    // 館長擁有全部權限
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
    Permission.REPORTS_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.GRADES_READ,
    Permission.GRADES_WRITE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
  ],
  [Role.STAFF]: [
    // 行政：學生、排課、帳單、出席、成績、報告
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
    Permission.REPORTS_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.GRADES_READ,
    Permission.GRADES_WRITE,
  ],
  [Role.MANAGER]: [
    // 教室長：學生管理、排課、帳單、報告、出席
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
    Permission.REPORTS_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.GRADES_READ, // 可查看成績以生成報告
  ],
  [Role.TEACHER]: [
    // 教練：查看學生、出席記錄、成績輸入、課程內容
    Permission.STUDENTS_READ,
    Permission.SCHEDULE_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.GRADES_READ,
    Permission.GRADES_WRITE,
  ],
  [Role.PARENT]: [
    // 家長：查看自己孩子的出席/成績/帳單（需搭配資料過濾）
    Permission.STUDENTS_READ,
    Permission.ATTENDANCE_READ,
    Permission.GRADES_READ,
    Permission.BILLING_READ,
  ],
  [Role.STUDENT]: [
    // 學生：查看自己的出席/成績/課表
    Permission.ATTENDANCE_READ,
    Permission.GRADES_READ,
    Permission.SCHEDULE_READ,
  ],
};

// 擴展 Context 的 Variables 型別
export interface RBACVariables {
  user: {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: Role;
  };
  permissions: Permission[];
}

/**
 * 取得用戶的所有權限（角色權限 + 個別權限覆蓋）
 */
export function getUserPermissions(
  role: Role,
  customPermissions?: string[]
): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  
  // 合併角色權限和自訂權限（去重）
  if (customPermissions && customPermissions.length > 0) {
    const permissionSet = new Set([
      ...rolePermissions,
      ...customPermissions.filter((p) =>
        Object.values(Permission).includes(p as Permission)
      ),
    ]);
    return Array.from(permissionSet) as Permission[];
  }
  
  return rolePermissions;
}

/**
 * 檢查用戶是否擁有指定權限
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * 檢查用戶是否擁有任一指定角色
 */
export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Middleware: 要求用戶擁有指定角色之一
 * @param roles 允許的角色列表
 */
export function requireRole(...roles: Role[]): MiddlewareHandler<{
  Variables: RBACVariables;
}> {
  return async (c: Context<{ Variables: RBACVariables }>, next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized: No user found' });
    }
    
    // superadmin bypasses all role checks
    if (user.role === Role.SUPERADMIN) {
      await next();
      return;
    }
    
    if (!hasRole(user.role, roles)) {
      throw new HTTPException(403, {
        message: `Forbidden: Requires one of roles: ${roles.join(', ')}`,
      });
    }
    
    await next();
  };
}

/**
 * Middleware: 要求用戶擁有指定權限
 * @param permission 需要的權限
 */
export function requirePermission(
  permission: Permission
): MiddlewareHandler<{
  Variables: RBACVariables;
}> {
  return async (c: Context<{ Variables: RBACVariables }>, next) => {
    const user = c.get('user');
    const permissions = c.get('permissions');
    
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized: No user found' });
    }
    
    if (!permissions || !hasPermission(permissions, permission)) {
      throw new HTTPException(403, {
        message: `Forbidden: Requires permission '${permission}'`,
      });
    }
    
    await next();
  };
}

/**
 * Middleware: 要求用戶擁有任一指定權限
 * @param permissions 權限列表（符合任一即可）
 */
export function requireAnyPermission(
  ...permissions: Permission[]
): MiddlewareHandler<{
  Variables: RBACVariables;
}> {
  return async (c: Context<{ Variables: RBACVariables }>, next) => {
    const user = c.get('user');
    const userPermissions = c.get('permissions');
    
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized: No user found' });
    }
    
    const hasAny = permissions.some((permission) =>
      hasPermission(userPermissions, permission)
    );
    
    if (!hasAny) {
      throw new HTTPException(403, {
        message: `Forbidden: Requires one of permissions: ${permissions.join(', ')}`,
      });
    }
    
    await next();
  };
}

/**
 * 輔助函式：檢查是否為家長且訪問自己孩子的資料
 * 需在各 route 中搭配業務邏輯使用
 */
export function isParentAccessingOwnChild(
  user: RBACVariables['user'],
  studentId: string,
  studentParentIds: string[]
): boolean {
  return user.role === Role.PARENT && studentParentIds.includes(user.id);
}

/**
 * User Management Routes
 * 
 * 修復項目：
 * 1. ✅ 增加 Input Validation (Zod)
 * 2. ✅ 統一 API Response Format
 * 3. ✅ 增加 Password Complexity Check
 * 4. ✅ 防止 Self-Role Modification
 * 5. ✅ 增加 authMiddleware（原本缺失）
 * 6. ✅ 改善 Error Handling
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db'
import { users, userPermissions } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { createHash, randomBytes } from 'crypto'
import { authMiddleware } from '../middleware/auth'
import {
  Role,
  requireRole,
  getUserPermissions,
  RBACVariables,
} from '../middleware/rbac'
import {
  createUserSchema,
  updateUserRoleSchema,
  uuidSchema,
} from '../utils/validation'
import {
  success,
  badRequest,
  notFound,
  conflict,
  forbidden,
  internalError,
} from '../utils/response'

// Password hashing with salt
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const check = createHash('sha256').update(password + salt).digest('hex')
  return check === hash
}

// Password complexity validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .refine(
    (pw) => /[A-Z]/.test(pw),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (pw) => /[a-z]/.test(pw),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (pw) => /[0-9]/.test(pw),
    'Password must contain at least one number'
  )

const app = new Hono<{ Variables: RBACVariables }>()

// ===== Apply auth middleware to all routes =====
app.use('*', authMiddleware)

// ==================== Admin API ====================

/**
 * GET /api/admin/users - 取得用戶列表（僅 admin）
 */
app.get('/admin/users', requireRole(Role.ADMIN), async (c) => {
  try {
    const currentUser = c.get('user')
    
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.tenantId, currentUser.tenant_id))
    
    const customPerms = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.tenantId, currentUser.tenant_id))
    
    const usersWithPermissions = userList.map((user) => {
      const customPermissionsForUser = customPerms
        .filter((p) => p.userId === user.id)
        .map((p) => p.permission)
      
      const allPermissions = getUserPermissions(
        user.role as Role,
        customPermissionsForUser
      )
      
      return {
        ...user,
        customPermissions: customPermissionsForUser,
        allPermissions: allPermissions,
      }
    })
    
    return success(c, { users: usersWithPermissions })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return internalError(c, error)
  }
})

/**
 * POST /api/admin/users - 新增用戶（僅 admin）
 */
const createUserWithPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().min(1).max(50),
  role: z.enum(['admin', 'manager', 'staff', 'teacher', 'parent', 'student']),
})

app.post('/admin/users', requireRole(Role.ADMIN), zValidator('json', createUserWithPasswordSchema), async (c) => {
  try {
    const currentUser = c.get('user')
    const body = c.req.valid('json')
    
    // Check if email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.tenantId, currentUser.tenant_id),
          eq(users.email, body.email)
        )
      )
      .limit(1)
    
    if (existingUser.length > 0) {
      return conflict(c, 'Email already exists')
    }
    
    const hashedPassword = hashPassword(body.password)
    
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: currentUser.tenant_id,
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: body.role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
    
    return success(c, {
      message: 'User created successfully',
      user: newUser,
    }, 201)
  } catch (error: any) {
    console.error('Error creating user:', error)
    return internalError(c, error)
  }
})

/**
 * PUT /api/admin/users/:id/role - 修改用戶角色（僅 admin）
 */
app.put('/admin/users/:id/role', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateUserRoleSchema),
  async (c) => {
    try {
      const currentUser = c.get('user')
      const { id: userId } = c.req.valid('param')
      const body = c.req.valid('json')
      
      // Check if target user exists
      const [targetUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.tenantId, currentUser.tenant_id)
          )
        )
        .limit(1)
      
      if (!targetUser) {
        return notFound(c, 'User')
      }
      
      // Prevent self-role modification
      if (targetUser.id === currentUser.id) {
        return forbidden(c, 'Cannot modify your own role')
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({
          role: body.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          updatedAt: users.updatedAt,
        })
      
      return success(c, {
        message: 'Role updated successfully',
        user: updatedUser,
      })
    } catch (error: any) {
      console.error('Error updating user role:', error)
      return internalError(c, error)
    }
  }
)

/**
 * DELETE /api/admin/users/:id - 刪除用戶（僅 admin）
 */
app.delete('/admin/users/:id', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const currentUser = c.get('user')
      const { id: userId } = c.req.valid('param')
      
      // Check if target user exists
      const [targetUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.tenantId, currentUser.tenant_id)
          )
        )
        .limit(1)
      
      if (!targetUser) {
        return notFound(c, 'User')
      }
      
      // Prevent self-deletion
      if (targetUser.id === currentUser.id) {
        return forbidden(c, 'Cannot delete yourself')
      }
      
      // Soft delete - if table supports it
      // Otherwise hard delete
      // await db.delete(users).where(eq(users.id, userId))
      
      // For now, assuming soft delete via updatedAt or a deleted_at field
      // If no deleted_at, do hard delete
      await db.delete(users).where(eq(users.id, userId))
      
      return success(c, { message: 'User deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting user:', error)
      return internalError(c, error)
    }
  }
)

// ==================== Auth API ====================

/**
 * GET /api/auth/me - 取得當前用戶資訊 + 權限列表
 */
app.get('/auth/me', async (c) => {
  try {
    const user = c.get('user')
    const permissions = c.get('permissions')
    
    if (!user) {
      return forbidden(c, 'Unauthorized')
    }
    
    // Fetch custom permissions
    const customPerms = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, user.id),
          eq(userPermissions.tenantId, user.tenant_id)
        )
      )
    
    const customPermissionList = customPerms.map((p) => p.permission)
    
    return success(c, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
      },
      permissions: permissions || [],
      customPermissions: customPermissionList,
    })
  } catch (error: any) {
    console.error('Error fetching user info:', error)
    return internalError(c, error)
  }
})

/**
 * PUT /api/auth/password - 修改密碼
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

app.put('/auth/password', zValidator('json', changePasswordSchema), async (c) => {
  try {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    if (!user) {
      return forbidden(c, 'Unauthorized')
    }
    
    // Get user with password
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
    
    if (!dbUser || !dbUser.password) {
      return badRequest(c, 'Cannot change password for this account')
    }
    
    // Verify current password
    if (!verifyPassword(body.currentPassword, dbUser.password)) {
      return badRequest(c, 'Current password is incorrect')
    }
    
    // Prevent reusing the same password
    if (verifyPassword(body.newPassword, dbUser.password)) {
      return badRequest(c, 'New password must be different from current password')
    }
    
    // Update password
    const hashedPassword = hashPassword(body.newPassword)
    
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
    
    return success(c, { message: 'Password changed successfully' })
  } catch (error: any) {
    console.error('Error changing password:', error)
    return internalError(c, error)
  }
})

export { verifyPassword, hashPassword }
export default app

// ===== Enums & Constants =====

/**
 * Tenant subscription plans
 */
export type TenantPlan = 'free' | 'basic' | 'pro' | 'enterprise'

/**
 * Trial status for tenant
 */
export type TrialStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired'

/**
 * User roles
 */
export type UserRole = 'parent' | 'teacher' | 'admin' | 'super_admin'

/**
 * Communication channels
 */
export type Channel = 'telegram' | 'line' | 'web' | 'email'

/**
 * Notification types
 */
export type NotificationType = 'schedule_change' | 'billing_reminder' | 'attendance_alert' | 'grade_notification'

/**
 * Notification channels
 */
export type NotificationChannel = 'telegram' | 'line' | 'email'

/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped'

// ===== Core Entity Types =====

/**
 * Tenant - Multi-tenant organization
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  // Trial system fields
  trialStatus: TrialStatus | null
  trialStartAt: Date | null
  trialEndAt: Date | null
  trialApprovedBy: string | null
  trialApprovedAt: Date | null
  trialNotes: string | null
  // Settings & metadata
  settings: Record<string, unknown>
  active: boolean | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * New tenant for insertion
 */
export interface NewTenant {
  id?: string
  name: string
  slug: string
  plan?: TenantPlan
  trialStatus?: TrialStatus | null
  trialStartAt?: Date | null
  trialEndAt?: Date | null
  trialApprovedBy?: string | null
  trialApprovedAt?: Date | null
  trialNotes?: string | null
  settings?: Record<string, unknown>
  active?: boolean | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

/**
 * Branch - Physical location or department
 */
export interface Branch {
  id: string
  tenantId: string | null
  name: string
  code: string
  settings: Record<string, unknown>
  createdAt: Date | null
}

/**
 * New branch for insertion
 */
export interface NewBranch {
  id?: string
  tenantId?: string | null
  name: string
  code: string
  settings?: Record<string, unknown>
  createdAt?: Date | null
}

/**
 * User - System user (parent, teacher, admin, etc.)
 */
export interface User {
  id: string
  tenantId: string | null
  branchId: string | null
  firebaseUid: string | null
  telegramId: string | null
  lineUserId: string | null
  role: UserRole
  name: string
  phone: string | null
  email: string | null
  password: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * New user for insertion
 */
export interface NewUser {
  id?: string
  tenantId?: string | null
  branchId?: string | null
  firebaseUid?: string | null
  telegramId?: string | null
  lineUserId?: string | null
  role?: UserRole
  name: string
  phone?: string | null
  email?: string | null
  password?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

/**
 * User permission
 */
export interface UserPermission {
  id: string
  tenantId: string | null
  userId: string | null
  permission: string
  createdAt: Date | null
}

/**
 * New user permission for insertion
 */
export interface NewUserPermission {
  id?: string
  tenantId?: string | null
  userId?: string | null
  permission: string
  createdAt?: Date | null
}

/**
 * Conversation - AI chat interaction
 */
export interface Conversation {
  id: string
  tenantId: string | null
  branchId: string
  userId: string | null
  channel: string
  intent: string | null
  query: string
  answer: string
  model: string | null
  latencyMs: number | null
  tokensUsed: number | null
  createdAt: Date | null
}

/**
 * New conversation for insertion
 */
export interface NewConversation {
  id?: string
  tenantId?: string | null
  branchId: string
  userId?: string | null
  channel: string
  intent?: string | null
  query: string
  answer: string
  model?: string | null
  latencyMs?: number | null
  tokensUsed?: number | null
  createdAt?: Date | null
}

/**
 * Knowledge chunk - RAG knowledge base entry
 */
export interface KnowledgeChunk {
  id: string
  tenantId: string | null
  branchId: string
  content: string
  metadata: Record<string, unknown>
  createdAt: Date | null
}

/**
 * New knowledge chunk for insertion
 */
export interface NewKnowledgeChunk {
  id?: string
  tenantId?: string | null
  branchId: string
  content: string
  metadata?: Record<string, unknown>
  createdAt?: Date | null
}

/**
 * Notification - System notification
 */
export interface Notification {
  id: string
  tenantId: string
  type: NotificationType
  recipientId: string
  studentId: string | null
  title: string
  body: string
  channel: NotificationChannel
  status: NotificationStatus
  metadata: Record<string, unknown>
  errorMessage: string | null
  sentAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * New notification for insertion
 */
export interface NewNotification {
  id?: string
  tenantId: string
  type: NotificationType
  recipientId: string
  studentId?: string | null
  title: string
  body: string
  channel: NotificationChannel
  status?: NotificationStatus
  metadata?: Record<string, unknown>
  errorMessage?: string | null
  sentAt?: Date | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

/**
 * Notification preference - User notification settings
 */
export interface NotificationPreference {
  id: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
  enabled: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * New notification preference for insertion
 */
export interface NewNotificationPreference {
  id?: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
  enabled?: boolean
  createdAt?: Date | null
  updatedAt?: Date | null
}

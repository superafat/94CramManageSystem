import { pgTable, varchar, text, timestamp, boolean, integer, decimal, uuid, uniqueIndex, index } from '../connection';

export const stockCategories = pgTable('stock_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 20 }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_categories_tenant_id_idx').on(table.tenantId),
}));

export const stockItems = pgTable('stock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  categoryId: uuid('category_id').references(() => stockCategories.id),
  name: varchar('name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  unit: varchar('unit', { length: 50 }).notNull(),
  safetyStock: integer('safety_stock').default(0),
  schoolYear: varchar('school_year', { length: 20 }),
  version: varchar('version', { length: 50 }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_items_tenant_id_idx').on(table.tenantId),
}));

export const stockWarehouses = pgTable('stock_warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  address: text('address'),
  isHeadquarters: boolean('is_headquarters').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_warehouses_tenant_id_idx').on(table.tenantId),
}));

export const stockInventory = pgTable('stock_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  quantity: integer('quantity').default(0).notNull(),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  unq: uniqueIndex('stock_inventory_warehouse_item_unq').on(table.warehouseId, table.itemId),
  tenantIdx: index('stock_inventory_tenant_id_idx').on(table.tenantId),
}));

export const stockSuppliers = pgTable('stock_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_suppliers_tenant_id_idx').on(table.tenantId),
}));

export const stockPurchaseOrders = pgTable('stock_purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  supplierId: uuid('supplier_id').references(() => stockSuppliers.id),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  orderDate: timestamp('order_date').notNull(),
  receivedDate: timestamp('received_date'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_purchase_orders_tenant_id_idx').on(table.tenantId),
}));

export const stockPurchaseItems = pgTable('stock_purchase_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => stockPurchaseOrders.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stockTransactions = pgTable('stock_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(),
  quantity: integer('quantity').notNull(),
  referenceId: uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 50 }),
  recipientName: varchar('recipient_name', { length: 100 }),
  recipientNote: text('recipient_note'),
  performedBy: uuid('performed_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_transactions_tenant_id_idx').on(table.tenantId),
  tenantCreatedIdx: index('stock_transactions_tenant_created_idx').on(table.tenantId, table.createdAt),
}));

export const stockAuditLogs = pgTable('stock_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_audit_logs_tenant_id_idx').on(table.tenantId),
}));

export const stockClasses = pgTable('stock_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  grade: varchar('grade', { length: 50 }),
  subject: varchar('subject', { length: 100 }),
  schoolYear: varchar('school_year', { length: 20 }),
  studentCount: integer('student_count').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_classes_tenant_id_idx').on(table.tenantId),
}));

export const stockClassMaterials = pgTable('stock_class_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  classId: uuid('class_id').notNull().references(() => stockClasses.id),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  quantityPerStudent: integer('quantity_per_student').default(1).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_class_materials_tenant_id_idx').on(table.tenantId),
}));

export const stockMaterialDistributions = pgTable('stock_material_distributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  classId: uuid('class_id').references(() => stockClasses.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  distributedQuantity: integer('distributed_quantity').notNull(),
  studentName: varchar('student_name', { length: 100 }),
  distributedAt: timestamp('distributed_at').defaultNow().notNull(),
  performedBy: uuid('performed_by'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  tenantIdx: index('stock_material_distributions_tenant_id_idx').on(table.tenantId),
}));

export const stockNotificationSettings = pgTable('stock_notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  telegramChatId: varchar('telegram_chat_id', { length: 100 }),
  telegramBotToken: varchar('telegram_bot_token', { length: 200 }),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_notification_settings_tenant_id_idx').on(table.tenantId),
}));

export const stockNotifications = pgTable('stock_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  telegramChatId: varchar('telegram_chat_id', { length: 100 }),
  telegramMessageId: varchar('telegram_message_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
}, (table) => ({
  tenantIdx: index('stock_notifications_tenant_id_idx').on(table.tenantId),
}));

export const stockAiPredictions = pgTable('stock_ai_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  predictionType: varchar('prediction_type', { length: 50 }).notNull(),
  predictedQuantity: integer('predicted_quantity').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  reason: text('reason'),
  schoolYear: varchar('school_year', { length: 20 }),
  semester: varchar('semester', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  appliedAt: timestamp('applied_at'),
}, (table) => ({
  tenantIdx: index('stock_ai_predictions_tenant_id_idx').on(table.tenantId),
}));

export const stockHistoricalUsage = pgTable('stock_historical_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  outQuantity: integer('out_quantity').default(0).notNull(),
  classCount: integer('class_count').default(0),
  studentCount: integer('student_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_historical_usage_tenant_id_idx').on(table.tenantId),
}));

export const stockIntegrationSettings = pgTable('stock_integration_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  integrationType: varchar('integration_type', { length: 50 }).notNull(),
  apiEndpoint: varchar('api_endpoint', { length: 500 }),
  apiKey: varchar('api_key', { length: 500 }),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_integration_settings_tenant_id_idx').on(table.tenantId),
}));

export const stockStudents = pgTable('stock_students', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  externalId: varchar('external_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 50 }),
  classId: uuid('class_id').references(() => stockClasses.id),
  tuitionPaid: boolean('tuition_paid').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_students_tenant_id_idx').on(table.tenantId),
}));

export const stockInventoryCounts = pgTable('stock_inventory_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull().references(() => stockWarehouses.id),
  name: varchar('name', { length: 200 }).notNull(),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdBy: uuid('created_by'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_inventory_counts_tenant_id_idx').on(table.tenantId),
}));

export const stockInventoryCountItems = pgTable('stock_inventory_count_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  countId: uuid('count_id').notNull().references(() => stockInventoryCounts.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  systemQuantity: integer('system_quantity').notNull(),
  countedQuantity: integer('counted_quantity'),
  difference: integer('difference'),
  barcode: varchar('barcode', { length: 100 }),
  countedAt: timestamp('counted_at'),
  countedBy: uuid('counted_by'),
  notes: text('notes'),
});

export const stockBarcodes = pgTable('stock_barcodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').notNull().references(() => stockItems.id),
  barcode: varchar('barcode', { length: 100 }).notNull().unique(),
  barcodeType: varchar('barcode_type', { length: 50 }).default('code128'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('stock_barcodes_tenant_id_idx').on(table.tenantId),
}));

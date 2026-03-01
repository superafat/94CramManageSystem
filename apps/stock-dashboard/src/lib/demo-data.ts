/**
 * Stock Dashboard Demo 假資料模組
 * 當 demo 用戶登入時，API proxy 會回傳這些資料而非呼叫真實 backend
 * 所有回傳格式須匹配前端頁面的 TypeScript 型別定義（camelCase）
 */

const DEMO_TENANT_1 = '11111111-1111-1111-1111-111111111111'
const DEMO_TENANT_2 = '22222222-2222-2222-2222-222222222222'

export const DEMO_TENANTS = [DEMO_TENANT_1, DEMO_TENANT_2]

// ===== Warehouses (used by multiple pages as { id, name }) =====
const WAREHOUSES = [
  { id: 'wh1', name: '總部教材倉', address: '台北市中正區重慶南路一段100號', isDefault: true, tenantId: DEMO_TENANT_1 },
  { id: 'wh2', name: '中壢分校倉', address: '桃園市中壢區中正路200號', isDefault: false, tenantId: DEMO_TENANT_1 },
]

// ===== Categories =====
const CATEGORIES = [
  { id: 'cat1', name: '講義', color: '#8FA895', itemCount: 5 },
  { id: 'cat2', name: '教材', color: '#9DAEBB', itemCount: 3 },
  { id: 'cat3', name: '耗材', color: '#C4A4A0', itemCount: 4 },
]

// ===== Items (StockItem: { id, name, sku, unit, safetyStock, schoolYear, version, isActive }) =====
const ITEMS = [
  { id: 'item1', name: '國中數學 A 班講義 Vol.1', sku: 'MTH-A-V1', categoryId: 'cat1', categoryName: '講義', unit: '本', safetyStock: 20, schoolYear: '114', version: 'v1', isActive: true },
  { id: 'item2', name: '國中數學 A 班講義 Vol.2', sku: 'MTH-A-V2', categoryId: 'cat1', categoryName: '講義', unit: '本', safetyStock: 20, schoolYear: '114', version: 'v1', isActive: true },
  { id: 'item3', name: '國中英文菁英班講義', sku: 'ENG-E-V1', categoryId: 'cat1', categoryName: '講義', unit: '本', safetyStock: 15, schoolYear: '114', version: 'v1', isActive: true },
  { id: 'item4', name: '國小先修班數學講義', sku: 'MTH-P-V1', categoryId: 'cat1', categoryName: '講義', unit: '本', safetyStock: 12, schoolYear: '114', version: 'v1', isActive: true },
  { id: 'item5', name: '英文文法練習冊', sku: 'ENG-WB-1', categoryId: 'cat1', categoryName: '講義', unit: '本', safetyStock: 15, schoolYear: '114', version: 'v1', isActive: true },
  { id: 'item6', name: '白板筆（黑色）', sku: 'SUP-PEN-B', categoryId: 'cat3', categoryName: '耗材', unit: '支', safetyStock: 30, schoolYear: '', version: '', isActive: true },
  { id: 'item7', name: '白板筆（紅色）', sku: 'SUP-PEN-R', categoryId: 'cat3', categoryName: '耗材', unit: '支', safetyStock: 20, schoolYear: '', version: '', isActive: true },
  { id: 'item8', name: 'A4 影印紙', sku: 'SUP-A4', categoryId: 'cat3', categoryName: '耗材', unit: '包', safetyStock: 10, schoolYear: '', version: '', isActive: true },
  { id: 'item9', name: '計算機', sku: 'EQP-CALC', categoryId: 'cat2', categoryName: '教材', unit: '台', safetyStock: 5, schoolYear: '', version: '', isActive: true },
  { id: 'item10', name: '英文字典', sku: 'EQP-DICT', categoryId: 'cat2', categoryName: '教材', unit: '本', safetyStock: 5, schoolYear: '', version: '', isActive: true },
  { id: 'item11', name: '三角板組', sku: 'EQP-TRI', categoryId: 'cat2', categoryName: '教材', unit: '組', safetyStock: 8, schoolYear: '', version: '', isActive: true },
  { id: 'item12', name: '板擦', sku: 'SUP-ERASER', categoryId: 'cat3', categoryName: '耗材', unit: '個', safetyStock: 10, schoolYear: '', version: '', isActive: true },
]

// ===== Inventory (InventoryItem: { id, itemId, itemName, sku, unit, warehouseName, quantity, safetyStock }) =====
const INVENTORY = [
  { id: 'inv1', itemId: 'item1', itemName: '國中數學 A 班講義 Vol.1', sku: 'MTH-A-V1', unit: '本', warehouseName: '總部教材倉', quantity: 45, safetyStock: 20 },
  { id: 'inv2', itemId: 'item2', itemName: '國中數學 A 班講義 Vol.2', sku: 'MTH-A-V2', unit: '本', warehouseName: '總部教材倉', quantity: 38, safetyStock: 20 },
  { id: 'inv3', itemId: 'item3', itemName: '國中英文菁英班講義', sku: 'ENG-E-V1', unit: '本', warehouseName: '總部教材倉', quantity: 22, safetyStock: 15 },
  { id: 'inv4', itemId: 'item4', itemName: '國小先修班數學講義', sku: 'MTH-P-V1', unit: '本', warehouseName: '總部教材倉', quantity: 8, safetyStock: 12 },
  { id: 'inv5', itemId: 'item5', itemName: '英文文法練習冊', sku: 'ENG-WB-1', unit: '本', warehouseName: '總部教材倉', quantity: 30, safetyStock: 15 },
  { id: 'inv6', itemId: 'item6', itemName: '白板筆（黑色）', sku: 'SUP-PEN-B', unit: '支', warehouseName: '總部教材倉', quantity: 50, safetyStock: 30 },
  { id: 'inv7', itemId: 'item7', itemName: '白板筆（紅色）', sku: 'SUP-PEN-R', unit: '支', warehouseName: '總部教材倉', quantity: 5, safetyStock: 20 },
  { id: 'inv8', itemId: 'item8', itemName: 'A4 影印紙', sku: 'SUP-A4', unit: '包', warehouseName: '總部教材倉', quantity: 3, safetyStock: 10 },
  { id: 'inv9', itemId: 'item9', itemName: '計算機', sku: 'EQP-CALC', unit: '台', warehouseName: '總部教材倉', quantity: 8, safetyStock: 5 },
  { id: 'inv10', itemId: 'item10', itemName: '英文字典', sku: 'EQP-DICT', unit: '本', warehouseName: '總部教材倉', quantity: 12, safetyStock: 5 },
  { id: 'inv11', itemId: 'item11', itemName: '三角板組', sku: 'EQP-TRI', unit: '組', warehouseName: '總部教材倉', quantity: 6, safetyStock: 8 },
  { id: 'inv12', itemId: 'item12', itemName: '板擦', sku: 'SUP-ERASER', unit: '個', warehouseName: '總部教材倉', quantity: 15, safetyStock: 10 },
  { id: 'inv13', itemId: 'item1', itemName: '國中數學 A 班講義 Vol.1', sku: 'MTH-A-V1', unit: '本', warehouseName: '中壢分校倉', quantity: 18, safetyStock: 20 },
  { id: 'inv14', itemId: 'item3', itemName: '國中英文菁英班講義', sku: 'ENG-E-V1', unit: '本', warehouseName: '中壢分校倉', quantity: 10, safetyStock: 15 },
  { id: 'inv15', itemId: 'item6', itemName: '白板筆（黑色）', sku: 'SUP-PEN-B', unit: '支', warehouseName: '中壢分校倉', quantity: 25, safetyStock: 30 },
]

// ===== Transactions ({ item: {name}, warehouse: {name}, transaction: {id, transactionType, quantity, createdAt} }) =====
const TRANSACTIONS = [
  { item: { name: '國中數學 A 班講義 Vol.1' }, warehouse: { name: '總部教材倉' }, transaction: { id: 'tx1', transactionType: 'purchase_in', quantity: 50, createdAt: '2026-02-15T10:00:00Z' } },
  { item: { name: '國中數學 A 班講義 Vol.1' }, warehouse: { name: '總部教材倉' }, transaction: { id: 'tx2', transactionType: 'stock_out', quantity: -5, createdAt: '2026-02-20T14:30:00Z' } },
  { item: { name: '白板筆（黑色）' }, warehouse: { name: '總部教材倉' }, transaction: { id: 'tx3', transactionType: 'purchase_in', quantity: 60, createdAt: '2026-02-18T09:00:00Z' } },
  { item: { name: '白板筆（黑色）' }, warehouse: { name: '總部教材倉' }, transaction: { id: 'tx4', transactionType: 'stock_out', quantity: -10, createdAt: '2026-02-25T16:00:00Z' } },
  { item: { name: '國中數學 A 班講義 Vol.1' }, warehouse: { name: '總部 → 中壢分校' }, transaction: { id: 'tx5', transactionType: 'transfer_out', quantity: -20, createdAt: '2026-02-22T11:00:00Z' } },
  { item: { name: '國中英文菁英班講義' }, warehouse: { name: '總部教材倉' }, transaction: { id: 'tx6', transactionType: 'purchase_in', quantity: 30, createdAt: '2026-02-28T10:30:00Z' } },
  { item: { name: 'A4 影印紙' }, warehouse: { name: '總部教材倉' }, transaction: { id: 'tx7', transactionType: 'stock_out', quantity: -7, createdAt: '2026-03-01T08:00:00Z' } },
]

// ===== Suppliers (Supplier: { id, name, contactName, phone, email, address, notes }) =====
const SUPPLIERS = [
  { id: 'sup1', name: '大華印刷', contactName: '陳經理', phone: '02-2381-1234', email: 'print@dahua.com', address: '台北市中正區忠孝東路', notes: '講義印製、裝訂' },
  { id: 'sup2', name: '台灣文具批發', contactName: '林小姐', phone: '02-2771-5678', email: 'order@twstationery.com', address: '台北市大安區信義路', notes: '白板筆、影印紙等耗材' },
  { id: 'sup3', name: '教育圖書社', contactName: '張老闆', phone: '03-422-9999', email: 'book@edutw.com', address: '桃園市中壢區中央西路', notes: '教材、字典、參考書' },
]

// ===== Purchase Orders (PurchaseOrderListItem: { order: { id, status, orderDate, totalAmount }, supplierName, warehouseName }) =====
const PURCHASE_ORDERS = [
  { order: { id: 'po1', status: 'received', orderDate: '2026-02-10T09:00:00Z', totalAmount: '15000' }, supplierName: '大華印刷', warehouseName: '總部教材倉' },
  { order: { id: 'po2', status: 'approved', orderDate: '2026-02-28T14:00:00Z', totalAmount: '4500' }, supplierName: '台灣文具批發', warehouseName: '總部教材倉' },
  { order: { id: 'po3', status: 'pending', orderDate: '2026-03-01T11:00:00Z', totalAmount: '8000' }, supplierName: '教育圖書社', warehouseName: '總部教材倉' },
]

// ===== Purchase Order Detail =====
const PURCHASE_ORDER_DETAILS: Record<string, unknown> = {
  po1: { order: { id: 'po1', status: 'received', orderDate: '2026-02-10T09:00:00Z', totalAmount: '15000', notes: '' }, supplierName: '大華印刷', warehouseName: '總部教材倉', items: [{ id: 'poi1', itemId: 'item1', itemName: '國中數學 A 班講義 Vol.1', quantity: 50, unitPrice: 200, subtotal: 10000 }, { id: 'poi2', itemId: 'item4', itemName: '國小先修班數學講義', quantity: 25, unitPrice: 200, subtotal: 5000 }] },
  po2: { order: { id: 'po2', status: 'approved', orderDate: '2026-02-28T14:00:00Z', totalAmount: '4500', notes: '' }, supplierName: '台灣文具批發', warehouseName: '總部教材倉', items: [{ id: 'poi3', itemId: 'item6', itemName: '白板筆（黑色）', quantity: 60, unitPrice: 25, subtotal: 1500 }, { id: 'poi4', itemId: 'item7', itemName: '白板筆（紅色）', quantity: 40, unitPrice: 25, subtotal: 1000 }, { id: 'poi5', itemId: 'item8', itemName: 'A4 影印紙', quantity: 20, unitPrice: 100, subtotal: 2000 }] },
  po3: { order: { id: 'po3', status: 'pending', orderDate: '2026-03-01T11:00:00Z', totalAmount: '8000', notes: '' }, supplierName: '教育圖書社', warehouseName: '總部教材倉', items: [{ id: 'poi6', itemId: 'item10', itemName: '英文字典', quantity: 10, unitPrice: 500, subtotal: 5000 }, { id: 'poi7', itemId: 'item11', itemName: '三角板組', quantity: 20, unitPrice: 150, subtotal: 3000 }] },
}

// ===== Barcodes =====
const BARCODES = ITEMS.map(item => ({
  barcode: {
    id: `bc-${item.id}`,
    itemId: item.id,
    barcode: `8899${item.sku.replace(/[^A-Z0-9]/g, '')}`,
    barcodeType: 'code128',
    isPrimary: true,
  },
  itemName: item.name,
}))

// ===== Inventory Counts =====
const INVENTORY_COUNTS = [
  { id: 'ic1', name: '2月總部盤點', warehouseId: 'wh1', warehouseName: '總部教材倉', status: 'completed', createdBy: 'Demo 倉管', createdAt: '2026-02-25T09:00:00Z', completedAt: '2026-02-25T12:00:00Z', totalItems: 12, discrepancyCount: 2 },
  { id: 'ic2', name: '3月中壢分校盤點', warehouseId: 'wh2', warehouseName: '中壢分校倉', status: 'in_progress', createdBy: 'Demo 行政', createdAt: '2026-03-01T09:00:00Z', completedAt: null, totalItems: 3, discrepancyCount: 0 },
]

const INVENTORY_COUNT_ITEMS: Record<string, unknown[]> = {
  ic1: [
    { id: 'ici1', itemId: 'item6', itemName: '白板筆（黑色）', systemQty: 55, countedQty: 50, difference: -5 },
    { id: 'ici2', itemId: 'item8', itemName: 'A4 影印紙', systemQty: 12, countedQty: 10, difference: -2 },
  ],
  ic2: [],
}

// ===== AI Predictions (Prediction: { id, itemId, warehouseId, predictionType, predictedQuantity, confidence, reason, appliedAt, createdAt }) =====
const PREDICTIONS = [
  { id: 'pred1', itemId: 'item4', warehouseId: 'wh1', predictionType: 'reorder', predictedQuantity: 17, confidence: '0.85', reason: '國小先修班數學講義庫存低於安全水位，建議補貨 17 本', appliedAt: null, createdAt: '2026-03-01T06:00:00Z' },
  { id: 'pred2', itemId: 'item7', warehouseId: 'wh1', predictionType: 'reorder', predictedQuantity: 25, confidence: '0.92', reason: '白板筆（紅色）庫存僅剩 5 支，消耗速度快，緊急補貨 25 支', appliedAt: null, createdAt: '2026-03-01T06:00:00Z' },
  { id: 'pred3', itemId: 'item8', warehouseId: 'wh1', predictionType: 'reorder', predictedQuantity: 12, confidence: '0.88', reason: 'A4 影印紙僅剩 3 包，預計 1 週內耗盡，建議補貨 12 包', appliedAt: null, createdAt: '2026-03-01T06:00:00Z' },
  { id: 'pred4', itemId: 'item1', warehouseId: 'wh1', predictionType: 'semester', predictedQuantity: 0, confidence: '0.95', reason: '國中數學 A 班講義庫存充足，無需補貨', appliedAt: null, createdAt: '2026-03-01T06:00:00Z' },
]

// ===== Notification Settings =====
const NOTIFICATION_SETTINGS = [
  { id: 'ns1', type: 'low_stock' as const, telegramChatId: '', telegramBotToken: '', isEnabled: true },
  { id: 'ns2', type: 'purchase_approval' as const, telegramChatId: '', telegramBotToken: '', isEnabled: false },
  { id: 'ns3', type: 'system' as const, telegramChatId: '', telegramBotToken: '', isEnabled: true },
]

const NOTIFICATION_HISTORY = [
  { id: 'nh1', type: 'low_stock', title: '低庫存警告', message: '白板筆（紅色）庫存剩 5 支，低於安全庫存 20', status: 'sent', errorMessage: null, createdAt: '2026-03-01T06:00:00Z', sentAt: '2026-03-01T06:01:00Z' },
  { id: 'nh2', type: 'low_stock', title: '低庫存警告', message: 'A4 影印紙庫存剩 3 包，低於安全庫存 10', status: 'sent', errorMessage: null, createdAt: '2026-03-01T06:00:00Z', sentAt: '2026-03-01T06:01:00Z' },
  { id: 'nh3', type: 'system', title: '盤點完成', message: '總部教材倉盤點完成，發現 2 項差異', status: 'sent', errorMessage: null, createdAt: '2026-02-25T12:05:00Z', sentAt: '2026-02-25T12:06:00Z' },
]

// ===== Dashboard (DashboardData) =====
const DASHBOARD_DATA = {
  totalItems: 12,
  totalInventoryValue: 52800,
  lowStockCount: 3,
  warehouseCount: 2,
  todayTransactions: 1,
  monthTransactions: 7,
  recentTransactions: TRANSACTIONS.slice(0, 5),
  topItems: [
    { inventory: { quantity: 8 }, item: { name: '國小先修班數學講義', safetyStock: 12 } },
    { inventory: { quantity: 5 }, item: { name: '白板筆（紅色）', safetyStock: 20 } },
    { inventory: { quantity: 3 }, item: { name: 'A4 影印紙', safetyStock: 10 } },
    { inventory: { quantity: 6 }, item: { name: '三角板組', safetyStock: 8 } },
    { inventory: { quantity: 45 }, item: { name: '國中數學 A 班講義 Vol.1', safetyStock: 20 } },
  ],
}

// ===== Reports =====
const REPORTS_SUMMARY = {
  totalItems: 12,
  totalValue: 52800,
  lowStockCount: 3,
  byWarehouse: { '總部教材倉': { count: 12 }, '中壢分校倉': { count: 3 } } as Record<string, { count: number }>,
}

const REPORTS_TURNOVER = [
  { itemId: 'item1', itemName: '國中數學 A 班講義 Vol.1', currentQty: 63, monthlyOut: 25, avgDailyUsage: 0.83, inventoryDays: 76, isStagnant: false },
  { itemId: 'item6', itemName: '白板筆（黑色）', currentQty: 75, monthlyOut: 10, avgDailyUsage: 0.33, inventoryDays: 227, isStagnant: true },
  { itemId: 'item7', itemName: '白板筆（紅色）', currentQty: 5, monthlyOut: 15, avgDailyUsage: 0.5, inventoryDays: 10, isStagnant: false },
  { itemId: 'item8', itemName: 'A4 影印紙', currentQty: 3, monthlyOut: 7, avgDailyUsage: 0.23, inventoryDays: 13, isStagnant: false },
]

const REPORTS_PURCHASES = {
  totalAmount: 27500,
  bySupplier: [
    { supplierName: '大華印刷', amount: 15000 },
    { supplierName: '教育圖書社', amount: 8000 },
    { supplierName: '台灣文具批發', amount: 4500 },
  ],
  byItem: [
    { itemName: '國中數學 A 班講義 Vol.1', quantity: 50 },
    { itemName: '國小先修班數學講義', quantity: 25 },
    { itemName: '白板筆（黑色）', quantity: 60 },
  ],
}

const REPORTS_PROMO = {
  records: [] as Array<{ transaction: { id: string; recipientName: string | null; quantity: number } }>,
  byRecipient: [] as Array<{ recipient: string; quantity: number }>,
  byItem: [] as Array<{ itemName: string; quantity: number }>,
}

// ===== Classes =====
const CLASSES = [
  { id: 'cls1', name: '國中數學 A 班', teacherName: '王老師', schedule: '每週二四 19:00-21:00', studentCount: 25 },
  { id: 'cls2', name: '國中英文菁英班', teacherName: '李老師', schedule: '每週一三五 18:00-20:00', studentCount: 20 },
  { id: 'cls3', name: '國小先修班', teacherName: '陳老師', schedule: '每週六 09:00-12:00', studentCount: 15 },
]

// ===== Route handler =====
export function getDemoResponse(method: string, path: string, _searchParams: URLSearchParams): { status: number; body: unknown } | null {
  if (method === 'GET') {
    // Dashboard
    if (path === '/api/reports/dashboard') return { status: 200, body: DASHBOARD_DATA }

    // Reports (specific routes before wildcard)
    if (path === '/api/reports/summary') return { status: 200, body: REPORTS_SUMMARY }
    if (path === '/api/reports/turnover') return { status: 200, body: REPORTS_TURNOVER }
    if (path === '/api/reports/purchases') return { status: 200, body: REPORTS_PURCHASES }
    if (path === '/api/reports/promo-stats') return { status: 200, body: REPORTS_PROMO }
    if (path.startsWith('/api/reports')) return { status: 200, body: REPORTS_SUMMARY }

    // Warehouses
    if (path === '/api/warehouses') return { status: 200, body: WAREHOUSES }

    // Categories
    if (path === '/api/categories') return { status: 200, body: CATEGORIES }

    // Items
    if (path === '/api/items') return { status: 200, body: ITEMS }
    const itemMatch = path.match(/^\/api\/items\/([\w-]+)$/)
    if (itemMatch) {
      const item = ITEMS.find(i => i.id === itemMatch[1])
      return item ? { status: 200, body: item } : { status: 404, body: { error: 'Not found' } }
    }

    // Inventory
    if (path === '/api/inventory') return { status: 200, body: INVENTORY }

    // Inventory Transactions (used by stock-in, stock-out, transfer pages)
    if (path === '/api/inventory/transactions') return { status: 200, body: TRANSACTIONS }

    // Suppliers
    if (path === '/api/suppliers') return { status: 200, body: SUPPLIERS }

    // Purchase Orders
    if (path === '/api/purchase-orders') return { status: 200, body: PURCHASE_ORDERS }
    const poMatch = path.match(/^\/api\/purchase-orders\/([\w-]+)$/)
    if (poMatch) {
      const detail = PURCHASE_ORDER_DETAILS[poMatch[1]]
      return detail ? { status: 200, body: detail } : { status: 404, body: { error: 'Not found' } }
    }

    // Barcodes
    if (path === '/api/barcodes') return { status: 200, body: BARCODES }
    const barcodeLookup = path.match(/^\/api\/barcodes\/lookup\/(.+)$/)
    if (barcodeLookup) {
      const code = decodeURIComponent(barcodeLookup[1])
      const found = BARCODES.find(b => b.barcode.barcode === code)
      if (found) {
        return { status: 200, body: { item: { id: found.barcode.itemId, name: found.itemName } } }
      }
      return { status: 404, body: { error: 'Barcode not found' } }
    }

    // Inventory Counts
    if (path === '/api/inventory-counts') return { status: 200, body: INVENTORY_COUNTS }
    const icItemsMatch = path.match(/^\/api\/inventory-counts\/([\w-]+)\/items$/)
    if (icItemsMatch) return { status: 200, body: INVENTORY_COUNT_ITEMS[icItemsMatch[1]] || [] }
    const icMatch = path.match(/^\/api\/inventory-counts\/([\w-]+)$/)
    if (icMatch) {
      const ic = INVENTORY_COUNTS.find(c => c.id === icMatch[1])
      return ic ? { status: 200, body: ic } : { status: 404, body: { error: 'Not found' } }
    }

    // Notifications
    if (path === '/api/notifications/settings') return { status: 200, body: NOTIFICATION_SETTINGS }
    if (path === '/api/notifications/history') return { status: 200, body: NOTIFICATION_HISTORY }
    if (path === '/api/alerts' || path === '/api/notifications') return { status: 200, body: NOTIFICATION_HISTORY }

    // AI Predictions
    if (path === '/api/ai/predictions') return { status: 200, body: PREDICTIONS }
    if (path.startsWith('/api/ai')) return { status: 200, body: PREDICTIONS }

    // Transfers
    if (path === '/api/transfers') {
      return { status: 200, body: TRANSACTIONS.filter(t => t.transaction.transactionType === 'transfer_out') }
    }

    // Classes
    if (path === '/api/classes') return { status: 200, body: CLASSES }
    const classMaterialsMatch = path.match(/^\/api\/classes\/([\w-]+)\/materials$/)
    if (classMaterialsMatch) return { status: 200, body: [] }
    const classRequiredMatch = path.match(/^\/api\/classes\/([\w-]+)\/required-stock$/)
    if (classRequiredMatch) return { status: 200, body: [] }
    const classMatch = path.match(/^\/api\/classes\/([\w-]+)$/)
    if (classMatch) {
      const cls = CLASSES.find(c => c.id === classMatch[1])
      return cls ? { status: 200, body: cls } : { status: 404, body: { error: 'Not found' } }
    }

    // Integrations
    if (path === '/api/integrations/settings') return { status: 200, body: { manageConnected: true, inclassConnected: true, autoSync: false } }
    if (path === '/api/integrations/sync-status') return { status: 200, body: { lastSync: '2026-03-01T06:00:00Z', status: 'success' } }
    if (path === '/api/integrations/students') return { status: 200, body: [] }
    if (path === '/api/integrations') return { status: 200, body: { manageConnected: true, inclassConnected: true } }

    // Students / Health
    if (path === '/api/students') return { status: 200, body: [] }
    if (path === '/api/health') return { status: 200, body: { status: 'ok' } }
  }

  // Write operations — generic success
  if (method === 'POST') return { status: 200, body: { success: true, message: 'Demo 操作成功（Demo 模式不儲存資料）' } }
  if (method === 'PUT' || method === 'PATCH') return { status: 200, body: { success: true } }
  if (method === 'DELETE') return { status: 200, body: { success: true } }

  return null
}

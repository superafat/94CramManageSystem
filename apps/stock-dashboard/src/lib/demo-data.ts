/**
 * Stock Dashboard Demo 假資料模組
 * 當 demo 用戶登入時，API proxy 會回傳這些資料而非呼叫真實 backend
 */

const DEMO_TENANT_1 = '11111111-1111-1111-1111-111111111111'
const DEMO_TENANT_2 = '22222222-2222-2222-2222-222222222222'

export const DEMO_TENANTS = [DEMO_TENANT_1, DEMO_TENANT_2]

// ===== Warehouses =====
const WAREHOUSES = [
  { id: 'wh1', name: '總部教材倉', address: '台北市中正區重慶南路一段100號', is_default: true, tenant_id: DEMO_TENANT_1 },
  { id: 'wh2', name: '中壢分校倉', address: '桃園市中壢區中正路200號', is_default: false, tenant_id: DEMO_TENANT_1 },
]

// ===== Categories =====
const CATEGORIES = [
  { id: 'cat1', name: '講義', color: '#8FA895', item_count: 5 },
  { id: 'cat2', name: '教材', color: '#9DAEBB', item_count: 3 },
  { id: 'cat3', name: '耗材', color: '#C4A4A0', item_count: 4 },
]

// ===== Items =====
const ITEMS = [
  { id: 'item1', name: '國中數學 A 班講義 Vol.1', sku: 'MTH-A-V1', category_id: 'cat1', category_name: '講義', unit: '本', safety_stock: 20, active: true },
  { id: 'item2', name: '國中數學 A 班講義 Vol.2', sku: 'MTH-A-V2', category_id: 'cat1', category_name: '講義', unit: '本', safety_stock: 20, active: true },
  { id: 'item3', name: '國中英文菁英班講義', sku: 'ENG-E-V1', category_id: 'cat1', category_name: '講義', unit: '本', safety_stock: 15, active: true },
  { id: 'item4', name: '國小先修班數學講義', sku: 'MTH-P-V1', category_id: 'cat1', category_name: '講義', unit: '本', safety_stock: 12, active: true },
  { id: 'item5', name: '英文文法練習冊', sku: 'ENG-WB-1', category_id: 'cat1', category_name: '講義', unit: '本', safety_stock: 15, active: true },
  { id: 'item6', name: '白板筆（黑色）', sku: 'SUP-PEN-B', category_id: 'cat3', category_name: '耗材', unit: '支', safety_stock: 30, active: true },
  { id: 'item7', name: '白板筆（紅色）', sku: 'SUP-PEN-R', category_id: 'cat3', category_name: '耗材', unit: '支', safety_stock: 20, active: true },
  { id: 'item8', name: 'A4 影印紙', sku: 'SUP-A4', category_id: 'cat3', category_name: '耗材', unit: '包', safety_stock: 10, active: true },
  { id: 'item9', name: '計算機', sku: 'EQP-CALC', category_id: 'cat2', category_name: '教材', unit: '台', safety_stock: 5, active: true },
  { id: 'item10', name: '英文字典', sku: 'EQP-DICT', category_id: 'cat2', category_name: '教材', unit: '本', safety_stock: 5, active: true },
  { id: 'item11', name: '三角板組', sku: 'EQP-TRI', category_id: 'cat2', category_name: '教材', unit: '組', safety_stock: 8, active: true },
  { id: 'item12', name: '板擦', sku: 'SUP-ERASER', category_id: 'cat3', category_name: '耗材', unit: '個', safety_stock: 10, active: true },
]

// ===== Inventory =====
const INVENTORY = [
  { id: 'inv1', item_id: 'item1', warehouse_id: 'wh1', quantity: 45, item_name: '國中數學 A 班講義 Vol.1', warehouse_name: '總部教材倉', sku: 'MTH-A-V1', unit: '本', safety_stock: 20 },
  { id: 'inv2', item_id: 'item2', warehouse_id: 'wh1', quantity: 38, item_name: '國中數學 A 班講義 Vol.2', warehouse_name: '總部教材倉', sku: 'MTH-A-V2', unit: '本', safety_stock: 20 },
  { id: 'inv3', item_id: 'item3', warehouse_id: 'wh1', quantity: 22, item_name: '國中英文菁英班講義', warehouse_name: '總部教材倉', sku: 'ENG-E-V1', unit: '本', safety_stock: 15 },
  { id: 'inv4', item_id: 'item4', warehouse_id: 'wh1', quantity: 8, item_name: '國小先修班數學講義', warehouse_name: '總部教材倉', sku: 'MTH-P-V1', unit: '本', safety_stock: 12 },
  { id: 'inv5', item_id: 'item5', warehouse_id: 'wh1', quantity: 30, item_name: '英文文法練習冊', warehouse_name: '總部教材倉', sku: 'ENG-WB-1', unit: '本', safety_stock: 15 },
  { id: 'inv6', item_id: 'item6', warehouse_id: 'wh1', quantity: 50, item_name: '白板筆（黑色）', warehouse_name: '總部教材倉', sku: 'SUP-PEN-B', unit: '支', safety_stock: 30 },
  { id: 'inv7', item_id: 'item7', warehouse_id: 'wh1', quantity: 5, item_name: '白板筆（紅色）', warehouse_name: '總部教材倉', sku: 'SUP-PEN-R', unit: '支', safety_stock: 20 },
  { id: 'inv8', item_id: 'item8', warehouse_id: 'wh1', quantity: 3, item_name: 'A4 影印紙', warehouse_name: '總部教材倉', sku: 'SUP-A4', unit: '包', safety_stock: 10 },
  { id: 'inv9', item_id: 'item9', warehouse_id: 'wh1', quantity: 8, item_name: '計算機', warehouse_name: '總部教材倉', sku: 'EQP-CALC', unit: '台', safety_stock: 5 },
  { id: 'inv10', item_id: 'item10', warehouse_id: 'wh1', quantity: 12, item_name: '英文字典', warehouse_name: '總部教材倉', sku: 'EQP-DICT', unit: '本', safety_stock: 5 },
  { id: 'inv11', item_id: 'item11', warehouse_id: 'wh1', quantity: 6, item_name: '三角板組', warehouse_name: '總部教材倉', sku: 'EQP-TRI', unit: '組', safety_stock: 8 },
  { id: 'inv12', item_id: 'item12', warehouse_id: 'wh1', quantity: 15, item_name: '板擦', warehouse_name: '總部教材倉', sku: 'SUP-ERASER', unit: '個', safety_stock: 10 },
  // 中壢分校倉
  { id: 'inv13', item_id: 'item1', warehouse_id: 'wh2', quantity: 18, item_name: '國中數學 A 班講義 Vol.1', warehouse_name: '中壢分校倉', sku: 'MTH-A-V1', unit: '本', safety_stock: 20 },
  { id: 'inv14', item_id: 'item3', warehouse_id: 'wh2', quantity: 10, item_name: '國中英文菁英班講義', warehouse_name: '中壢分校倉', sku: 'ENG-E-V1', unit: '本', safety_stock: 15 },
  { id: 'inv15', item_id: 'item6', warehouse_id: 'wh2', quantity: 25, item_name: '白板筆（黑色）', warehouse_name: '中壢分校倉', sku: 'SUP-PEN-B', unit: '支', safety_stock: 30 },
]

// ===== Stock Transactions =====
const TRANSACTIONS = [
  { id: 'tx1', type: 'stock_in', item_id: 'item1', item_name: '國中數學 A 班講義 Vol.1', warehouse_id: 'wh1', warehouse_name: '總部教材倉', quantity: 50, note: '新學期採購', created_by: 'Demo 館長', created_at: '2026-02-15T10:00:00Z' },
  { id: 'tx2', type: 'stock_out', item_id: 'item1', item_name: '國中數學 A 班講義 Vol.1', warehouse_id: 'wh1', warehouse_name: '總部教材倉', quantity: -5, note: '國中數學 A 班發放', created_by: 'Demo 行政', created_at: '2026-02-20T14:30:00Z' },
  { id: 'tx3', type: 'stock_in', item_id: 'item6', item_name: '白板筆（黑色）', warehouse_id: 'wh1', warehouse_name: '總部教材倉', quantity: 60, note: '文具批發進貨', created_by: 'Demo 館長', created_at: '2026-02-18T09:00:00Z' },
  { id: 'tx4', type: 'stock_out', item_id: 'item6', item_name: '白板筆（黑色）', warehouse_id: 'wh1', warehouse_name: '總部教材倉', quantity: -10, note: '各教室補充', created_by: 'Demo 行政', created_at: '2026-02-25T16:00:00Z' },
  { id: 'tx5', type: 'transfer', item_id: 'item1', item_name: '國中數學 A 班講義 Vol.1', warehouse_id: 'wh1', warehouse_name: '總部 → 中壢分校', quantity: -20, note: '分校補貨', created_by: 'Demo 倉管', created_at: '2026-02-22T11:00:00Z' },
  { id: 'tx6', type: 'stock_in', item_id: 'item3', item_name: '國中英文菁英班講義', warehouse_id: 'wh1', warehouse_name: '總部教材倉', quantity: 30, note: '印刷廠到貨', created_by: 'Demo 館長', created_at: '2026-02-28T10:30:00Z' },
  { id: 'tx7', type: 'stock_out', item_id: 'item8', item_name: 'A4 影印紙', warehouse_id: 'wh1', warehouse_name: '總部教材倉', quantity: -7, note: '考卷印製', created_by: 'Demo 行政', created_at: '2026-03-01T08:00:00Z' },
]

// ===== Suppliers =====
const SUPPLIERS = [
  { id: 'sup1', name: '大華印刷', contact_name: '陳經理', phone: '02-2381-1234', email: 'print@dahua.com', address: '台北市中正區忠孝東路', notes: '講義印製、裝訂' },
  { id: 'sup2', name: '台灣文具批發', contact_name: '林小姐', phone: '02-2771-5678', email: 'order@twstationery.com', address: '台北市大安區信義路', notes: '白板筆、影印紙等耗材' },
  { id: 'sup3', name: '教育圖書社', contact_name: '張老闆', phone: '03-422-9999', email: 'book@edutw.com', address: '桃園市中壢區中央西路', notes: '教材、字典、參考書' },
]

// ===== Purchase Orders =====
const PURCHASE_ORDERS = [
  { id: 'po1', supplier_id: 'sup1', supplier_name: '大華印刷', warehouse_id: 'wh1', warehouse_name: '總部教材倉', status: 'received', total_amount: 15000, items: [{ item_id: 'item1', item_name: '國中數學 A 班講義 Vol.1', quantity: 50, unit_price: 200, subtotal: 10000 }, { item_id: 'item4', item_name: '國小先修班數學講義', quantity: 25, unit_price: 200, subtotal: 5000 }], created_at: '2026-02-10T09:00:00Z', approved_at: '2026-02-11T10:00:00Z', received_at: '2026-02-15T10:00:00Z' },
  { id: 'po2', supplier_id: 'sup2', supplier_name: '台灣文具批發', warehouse_id: 'wh1', warehouse_name: '總部教材倉', status: 'approved', total_amount: 4500, items: [{ item_id: 'item6', item_name: '白板筆（黑色）', quantity: 60, unit_price: 25, subtotal: 1500 }, { item_id: 'item7', item_name: '白板筆（紅色）', quantity: 40, unit_price: 25, subtotal: 1000 }, { item_id: 'item8', item_name: 'A4 影印紙', quantity: 20, unit_price: 100, subtotal: 2000 }], created_at: '2026-02-28T14:00:00Z', approved_at: '2026-03-01T09:00:00Z', received_at: null },
  { id: 'po3', supplier_id: 'sup3', supplier_name: '教育圖書社', warehouse_id: 'wh1', warehouse_name: '總部教材倉', status: 'pending', total_amount: 8000, items: [{ item_id: 'item10', item_name: '英文字典', quantity: 10, unit_price: 500, subtotal: 5000 }, { item_id: 'item11', item_name: '三角板組', quantity: 20, unit_price: 150, subtotal: 3000 }], created_at: '2026-03-01T11:00:00Z', approved_at: null, received_at: null },
]

// ===== Low Stock Alerts =====
const LOW_STOCK_ALERTS = [
  { id: 'alert1', item_id: 'item4', item_name: '國小先修班數學講義', warehouse_name: '總部教材倉', current_qty: 8, safety_stock: 12, level: 'warning', created_at: '2026-03-01T06:00:00Z' },
  { id: 'alert2', item_id: 'item7', item_name: '白板筆（紅色）', warehouse_name: '總部教材倉', current_qty: 5, safety_stock: 20, level: 'critical', created_at: '2026-03-01T06:00:00Z' },
  { id: 'alert3', item_id: 'item8', item_name: 'A4 影印紙', warehouse_name: '總部教材倉', current_qty: 3, safety_stock: 10, level: 'critical', created_at: '2026-03-01T06:00:00Z' },
]

// ===== Dashboard Stats =====
const DASHBOARD_STATS = {
  total_items: 12,
  total_warehouses: 2,
  low_stock_count: 3,
  pending_orders: 1,
  total_inventory_value: 52800,
  recent_transactions: TRANSACTIONS.slice(0, 5),
  low_stock_alerts: LOW_STOCK_ALERTS,
}

// ===== Barcodes =====
const BARCODES = ITEMS.map(item => ({
  id: `bc-${item.id}`,
  item_id: item.id,
  item_name: item.name,
  barcode: `8899${item.sku.replace(/[^A-Z0-9]/g, '')}`,
  type: 'CODE128',
  is_primary: true,
}))

// ===== Inventory Counts =====
const INVENTORY_COUNTS = [
  { id: 'ic1', warehouse_id: 'wh1', warehouse_name: '總部教材倉', status: 'completed', created_by: 'Demo 倉管', created_at: '2026-02-25T09:00:00Z', completed_at: '2026-02-25T12:00:00Z', total_items: 12, discrepancy_count: 2, items: [{ item_name: '白板筆（黑色）', system_qty: 55, actual_qty: 50, diff: -5 }, { item_name: 'A4 影印紙', system_qty: 12, actual_qty: 10, diff: -2 }] },
  { id: 'ic2', warehouse_id: 'wh2', warehouse_name: '中壢分校倉', status: 'in_progress', created_by: 'Demo 行政', created_at: '2026-03-01T09:00:00Z', completed_at: null, total_items: 3, discrepancy_count: 0, items: [] },
]

// ===== Route handler =====
export function getDemoResponse(method: string, path: string, _searchParams: URLSearchParams): { status: number; body: unknown } | null {
  if (method === 'GET') {
    // Dashboard
    if (path === '/api/dashboard' || path === '/api/dashboard/stats') {
      return { status: 200, body: { data: DASHBOARD_STATS } }
    }

    // Warehouses
    if (path === '/api/warehouses') return { status: 200, body: { data: WAREHOUSES } }

    // Categories
    if (path === '/api/categories') return { status: 200, body: { data: CATEGORIES } }

    // Items
    if (path === '/api/items') return { status: 200, body: { data: ITEMS } }
    const itemMatch = path.match(/^\/api\/items\/([\w-]+)$/)
    if (itemMatch) {
      const item = ITEMS.find(i => i.id === itemMatch[1])
      return item ? { status: 200, body: { data: item } } : { status: 404, body: { error: 'Not found' } }
    }

    // Inventory
    if (path === '/api/inventory') return { status: 200, body: { data: INVENTORY } }

    // Transactions
    if (path === '/api/transactions' || path === '/api/stock-in' || path === '/api/stock-out') {
      return { status: 200, body: { data: TRANSACTIONS } }
    }

    // Suppliers
    if (path === '/api/suppliers') return { status: 200, body: { data: SUPPLIERS } }

    // Purchase Orders
    if (path === '/api/purchase-orders') return { status: 200, body: { data: PURCHASE_ORDERS } }
    const poMatch = path.match(/^\/api\/purchase-orders\/([\w-]+)$/)
    if (poMatch) {
      const po = PURCHASE_ORDERS.find(p => p.id === poMatch[1])
      return po ? { status: 200, body: { data: po } } : { status: 404, body: { error: 'Not found' } }
    }

    // Barcodes
    if (path === '/api/barcodes') return { status: 200, body: { data: BARCODES } }

    // Inventory Counts
    if (path === '/api/inventory-counts') return { status: 200, body: { data: INVENTORY_COUNTS } }
    const icMatch = path.match(/^\/api\/inventory-counts\/([\w-]+)$/)
    if (icMatch) {
      const ic = INVENTORY_COUNTS.find(c => c.id === icMatch[1])
      return ic ? { status: 200, body: { data: ic } } : { status: 404, body: { error: 'Not found' } }
    }

    // Low stock alerts
    if (path === '/api/alerts' || path === '/api/notifications') {
      return { status: 200, body: { data: LOW_STOCK_ALERTS } }
    }

    // Transfers
    if (path === '/api/transfers') {
      return { status: 200, body: { data: TRANSACTIONS.filter(t => t.type === 'transfer') } }
    }

    // Reports
    if (path.startsWith('/api/reports')) {
      return { status: 200, body: { data: { inventory_value: 52800, total_items: 12, low_stock: 3, turnover_rate: 2.3 } } }
    }

    // AI Prediction
    if (path.startsWith('/api/ai')) {
      return { status: 200, body: { data: {
        predictions: [
          { item_name: '國中數學 A 班講義 Vol.1', current_stock: 63, predicted_need: 45, suggestion: '庫存充足，無需補貨' },
          { item_name: '國小先修班數學講義', current_stock: 8, predicted_need: 25, suggestion: '建議補貨 17 本' },
          { item_name: '白板筆（紅色）', current_stock: 5, predicted_need: 30, suggestion: '緊急補貨 25 支' },
          { item_name: 'A4 影印紙', current_stock: 3, predicted_need: 15, suggestion: '緊急補貨 12 包' },
        ],
        generated_at: new Date().toISOString(),
      } } }
    }

    // Students / Classes
    if (path === '/api/students') return { status: 200, body: { data: [] } }
    if (path === '/api/classes') return { status: 200, body: { data: [] } }

    // Integrations
    if (path === '/api/integrations') return { status: 200, body: { data: { manage_connected: true, inclass_connected: true } } }

    // Health
    if (path === '/api/health') return { status: 200, body: { status: 'ok' } }
  }

  // Write operations
  if (method === 'POST') {
    return { status: 200, body: { success: true, message: 'Demo 操作成功' } }
  }
  if (method === 'PUT' || method === 'PATCH') {
    return { status: 200, body: { success: true } }
  }
  if (method === 'DELETE') {
    return { status: 200, body: { success: true } }
  }

  return null
}

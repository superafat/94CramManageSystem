import type { TenantCache } from '../firestore/cache.js';
import type { ParentContext } from '../modules/ai-engine.js';

export const DEMO_TENANT_ID = 'demo-tenant-000';
export const DEMO_TENANT_NAME = '蜂神榜示範教室';

export const DEMO_CACHE: TenantCache = {
  students: [
    { id: 'stu-001', name: '陳小利', class_name: '高二A班' },
    { id: 'stu-002', name: '王大明', class_name: '高一B班' },
    { id: 'stu-003', name: '林美琪', class_name: '高二A班' },
    { id: 'stu-004', name: '張志豪', class_name: '高一B班' },
    { id: 'stu-005', name: '李宜庭', class_name: '國三C班' },
  ],
  classes: ['高二A班', '高一B班', '國三C班'],
  items: [
    { id: 'item-001', name: '紅色鐵盒', stock: 350 },
    { id: 'item-002', name: '科學筆記', stock: 120 },
    { id: 'item-003', name: '數學題本', stock: 85 },
    { id: 'item-004', name: '英文單字卡', stock: 200 },
  ],
  warehouses: [
    { id: 'wh-001', name: '文學館1店' },
    { id: 'wh-002', name: '總部倉庫' },
  ],
  tenantName: DEMO_TENANT_NAME,
  tenantAddress: '台北市中正區重慶南路一段100號',
  last_synced_at: new Date(),
};

export const DEMO_PARENT_CONTEXT: ParentContext = {
  parentName: '陳媽媽',
  children: [
    { name: '陳小利', id: 'stu-001', className: '高二A班' },
  ],
  tenantName: DEMO_TENANT_NAME,
  tenantPhone: '(02) 2381-0000',
  tenantAddress: '台北市中正區重慶南路一段100號',
  tenantHours: '週一至週六 14:00–22:00',
  knowledgeBase: `
## 課程資訊
- 高中部：國英數理化，每週三堂，每堂 90 分鐘
- 國中部：國英數，每週兩堂，每堂 90 分鐘

## 收費標準
- 高中部：每月 NT$4,500
- 國中部：每月 NT$3,500
- 繳費方式：LINE Pay、現金、轉帳均可

## 請假規定
- 請假需提前 24 小時告知
- 每學期可補課 3 次
- 請假超過 3 次需提供證明
`.trim(),
};

export const DEMO_AUTH = {
  tenantId: DEMO_TENANT_ID,
  tenantName: DEMO_TENANT_NAME,
  enabledModules: ['manage', 'inclass', 'stock'],
};

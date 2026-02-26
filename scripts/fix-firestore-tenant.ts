/**
 * 修正 Firestore 綁定的 tenant ID
 * 之前用了 38068f5a... 但實際 DB 裡的 tenant 是 00000000-...0001
 */
import { Firestore } from '@google-cloud/firestore';

const GCP_PROJECT_ID = 'cram94-manage-system';
const CORRECT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_NAME = '蜂神榜補習班';
const TELEGRAM_USER_ID = '7777774090';

const firestore = new Firestore({ projectId: GCP_PROJECT_ID });

async function main() {
  console.log('🔧 修正 Firestore tenant ID...\n');

  // 1. 千里眼綁定
  console.log('1️⃣ 更新千里眼綁定...');
  await firestore.collection('bot_user_bindings').doc(TELEGRAM_USER_ID).set({
    bindings: [{
      tenant_id: CORRECT_TENANT_ID,
      tenant_name: TENANT_NAME,
      role: 'admin',
      enabled_modules: ['manage', 'inclass', 'stock'],
    }],
    active_tenant_id: CORRECT_TENANT_ID,
    active_tenant_name: TENANT_NAME,
    created_at: new Date(),
    last_active_at: new Date(),
  });
  console.log('   ✅ 千里眼綁定已更新\n');

  // 2. 順風耳綁定
  console.log('2️⃣ 更新順風耳綁定...');
  await firestore.collection('bot_parent_bindings').doc(TELEGRAM_USER_ID).set({
    telegram_user_id: TELEGRAM_USER_ID,
    tenant_id: CORRECT_TENANT_ID,
    parent_name: 'Dali（管理員測試）',
    children: [{
      student_id: 'b0000000-0000-0000-0000-000000000001',
      student_name: '陳小明',
      relation: '管理員',
    }],
    created_at: new Date(),
    last_active_at: new Date(),
  });
  console.log('   ✅ 順風耳綁定已更新\n');

  // 3. Tenant Settings
  console.log('3️⃣ 更新 Tenant Settings...');
  await firestore.collection('bot_tenant_settings').doc(CORRECT_TENANT_ID).set({
    tenant_id: CORRECT_TENANT_ID,
    enabled_modules: ['manage', 'inclass', 'stock'],
    welcome_message: '歡迎使用 蜂神榜 AI 補習班助手系統！',
    plan: 'pro',
    max_bindings: 50,
    max_ai_calls: 2000,
    log_retention_days: 90,
    created_at: new Date(),
    updated_at: new Date(),
  });
  console.log('   ✅ Tenant settings 已更新\n');

  // 4. Subscription
  console.log('4️⃣ 更新 Subscription...');
  await firestore.collection('bot_subscriptions').doc(CORRECT_TENANT_ID).set({
    tenant_id: CORRECT_TENANT_ID,
    plan: 'pro',
    admin_bot_active: true,
    parent_bot_active: true,
    parent_limit: 200,
    ai_calls_limit: 2000,
    ai_calls_used: 0,
    created_at: new Date(),
    updated_at: new Date(),
  });
  console.log('   ✅ Subscription 已更新\n');

  console.log('🎉 全部修正完成！Tenant ID 已統一為:', CORRECT_TENANT_ID);
}

main().catch((err) => {
  console.error('❌ 失敗:', err);
  process.exit(1);
});

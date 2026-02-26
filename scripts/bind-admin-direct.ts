/**
 * 直接綁定 Telegram 帳號到千里眼+順風耳
 */
import { Firestore } from '@google-cloud/firestore';

const GCP_PROJECT_ID = 'cram94-manage-system';
const TENANT_ID = '38068f5a-6bad-4edc-b26b-66bc6ac90fb3';
const TENANT_NAME = '94補習班';
const TELEGRAM_USER_ID = '7777774090';

const firestore = new Firestore({ projectId: GCP_PROJECT_ID });

async function main() {
  console.log(`🔧 直接綁定 Telegram ID: ${TELEGRAM_USER_ID}\n`);

  // 1. 千里眼綁定（admin bot）
  console.log('1️⃣ 千里眼綁定...');
  await firestore.collection('bot_user_bindings').doc(TELEGRAM_USER_ID).set({
    bindings: [{
      tenant_id: TENANT_ID,
      tenant_name: TENANT_NAME,
      role: 'admin',
      enabled_modules: ['manage', 'inclass', 'stock'],
    }],
    active_tenant_id: TENANT_ID,
    active_tenant_name: TENANT_NAME,
    created_at: new Date(),
    last_active_at: new Date(),
  }, { merge: true });
  console.log('   ✅ 千里眼綁定完成（admin, 三模組全開）\n');

  // 2. 順風耳綁定（parent bot）
  console.log('2️⃣ 順風耳綁定...');
  await firestore.collection('bot_parent_bindings').doc(TELEGRAM_USER_ID).set({
    telegram_user_id: TELEGRAM_USER_ID,
    tenant_id: TENANT_ID,
    parent_name: 'superafat（管理員測試）',
    children: [{
      student_id: 'test-student-001',
      student_name: '測試學生',
      relation: '管理員',
    }],
    created_at: new Date(),
    last_active_at: new Date(),
  }, { merge: true });
  console.log('   ✅ 順風耳綁定完成\n');

  console.log('━'.repeat(50));
  console.log('🎉 綁定完成！');
  console.log('');
  console.log('現在可以直接在 Telegram 測試：');
  console.log('  千里眼 @cram94_bot：輸入「查詢今日出席」「庫存查詢」等');
  console.log('  順風耳 @Cram94_VIP_bot：輸入「查詢出缺席」「繳費狀態」等');
}

main().catch((err) => {
  console.error('❌ 綁定失敗:', err);
  process.exit(1);
});

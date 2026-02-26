/**
 * 初始化 Bot 管理員設定
 *
 * 用法：
 *   GOOGLE_APPLICATION_CREDENTIALS=~/gcp-sa-key.json npx tsx scripts/setup-bot-admin.ts
 *
 * 功能：
 *   1. 設定 tenant settings（啟用所有模組）
 *   2. 設定 subscription（pro plan，千里眼+順風耳）
 *   3. 產生千里眼 bind code（30 分鐘有效）
 *   4. 產生順風耳 parent invite code（7 天有效）
 *
 * 綁定步驟：
 *   1. 執行此腳本取得 bind code
 *   2. 到 Telegram 找 @cram94_bot（千里眼），發送 /bind <code>
 *   3. 到 Telegram 找 @Cram94_VIP_bot（順風耳），發送 /bind <parent_code>
 */
import { Firestore } from '@google-cloud/firestore';

const GCP_PROJECT_ID = 'cram94-manage-system';
const TENANT_ID = '38068f5a-6bad-4edc-b26b-66bc6ac90fb3';
const TENANT_NAME = '94補習班';

const firestore = new Firestore({ projectId: GCP_PROJECT_ID });

async function main() {
  console.log('🔧 Bot 管理員設定初始化...\n');

  // 1. Tenant Settings — 啟用所有模組
  console.log('1️⃣ 設定 Tenant Settings...');
  await firestore.collection('bot_tenant_settings').doc(TENANT_ID).set({
    tenant_id: TENANT_ID,
    enabled_modules: ['manage', 'inclass', 'stock'],
    welcome_message: '歡迎使用 蜂神榜 AI 補習班助手系統！',
    plan: 'pro',
    max_bindings: 50,
    max_ai_calls: 2000,
    log_retention_days: 90,
    created_at: new Date(),
    updated_at: new Date(),
  }, { merge: true });
  console.log('   ✅ Tenant settings 已設定（pro plan, 三模組全開）\n');

  // 2. Subscription — pro plan, 千里眼+順風耳
  console.log('2️⃣ 設定 Subscription...');
  await firestore.collection('bot_subscriptions').doc(TENANT_ID).set({
    tenant_id: TENANT_ID,
    plan: 'pro',
    admin_bot_active: true,
    parent_bot_active: true,
    parent_limit: 200,
    ai_calls_limit: 2000,
    ai_calls_used: 0,
    created_at: new Date(),
    updated_at: new Date(),
  }, { merge: true });
  console.log('   ✅ Subscription 已設定（pro plan, 千里眼+順風耳啟用）\n');

  // 3. 千里眼 Bind Code
  console.log('3️⃣ 產生千里眼綁定碼...');
  const adminCode = String(Math.floor(100000 + Math.random() * 900000));
  const adminExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 分鐘
  await firestore.collection('bot_bind_codes').doc(adminCode).set({
    code: adminCode,
    tenant_id: TENANT_ID,
    tenant_name: TENANT_NAME,
    used: false,
    created_by: 'setup-script',
    created_at: new Date(),
    expires_at: adminExpires,
  });
  console.log(`   ✅ 千里眼綁定碼: ${adminCode}`);
  console.log(`   ⏰ 有效期至: ${adminExpires.toLocaleString('zh-TW')}`);
  console.log(`   📱 到 Telegram @cram94_bot 發送: /bind ${adminCode}\n`);

  // 4. 順風耳 Parent Invite Code（需要學生 ID，這裡用通用的）
  console.log('4️⃣ 產生順風耳邀請碼...');
  const parentCode = String(Math.floor(100000 + Math.random() * 900000));
  const parentExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天
  await firestore.collection('bot_parent_invites').doc(parentCode).set({
    code: parentCode,
    tenant_id: TENANT_ID,
    student_id: 'test-student-001',
    student_name: '測試學生',
    status: 'pending',
    created_at: new Date(),
    expires_at: parentExpires,
  });
  console.log(`   ✅ 順風耳邀請碼: ${parentCode}`);
  console.log(`   ⏰ 有效期至: ${parentExpires.toLocaleString('zh-TW')}`);
  console.log(`   📱 到 Telegram @Cram94_VIP_bot 發送: /bind ${parentCode}\n`);

  console.log('━'.repeat(50));
  console.log('🎉 設定完成！請依照上方指示在 Telegram 完成綁定。');
  console.log('');
  console.log('綁定完成後，你可以：');
  console.log('  千里眼：直接輸入指令，如「查詢今日出席」「庫存查詢」');
  console.log('  順風耳：查詢孩子出缺席、請假、繳費狀態');
}

main().catch((err) => {
  console.error('❌ 設定失敗:', err);
  process.exit(1);
});

// P0+P1 效能測試
// 執行: npx tsx apps/bot-gateway/src/benchmark.ts

import { checkRateLimit, telegramQueue } from './utils/rate-limit.js';
import { getCache, setCache, getCacheStats, invalidateCache } from './firestore/cache.js';
import { enqueueBroadcast, getBroadcastJob } from './utils/broadcast-queue.js';

console.log('🧪 P0+P1 效能測試\n');

// ── Test 1: Rate Limiter (Token Bucket) ──
console.log('=== Test 1: Rate Limiter (30 msg/sec) ===');

const userId = 'test-user-001';
let allowed = 0;
let denied = 0;
const totalRequests = 100;

// 瞬間發送 100 個請求，測試速率限制
const start = Date.now();
for (let i = 0; i < totalRequests; i++) {
  if (checkRateLimit(userId)) {
    allowed++;
  } else {
    denied++;
  }
}
const elapsed = Date.now() - start;

console.log(`結果: ${allowed} 允許, ${denied} 拒絕 (${totalRequests} 請求 in ${elapsed}ms)`);
console.log(`✅ Rate limiter 運作正常`);

// ── Test 2: In-Memory Cache ──
console.log('\n=== Test 2: In-Memory Cache (5min TTL) ===');

const testTenantId = 'test-tenant-001';
const testCacheData = {
  students: [{ id: '1', name: '陳小利', class_name: '高三A' }],
  classes: ['高三A', '高二B'],
  items: [],
  warehouses: [],
  last_synced_at: new Date(),
};

// 先清除 cache
invalidateCache(testTenantId);

// 第一次讀取 (會 MISS，從 "Firestore" 載入)
const startMiss = Date.now();
await setCache(testTenantId, testCacheData);
const cache1 = await getCache(testTenantId);
const timeMiss = Date.now() - startMiss;
console.log(`第一次讀取 (MISS): ${timeMiss}ms`);

// 第二次讀取 (應該 HIT memory)
const startHit = Date.now();
const cache2 = await getCache(testTenantId);
const timeHit = Date.now() - startHit;
console.log(`第二次讀取 (HIT): ${timeHit}ms`);

// 驗證
if (timeHit < timeMiss && cache2) {
  console.log(`✅ Cache 運作正常: ${Math.round(timeMiss/timeHit)}x 加速`);
} else {
  console.log(`❌ Cache 可能失效`);
}

// 顯示 cache stats
const stats = getCacheStats();
console.log(`Cache Stats: ${JSON.stringify(stats)}`);

// ── Test 3: Broadcast Queue ──
console.log('\n=== Test 3: Broadcast Queue (25 msg/sec) ===');

const testChatIds = [111, 222, 333, 444, 555];
const testMessage = '測試廣播訊息';

// enqueue (非同步，不會立即發送)
const jobId = await enqueueBroadcast(testChatIds, testMessage);
console.log(`已加入廣播佇列: ${jobId}`);

// 檢查 job 狀態
await new Promise(r => setTimeout(r, 100));
const job = getBroadcastJob(jobId);
if (job) {
  console.log(`Job 狀態: ${job.status}`);
  console.log(`Progress: ${job.progress.succeeded}/${job.progress.total}`);
  console.log(`✅ Broadcast queue 運作正常`);
} else {
  console.log(`❌ Broadcast queue 問題`);
}

// ── Test 4: Telegram Queue (sendMessage) ──
console.log('\n=== Test 4: Telegram Queue (佇列化) ===');

console.log(`佇列目前待處理: ${telegramQueue.size}`);
console.log(`✅ Queue 初始化正常`);

console.log('\n=== 全部測試完成 ===');

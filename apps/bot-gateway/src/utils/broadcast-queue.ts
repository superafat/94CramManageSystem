import PQueue from 'p-queue';
import { logger } from './logger';
import { getRedis } from '@94cram/shared/redis';
import { checkTelegramGlobalRate } from './rate-limit';

// ── P1: Broadcast Queue System ──
// Ready for Pub/Sub upgrade (currently local queue)

export interface BroadcastJob {
  id: string;
  chatIds: number[];
  message: string;
  options?: {
    reply_markup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    succeeded: number;
    failed: number;
  };
  createdAt: number;
}

// In-memory broadcast queue (placeholder for Pub/Sub)
const broadcastQueue = new PQueue({ concurrency: 1 });
const broadcastJobs = new Map<string, BroadcastJob>();

// Rate limit: 25 msg/sec (Telegram limit is ~30, use safety margin)
const BROADCAST_RATE = 25;
const broadcastRateQueue = new PQueue({ concurrency: 1, interval: 1000 / BROADCAST_RATE, intervalCap: 1 });

export async function enqueueBroadcast(
  chatIds: number[],
  message: string,
  options?: BroadcastJob['options']
): Promise<string> {
  const jobId = `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const job: BroadcastJob = {
    id: jobId,
    chatIds,
    message,
    options,
    status: 'pending',
    progress: { total: chatIds.length, succeeded: 0, failed: 0 },
    createdAt: Date.now(),
  };

  broadcastJobs.set(jobId, job);

  // Persist job to Redis (fire-and-forget, 24h TTL)
  const redis = getRedis();
  if (redis) {
    redis.set(`broadcast:job:${jobId}`, JSON.stringify(job), { ex: 86400 }).catch(() => {});
  }

  // Add to queue
  broadcastQueue.add(async () => {
    job.status = 'processing';
    logger.info({ jobId, total: chatIds.length }, '[Broadcast] Starting job');

    let messagesSinceLastUpdate = 0;

    for (const chatId of chatIds) {
      await broadcastRateQueue.add(async () => {
        // Global rate guard across all instances
        while (!(await checkTelegramGlobalRate())) {
          await new Promise(r => setTimeout(r, 100));
        }

        try {
          // Dynamic import to avoid circular deps
          const { sendMessage } = await import('../utils/telegram.js');
          await sendMessage(chatId, message, options);
          job.progress.succeeded++;
        } catch (err) {
          job.progress.failed++;
          logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, `[Broadcast] Failed to send to ${chatId}`)
        }

        // Update Redis progress every 10 messages (fire-and-forget)
        messagesSinceLastUpdate++;
        if (messagesSinceLastUpdate >= 10) {
          messagesSinceLastUpdate = 0;
          const r = getRedis();
          if (r) {
            r.set(`broadcast:job:${jobId}`, JSON.stringify(job), { ex: 86400 }).catch(() => {});
          }
        }
      });
    }

    job.status = job.progress.failed === job.progress.total ? 'failed' : 'completed';
    logger.info({ jobId, succeeded: job.progress.succeeded, total: job.progress.total }, '[Broadcast] Job completed');

    // Final Redis update
    const r = getRedis();
    if (r) {
      r.set(`broadcast:job:${jobId}`, JSON.stringify(job), { ex: 86400 }).catch(() => {});
    }
  });

  return jobId;
}

export async function getBroadcastJob(jobId: string): Promise<BroadcastJob | undefined> {
  // Fast path: local map
  const local = broadcastJobs.get(jobId);
  if (local) return local;

  // Fallback: Redis (cross-instance lookup)
  const redis = getRedis();
  if (!redis) return undefined;
  try {
    return await redis.get<BroadcastJob>(`broadcast:job:${jobId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function listBroadcastJobs(): BroadcastJob[] {
  return Array.from(broadcastJobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// TODO: Implement Pub/Sub version when Cloud Pub/Sub is configured
// export async function enqueueBroadcastPubSub(chatIds: number[], message: string, options?: ...): Promise<string>

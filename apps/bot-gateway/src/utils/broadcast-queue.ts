import PQueue from 'p-queue';

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

  // Add to queue
  broadcastQueue.add(async () => {
    job.status = 'processing';
    console.log(`[Broadcast] Starting job ${jobId} to ${chatIds.length} users`);

    for (const chatId of chatIds) {
      await broadcastRateQueue.add(async () => {
        try {
          // Dynamic import to avoid circular deps
          const { sendMessage } = await import('../utils/telegram.js');
          await sendMessage(chatId, message, options);
          job.progress.succeeded++;
        } catch (err) {
          job.progress.failed++;
          console.error(`[Broadcast] Failed to send to ${chatId}:`, err);
        }
      });
    }

    job.status = job.progress.failed === job.progress.total ? 'failed' : 'completed';
    console.log(`[Broadcast] Job ${jobId} completed: ${job.progress.succeeded}/${job.progress.total} succeeded`);
  });

  return jobId;
}

export function getBroadcastJob(jobId: string): BroadcastJob | undefined {
  return broadcastJobs.get(jobId);
}

export function listBroadcastJobs(): BroadcastJob[] {
  return Array.from(broadcastJobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// TODO: Implement Pub/Sub version when Cloud Pub/Sub is configured
// export async function enqueueBroadcastPubSub(chatIds: number[], message: string, options?: ...): Promise<string>

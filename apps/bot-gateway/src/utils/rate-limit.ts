const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxPerMinute = 30): boolean {
  const now = Date.now();
  const entry = store.get(userId);
  if (entry && now < entry.resetAt) {
    entry.count++;
    return entry.count <= maxPerMinute;
  }
  store.set(userId, { count: 1, resetAt: now + 60000 });
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 300000);

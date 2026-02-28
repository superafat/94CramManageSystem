export interface DemoSession {
  userId: string;
  chatId: string;
  botType: 'admin' | 'parent';
  startedAt: number;
  expiresAt: number;
  messageCount: number;
}

const DEMO_TTL_MS = 5 * 60 * 1000; // 5 minutes

const sessions = new Map<string, DemoSession>();

function sessionKey(botType: 'admin' | 'parent', userId: string): string {
  return `demo:${botType}:${userId}`;
}

export function startDemoSession(
  userId: string,
  chatId: string,
  botType: 'admin' | 'parent'
): DemoSession {
  const now = Date.now();
  const session: DemoSession = {
    userId,
    chatId,
    botType,
    startedAt: now,
    expiresAt: now + DEMO_TTL_MS,
    messageCount: 0,
  };
  sessions.set(sessionKey(botType, userId), session);
  return session;
}

export function getDemoSession(
  botType: 'admin' | 'parent',
  userId: string
): DemoSession | null {
  const key = sessionKey(botType, userId);
  const session = sessions.get(key);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(key);
    return null;
  }
  return session;
}

export function endDemoSession(
  botType: 'admin' | 'parent',
  userId: string
): boolean {
  return sessions.delete(sessionKey(botType, userId));
}

export function incrementDemoMessageCount(
  botType: 'admin' | 'parent',
  userId: string
): void {
  const key = sessionKey(botType, userId);
  const session = sessions.get(key);
  if (session) {
    session.messageCount += 1;
  }
}

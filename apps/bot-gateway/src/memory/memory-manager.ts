import { logger } from '../utils/logger.js';
import { getGlobalMemory } from './global-memory.js';
import { getTenantMemory, upsertTenantFact } from './tenant-memory.js';
import { getUserMemory, appendMessage, compactMessages, addUserFact } from './user-memory.js';
import { compactConversation, extractTenantFact } from './memory-extractor.js';
import type { BotType, MemoryContext } from './types.js';

const MAX_MEMORY_SECTION_CHARS = 500;
const CONVERSATION_HISTORY_LIMIT = 6; // last N messages for AI context
const SUMMARY_HISTORY_LIMIT = 3; // last N summaries shown in prompt
const TENANT_FACT_EXTRACTION_INTERVAL = 50; // extract tenant fact every N messages

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
}

export async function getMemoryContext(
  botType: BotType,
  telegramUserId: string,
  tenantId: string
): Promise<MemoryContext> {
  // Parallel fetch all 3 layers
  const [globalEntries, tenantDoc, userDoc] = await Promise.all([
    getGlobalMemory().catch((err: unknown) => {
      logger.warn({ err }, '[MemoryManager] getGlobalMemory failed');
      return [];
    }),
    getTenantMemory(tenantId).catch((err: unknown) => {
      logger.warn({ err, tenantId }, '[MemoryManager] getTenantMemory failed');
      return null;
    }),
    getUserMemory(botType, telegramUserId).catch((err: unknown) => {
      logger.warn({ err, botType, telegramUserId }, '[MemoryManager] getUserMemory failed');
      return null;
    }),
  ]);

  // Build conversation history: last 6 messages in Gemini format
  const recentMessages = userDoc ? userDoc.messages.slice(-CONVERSATION_HISTORY_LIMIT) : [];
  const conversationHistory = recentMessages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  // Build memoryPromptSection
  let memoryPromptSection = '';

  // Global memory section
  if (globalEntries.length > 0) {
    const globalText = globalEntries
      .map((e) => `- [${e.category}] ${e.title}: ${e.content}`)
      .join('\n');
    memoryPromptSection += `## 你學到的經驗\n\n${truncate(globalText, MAX_MEMORY_SECTION_CHARS)}\n\n`;
  }

  // Tenant facts section
  if (tenantDoc && tenantDoc.facts.length > 0) {
    const tenantText = tenantDoc.facts.map((f) => `- [${f.category}] ${f.content}`).join('\n');
    memoryPromptSection += `## 這間補習班的習慣\n\n${truncate(tenantText, MAX_MEMORY_SECTION_CHARS)}\n\n`;
  }

  // Conversation summaries section
  if (userDoc && userDoc.summaries.length > 0) {
    const recentSummaries = userDoc.summaries.slice(-SUMMARY_HISTORY_LIMIT);
    const summaryText = recentSummaries
      .map((s) => `- ${s.summary}${s.key_facts.length > 0 ? `（${s.key_facts.join('；')}）` : ''}`)
      .join('\n');
    memoryPromptSection += `## 之前的對話摘要\n\n${summaryText}\n\n`;
  }

  // User facts section
  if (userDoc && userDoc.user_facts.length > 0) {
    const factsText = userDoc.user_facts.map((f) => `- [${f.category}] ${f.fact}`).join('\n');
    memoryPromptSection += `## 你對這個人的認識\n\n${factsText}\n\n`;
  }

  return {
    global: globalEntries,
    tenant: tenantDoc,
    user: userDoc,
    conversationHistory,
    memoryPromptSection: memoryPromptSection.trim(),
  };
}

export function recordTurn(
  botType: BotType,
  telegramUserId: string,
  tenantId: string,
  userMessage: string,
  botResponse: string,
  intent?: string
): void {
  // Fire-and-forget — do not await
  void (async () => {
    try {
      // 1. Append user message
      const { needsCompaction } = await appendMessage(botType, telegramUserId, tenantId, {
        role: 'user',
        content: userMessage,
        intent,
      });

      // 2. Append bot response
      await appendMessage(botType, telegramUserId, tenantId, {
        role: 'model',
        content: botResponse,
      });

      // 3. Compaction if needed
      if (needsCompaction) {
        const userDoc = await getUserMemory(botType, telegramUserId);
        if (userDoc && userDoc.messages.length >= 10) {
          const oldestMessages = userDoc.messages.slice(0, 10);
          const summary = await compactConversation(oldestMessages);
          await compactMessages(botType, telegramUserId, summary);
          logger.info({ botType, telegramUserId }, '[MemoryManager] Compaction complete');
        }
      }

      // 4. Tenant fact extraction every TENANT_FACT_EXTRACTION_INTERVAL messages
      try {
        const userDoc = await getUserMemory(botType, telegramUserId);
        const totalMessages =
          (userDoc?.messages.length ?? 0) + (userDoc?.summaries.reduce((a, s) => a + s.message_count, 0) ?? 0);

        if (totalMessages % TENANT_FACT_EXTRACTION_INTERVAL === 0) {
          const fact = await extractTenantFact(userMessage, botResponse);
          if (fact) {
            await upsertTenantFact(tenantId, {
              key: fact.key,
              category: fact.category,
              content: fact.content,
              confidence: fact.confidence,
              source: fact.source,
            });
            logger.info({ tenantId, factKey: fact.key }, '[MemoryManager] Tenant fact extracted and saved');
          }
        }
      } catch (extractErr) {
        logger.warn({ extractErr }, '[MemoryManager] Tenant fact extraction failed (non-fatal)');
      }
    } catch (err) {
      logger.warn({ err, botType, telegramUserId }, '[MemoryManager] recordTurn failed (non-fatal)');
    }
  })();
}

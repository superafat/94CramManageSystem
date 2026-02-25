/**
 * Knowledge Base — Firestore `bot_knowledge_base` collection
 * Stores FAQ, policies, course info, announcements per tenant
 */
import { firestore } from './client';

export type KnowledgeCategory = 'general' | 'course' | 'policy' | 'faq' | 'announcement';

export interface KnowledgeEntry {
  tenant_id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const col = firestore.collection('bot_knowledge_base');

/**
 * Get all active knowledge entries for a tenant, optionally filtered by category
 */
export async function getKnowledge(
  tenantId: string,
  category?: KnowledgeCategory
): Promise<Array<KnowledgeEntry & { id: string }>> {
  let query = col
    .where('tenant_id', '==', tenantId)
    .where('active', '==', true);

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as KnowledgeEntry) }));
}

/**
 * Search knowledge base by keywords (simple keyword intersection)
 */
export async function searchKnowledge(
  tenantId: string,
  keywords: string[]
): Promise<Array<KnowledgeEntry & { id: string }>> {
  // Firestore doesn't support full-text search, so we fetch active entries
  // and filter by keyword overlap client-side
  const allEntries = await getKnowledge(tenantId);

  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  const scored = allEntries
    .map((entry) => {
      // Score by keyword match + title/content match
      let score = 0;
      const entryKeywords = entry.keywords.map((k) => k.toLowerCase());

      for (const kw of normalizedKeywords) {
        if (entryKeywords.some((ek) => ek.includes(kw) || kw.includes(ek))) {
          score += 2;
        }
        if (entry.title.toLowerCase().includes(kw)) {
          score += 1;
        }
        if (entry.content.toLowerCase().includes(kw)) {
          score += 1;
        }
      }

      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.entry);
}

/**
 * Upsert a knowledge entry
 */
export async function upsertKnowledge(
  tenantId: string,
  entry: Omit<KnowledgeEntry, 'tenant_id' | 'created_at' | 'updated_at'>,
  entryId?: string
): Promise<string> {
  const data = {
    ...entry,
    tenant_id: tenantId,
    updated_at: new Date(),
  };

  if (entryId) {
    await col.doc(entryId).set({ ...data }, { merge: true });
    return entryId;
  }

  const doc = await col.add({
    ...data,
    created_at: new Date(),
  });
  return doc.id;
}

/**
 * Delete (soft-delete) a knowledge entry
 */
export async function deactivateKnowledge(entryId: string): Promise<void> {
  await col.doc(entryId).update({ active: false, updated_at: new Date() });
}

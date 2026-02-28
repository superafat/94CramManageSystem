// Layer 1: Global Memory
export type GlobalMemoryCategory = 'faq_pattern' | 'behavior_learning' | 'common_correction';

export interface GlobalMemoryEntry {
  id?: string;
  category: GlobalMemoryCategory;
  title: string;
  content: string;
  keywords: string[];
  source: 'manual' | 'auto';
  usage_count: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Layer 2: Tenant Memory
export type TenantFactCategory = 'preference' | 'naming' | 'workflow' | 'policy' | 'correction';

export interface TenantFact {
  key: string;
  category: TenantFactCategory;
  content: string;
  confidence: number;
  source: 'conversation' | 'manual';
  last_used_at: Date;
  created_at: Date;
}

export interface TenantMemoryDoc {
  tenant_id: string;
  facts: TenantFact[];
  updated_at: Date;
}

// Layer 3: User Memory
export type BotType = 'admin' | 'parent';

export interface UserMemoryMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  intent?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationSummary {
  period_start: Date;
  period_end: Date;
  summary: string;
  key_facts: string[];
  message_count: number;
  created_at: Date;
}

export type UserFactCategory = 'preference' | 'pattern' | 'context';

export interface UserFact {
  fact: string;
  category: UserFactCategory;
  created_at: Date;
}

export interface UserMemoryDoc {
  bot_type: BotType;
  telegram_user_id: string;
  tenant_id: string;
  messages: UserMemoryMessage[];
  summaries: ConversationSummary[];
  user_facts: UserFact[];
  updated_at: Date;
  created_at: Date;
}

// Assembled context for AI engine
export interface MemoryContext {
  global: GlobalMemoryEntry[];
  tenant: TenantMemoryDoc | null;
  user: UserMemoryDoc | null;
  conversationHistory: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  memoryPromptSection: string;
}

import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import {
  getPromptSettings,
  updatePromptSettings,
  clearPromptCache,
  getDefaultModel,
  type BotType,
} from '../firestore/bot-prompt-settings';
import { firestore } from '../firestore/client';

type Env = { Variables: { user: DashboardUser } };
const VALID_BOT_TYPES: BotType[] = ['clairvoyant', 'windear', 'ai-tutor', 'wentaishi'];

export const botPromptsRouter = new Hono<Env>();

botPromptsRouter.get('/:botType', async (c) => {
  const user = c.get('user');
  const botType = c.req.param('botType') as BotType;
  if (!VALID_BOT_TYPES.includes(botType)) {
    return c.json({ error: 'Invalid bot type' }, 400);
  }
  const settings = await getPromptSettings(user.tenantId, botType);
  if (!settings) {
    return c.json({
      botType,
      tenantId: user.tenantId,
      mode: 'structured',
      structured: {
        roleName: '',
        roleDescription: '',
        toneRules: [],
        forbiddenActions: [],
        capabilities: [],
        knowledgeScope: '',
        customRules: [],
      },
      fullPrompt: '',
      model: getDefaultModel(),
      isDefault: true,
    });
  }
  return c.json(settings);
});

botPromptsRouter.put('/:botType', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  const botType = c.req.param('botType') as BotType;
  if (!VALID_BOT_TYPES.includes(botType)) {
    return c.json({ error: 'Invalid bot type' }, 400);
  }
  const body = await c.req.json();
  const allowed = ['structured', 'fullPrompt', 'mode', 'subPrompts', 'model'] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  await updatePromptSettings(user.tenantId, botType, updates, user.userId);
  const settings = await getPromptSettings(user.tenantId, botType);
  return c.json(settings);
});

botPromptsRouter.post('/:botType/reset', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  const botType = c.req.param('botType') as BotType;
  if (!VALID_BOT_TYPES.includes(botType)) {
    return c.json({ error: 'Invalid bot type' }, 400);
  }
  clearPromptCache(user.tenantId, botType);
  const docId = `${user.tenantId}_${botType}`;
  await firestore.collection('bot-prompt-settings').doc(docId).delete();
  return c.json({ success: true, message: 'Reset to default' });
});

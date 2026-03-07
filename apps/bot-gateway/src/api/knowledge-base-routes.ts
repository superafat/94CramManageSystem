import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { getKnowledge, upsertKnowledge, deactivateKnowledge } from '../firestore/knowledge-base';
import type { KnowledgeCategory } from '../firestore/knowledge-base';

type Env = { Variables: { user: DashboardUser } };

export const knowledgeBaseRouter = new Hono<Env>();

knowledgeBaseRouter.get('/', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category') as KnowledgeCategory | undefined;
  const entries = await getKnowledge(user.tenantId, category);
  return c.json(entries);
});

knowledgeBaseRouter.post('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  const body = await c.req.json();
  const { title, content, category, keywords } = body as {
    title?: string; content?: string; category?: string; keywords?: string[];
  };
  if (!title || !content) {
    return c.json({ error: 'title and content are required' }, 400);
  }
  const id = await upsertKnowledge(user.tenantId, {
    category: (category as KnowledgeCategory) || 'faq',
    title,
    content,
    keywords: keywords || [],
    active: true,
  });
  return c.json({ id }, 201);
});

knowledgeBaseRouter.put('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  const entryId = c.req.param('id');
  const body = await c.req.json();
  const { title, content, category, keywords, active } = body as {
    title?: string; content?: string; category?: string; keywords?: string[]; active?: boolean;
  };
  await upsertKnowledge(
    user.tenantId,
    {
      category: (category as KnowledgeCategory) || 'faq',
      title: title || '',
      content: content || '',
      keywords: keywords || [],
      active: active !== false,
    },
    entryId,
  );
  return c.json({ success: true });
});

knowledgeBaseRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  const entryId = c.req.param('id');
  await deactivateKnowledge(entryId);
  return c.json({ success: true });
});

knowledgeBaseRouter.post('/crawl', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  const body = await c.req.json();
  const { url } = body as { url?: string };
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return c.json({ error: 'Valid URL is required' }, 400);
  }
  const id = await upsertKnowledge(user.tenantId, {
    category: 'general',
    title: url,
    content: '',
    keywords: [],
    active: false,
  });
  void (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const html = await res.text();
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);
      await upsertKnowledge(user.tenantId, {
        category: 'general',
        title: url,
        content: text,
        keywords: [],
        active: true,
      }, id);
    } catch { /* leave active: false */ }
  })();
  return c.json({ id, status: 'processing' }, 202);
});

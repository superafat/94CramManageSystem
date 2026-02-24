import { Hono } from 'hono';
import { botAuth } from '../../middleware/botAuth.js';
import attendance from './attendance.js';
import data from './data.js';
import type { Variables } from '../../middleware/auth.js';

const app = new Hono<{ Variables: Variables }>();

app.use('*', botAuth);
app.route('/attendance', attendance);
app.route('/data', data);

export default app;

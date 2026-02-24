import { Hono } from 'hono';
import { botAuth } from '../../middleware/botAuth';
import stock from './stock';
import data from './data';

const app = new Hono();

app.use('*', botAuth);
app.route('/stock', stock);
app.route('/data', data);

export default app;

import { Hono } from 'hono';
import ai from './ai';
import auth from './auth';
import barcodes from './barcodes';
import categories from './categories';
import classes from './classes';
import inventory from './inventory';
import inventoryCounts from './inventory-counts';
import integrations from './integrations';
import items from './items';
import notifications from './notifications';
import purchaseOrders from './purchase-orders';
import reports from './reports';
import suppliers from './suppliers';
import warehouses from './warehouses';

const app = new Hono();

app.route('/auth', auth);
app.route('/ai', ai);
app.route('/categories', categories);
app.route('/classes', classes);
app.route('/items', items);
app.route('/inventory', inventory);
app.route('/inventory-counts', inventoryCounts);
app.route('/barcodes', barcodes);
app.route('/integrations', integrations);
app.route('/notifications', notifications);
app.route('/warehouses', warehouses);
app.route('/suppliers', suppliers);
app.route('/purchase-orders', purchaseOrders);
app.route('/reports', reports);

export default app;

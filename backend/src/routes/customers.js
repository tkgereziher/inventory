import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// List Customers
router.get('/', (req, res) => {
  const customers = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM sales_orders so WHERE so.customer_id = c.id AND so.tenant_id = c.tenant_id) as so_count,
      (SELECT COALESCE(SUM(so.total_amount), 0) FROM sales_orders so WHERE so.customer_id = c.id AND so.tenant_id = c.tenant_id) as total_sales
    FROM customers c
    WHERE c.tenant_id = ?
    ORDER BY c.name ASC
  `).all(req.tenantId);

  res.json({ customers });
});

// Create Customer
router.post('/', (req, res) => {
  const { name, contact_name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Customer name is required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO customers (id, tenant_id, name, contact_name, email, phone, address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.tenantId, name.trim(), contact_name || null, email || null, phone || null, address || null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.status(201).json({ customer });
});

export default router;

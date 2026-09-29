import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// List Suppliers
router.get('/', (req, res) => {
  const suppliers = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.tenant_id = s.tenant_id) as po_count,
      (SELECT COALESCE(SUM(po.total_amount), 0) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.tenant_id = s.tenant_id) as total_purchased
    FROM suppliers s
    WHERE s.tenant_id = ?
    ORDER BY s.name ASC
  `).all(req.tenantId);

  res.json({ suppliers });
});

// Create Supplier
router.post('/', (req, res) => {
  const { name, contact_name, email, phone, address, tax_id, payment_terms } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO suppliers (id, tenant_id, name, contact_name, email, phone, address, tax_id, payment_terms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.tenantId, name.trim(), contact_name || null, email || null, phone || null, address || null, tax_id || null, payment_terms || 'Net 30');

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  res.status(201).json({ supplier });
});

// Update Supplier
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, contact_name, email, phone, address, tax_id, payment_terms } = req.body;

  db.prepare(`
    UPDATE suppliers SET
      name = COALESCE(?, name),
      contact_name = COALESCE(?, contact_name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      tax_id = COALESCE(?, tax_id),
      payment_terms = COALESCE(?, payment_terms)
    WHERE id = ? AND tenant_id = ?
  `).run(name, contact_name, email, phone, address, tax_id, payment_terms, id, req.tenantId);

  const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  res.json({ supplier: updated });
});

export default router;

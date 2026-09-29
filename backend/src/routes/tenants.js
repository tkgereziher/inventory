import express from 'express';
import db from '../config/database.js';
import { authMiddleware, requireRoles, optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

// List all tenants (Public or auth, useful for tenant selector in UI)
router.get('/', optionalAuthMiddleware, (req, res) => {
  const tenants = db.prepare(`
    SELECT t.id, t.name, t.slug, t.plan, t.created_at,
      (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
      (SELECT COUNT(*) FROM products WHERE tenant_id = t.id) as product_count,
      (SELECT COUNT(*) FROM warehouses WHERE tenant_id = t.id) as warehouse_count
    FROM tenants t
    ORDER BY t.name ASC
  `).all();

  res.json({ tenants });
});

// Get single tenant details
router.get('/:id', authMiddleware, (req, res) => {
  const tenantId = req.params.id;
  if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
    return res.status(403).json({ error: 'Access denied to this tenant' });
  }

  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  res.json({ tenant });
});

// Update tenant settings
router.put('/:id', authMiddleware, requireRoles('SUPER_ADMIN', 'TENANT_ADMIN'), (req, res) => {
  const tenantId = req.params.id;
  const { name, plan, settings } = req.body;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare(`
    UPDATE tenants 
    SET name = COALESCE(?, name),
        plan = COALESCE(?, plan),
        settings_json = COALESCE(?, settings_json)
    WHERE id = ?
  `).run(name, plan, settings ? JSON.stringify(settings) : null, tenantId);

  const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  res.json({ tenant: updated });
});

export default router;

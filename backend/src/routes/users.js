import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { authMiddleware, requireRoles, optionalAuthMiddleware } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// List users for tenant
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, tenant_id, name, email, role, avatar_url, status, created_at
    FROM users
    WHERE tenant_id = ?
    ORDER BY created_at ASC
  `).all(req.tenantId);

  res.json({ users });
});

// Create new user for tenant
router.post('/', (req, res) => {
  const { name, email, password, role = 'WAREHOUSE_STAFF' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND email = ?').get(req.tenantId, email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists in this organization' });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
  `).run(id, req.tenantId, name.trim(), email.toLowerCase().trim(), passwordHash, role);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user?.id,
    action: 'CREATE_USER',
    entityType: 'USER',
    entityId: id,
    details: { name, email, role }
  });

  const created = db.prepare('SELECT id, tenant_id, name, email, role, status, created_at FROM users WHERE id = ?').get(id);
  res.status(201).json({ user: created });
});

export default router;

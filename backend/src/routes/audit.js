import express from 'express';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// Get Audit Logs with pagination and filters
router.get('/', (req, res) => {
  const { action, entity_type, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      al.*,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.tenant_id = ?
  `;

  const params = [req.tenantId];

  if (action) {
    query += ` AND al.action = ?`;
    params.push(action);
  }

  if (entity_type) {
    query += ` AND al.entity_type = ?`;
    params.push(entity_type);
  }

  query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const logs = db.prepare(query).all(...params);
  res.json({ logs });
});

export default router;

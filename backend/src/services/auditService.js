import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const logAudit = ({
  tenantId,
  userId = null,
  action,
  entityType,
  entityId = null,
  details = {},
  ip = null
}) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      uuidv4(),
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(details)
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

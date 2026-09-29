import db from '../config/database.js';

export const tenantMiddleware = (req, res, next) => {
  // 1. From authenticated user
  if (req.user && req.user.tenant_id) {
    req.tenantId = req.user.tenant_id;
    return next();
  }

  // 2. From header
  let tenantId = req.headers['x-tenant-id'];
  const tenantSlug = req.headers['x-tenant-slug'];

  if (!tenantId && tenantSlug) {
    const tenant = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(tenantSlug);
    if (tenant) tenantId = tenant.id;
  }

  // 3. From Query Param
  if (!tenantId && req.query.tenant_id) {
    tenantId = req.query.tenant_id;
  }

  // 4. Default to first active tenant if not specified (for convenience in demo/public routes)
  if (!tenantId) {
    const firstTenant = db.prepare('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1').get();
    if (firstTenant) {
      tenantId = firstTenant.id;
    }
  }

  req.tenantId = tenantId;
  next();
};

export const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant context is required. Provide X-Tenant-Id header or authenticate.' });
  }
  next();
};

import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { email, password, tenant_id } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let user;
  if (tenant_id) {
    user = db.prepare(`
      SELECT u.*, t.name as tenant_name, t.slug as tenant_slug 
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ? AND u.tenant_id = ?
    `).get(email.toLowerCase().trim(), tenant_id);
  } else {
    // If no tenant passed, find first matching user or super admin
    user = db.prepare(`
      SELECT u.*, t.name as tenant_name, t.slug as tenant_slug 
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ?
      LIMIT 1
    `).get(email.toLowerCase().trim());
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'User account is inactive. Please contact your administrator.' });
  }

  const token = generateToken(user);

  logAudit({
    tenantId: user.tenant_id,
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email }
  });

  const { password_hash, ...userProfile } = user;
  res.json({
    token,
    user: userProfile
  });
});

// Register a new tenant & admin user
router.post('/register', (req, res) => {
  const { company_name, slug, name, email, password } = req.body;

  if (!company_name || !email || !password || !name) {
    return res.status(400).json({ error: 'Company name, admin name, email, and password are required' });
  }

  const generatedSlug = (slug || company_name.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/^-+|-+$/g, '');

  const existingSlug = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(generatedSlug);
  if (existingSlug) {
    return res.status(400).json({ error: 'Company identifier/slug is already taken. Please choose another.' });
  }

  const tenantId = uuidv4();
  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  const createTenantTx = db.transaction(() => {
    // Create tenant
    db.prepare(`
      INSERT INTO tenants (id, name, slug, plan, settings_json)
      VALUES (?, ?, ?, 'ENTERPRISE', ?)
    `).run(tenantId, company_name, generatedSlug, JSON.stringify({ currency: 'USD', timezone: 'UTC' }));

    // Create default primary warehouse
    const whId = uuidv4();
    db.prepare(`
      INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm)
      VALUES (?, ?, 'Main Distribution Hub', 'WH-MAIN', 'Central', 'USA', 5000)
    `).run(whId, tenantId);

    // Create tenant admin user
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'TENANT_ADMIN')
    `).run(userId, tenantId, name, email.toLowerCase().trim(), passwordHash);

    // Create default categories
    const categories = ['Electronics', 'Industrial Parts', 'Raw Materials', 'Finished Goods'];
    for (const cat of categories) {
      db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(uuidv4(), tenantId, cat);
    }
  });

  try {
    createTenantTx();

    const user = db.prepare(`
      SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.status, t.name as tenant_name, t.slug as tenant_slug
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = ?
    `).get(userId);

    const token = generateToken(user);
    res.status(201).json({
      token,
      user,
      message: 'Tenant and Admin account registered successfully'
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Current Authenticated User Info
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.avatar_url, u.status, t.name as tenant_name, t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

export default router;

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// List Warehouses with stats (items stored, total quantity, total inventory value)
router.get('/', (req, res) => {
  const warehouses = db.prepare(`
    SELECT 
      w.*,
      COUNT(DISTINCT il.product_id) as total_skus,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_units,
      COALESCE(SUM(il.quantity_on_hand * p.cost_price), 0) as total_valuation,
      (SELECT COUNT(*) FROM locations l WHERE l.warehouse_id = w.id) as location_count
    FROM warehouses w
    LEFT JOIN inventory_levels il ON w.id = il.warehouse_id AND il.tenant_id = w.tenant_id
    LEFT JOIN products p ON il.product_id = p.id
    WHERE w.tenant_id = ?
    GROUP BY w.id
    ORDER BY w.name ASC
  `).all(req.tenantId);

  res.json({ warehouses });
});

// Single Warehouse Detail with Bins and Stock List
router.get('/:id', (req, res) => {
  const warehouse = db.prepare(`
    SELECT w.*,
      COUNT(DISTINCT il.product_id) as total_skus,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_units,
      COALESCE(SUM(il.quantity_on_hand * p.cost_price), 0) as total_valuation
    FROM warehouses w
    LEFT JOIN inventory_levels il ON w.id = il.warehouse_id AND il.tenant_id = w.tenant_id
    LEFT JOIN products p ON il.product_id = p.id
    WHERE w.id = ? AND w.tenant_id = ?
    GROUP BY w.id
  `).get(req.params.id, req.tenantId);

  if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

  const locations = db.prepare(`
    SELECT l.*, 
      COALESCE(SUM(il.quantity_on_hand), 0) as current_occupancy
    FROM locations l
    LEFT JOIN inventory_levels il ON l.id = il.location_id
    WHERE l.warehouse_id = ? AND l.tenant_id = ?
    GROUP BY l.id
    ORDER BY l.zone, l.bin_code ASC
  `).all(warehouse.id, req.tenantId);

  const inventory = db.prepare(`
    SELECT 
      il.*,
      p.name as product_name,
      p.sku,
      p.unit_of_measure,
      p.cost_price,
      p.selling_price,
      l.bin_code,
      l.zone
    FROM inventory_levels il
    JOIN products p ON il.product_id = p.id
    LEFT JOIN locations l ON il.location_id = l.id
    WHERE il.warehouse_id = ? AND il.tenant_id = ? AND il.quantity_on_hand > 0
    ORDER BY p.name ASC
  `).all(warehouse.id, req.tenantId);

  res.json({ warehouse, locations, inventory });
});

// Create Warehouse
router.post('/', (req, res) => {
  const { name, code, address, city, country, capacity_sqm = 1000, manager_name } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Warehouse name and unique code are required' });
  }

  const existing = db.prepare('SELECT id FROM warehouses WHERE tenant_id = ? AND code = ?').get(req.tenantId, code.trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ error: `Warehouse code '${code}' already exists in this tenant` });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO warehouses (id, tenant_id, name, code, address, city, country, capacity_sqm, manager_name, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, req.tenantId, name.trim(), code.trim().toUpperCase(), address || null, city || null, country || null, Number(capacity_sqm) || 1000, manager_name || null);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user?.id,
    action: 'CREATE_WAREHOUSE',
    entityType: 'WAREHOUSE',
    entityId: id,
    details: { name, code }
  });

  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
  res.status(201).json({ warehouse, message: 'Warehouse created successfully' });
});

// Update Warehouse
router.put('/:id', (req, res) => {
  const { name, address, city, country, capacity_sqm, manager_name, is_active } = req.body;
  const { id } = req.params;

  db.prepare(`
    UPDATE warehouses SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      country = COALESCE(?, country),
      capacity_sqm = COALESCE(?, capacity_sqm),
      manager_name = COALESCE(?, manager_name),
      is_active = COALESCE(?, is_active)
    WHERE id = ? AND tenant_id = ?
  `).run(name, address, city, country, capacity_sqm, manager_name, is_active !== undefined ? (is_active ? 1 : 0) : null, id, req.tenantId);

  const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
  res.json({ warehouse: updated, message: 'Warehouse updated' });
});

// Create Storage Location / Bin in Warehouse
router.post('/:id/locations', (req, res) => {
  const warehouseId = req.params.id;
  const { zone, aisle, rack, bin_code, max_capacity = 100 } = req.body;

  if (!zone || !bin_code) {
    return res.status(400).json({ error: 'Zone and bin code are required' });
  }

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO locations (id, tenant_id, warehouse_id, zone, aisle, rack, bin_code, max_capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.tenantId, warehouseId, zone.trim(), aisle || null, rack || null, bin_code.trim().toUpperCase(), Number(max_capacity) || 100);

    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    res.status(201).json({ location });
  } catch (err) {
    res.status(400).json({ error: 'Location bin code already exists in this warehouse' });
  }
});

export default router;

import express from 'express';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { refreshInventoryAlerts } from '../services/alertService.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// 1. Executive Dashboard KPIs
router.get('/dashboard', (req, res) => {
  refreshInventoryAlerts(req.tenantId);

  // Total Products Count
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE tenant_id = ?').get(req.tenantId)?.count || 0;

  // Total Warehouses Count
  const totalWarehouses = db.prepare('SELECT COUNT(*) as count FROM warehouses WHERE tenant_id = ?').get(req.tenantId)?.count || 0;

  // Total Inventory Valuation (Cost & Retail)
  const valuation = db.prepare(`
    SELECT 
      COALESCE(SUM(il.quantity_on_hand * p.cost_price), 0) as total_cost_value,
      COALESCE(SUM(il.quantity_on_hand * p.selling_price), 0) as total_retail_value,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_units_in_stock
    FROM inventory_levels il
    JOIN products p ON il.product_id = p.id
    WHERE il.tenant_id = ?
  `).get(req.tenantId);

  // Low Stock & Out of Stock counts
  const lowStockCounts = db.prepare(`
    SELECT 
      COUNT(CASE WHEN total_stock = 0 THEN 1 END) as out_of_stock_count,
      COUNT(CASE WHEN total_stock > 0 AND total_stock <= reorder_point THEN 1 END) as low_stock_count
    FROM (
      SELECT p.id, p.reorder_point, COALESCE(SUM(il.quantity_on_hand), 0) as total_stock
      FROM products p
      LEFT JOIN inventory_levels il ON p.id = il.product_id AND il.tenant_id = p.tenant_id
      WHERE p.tenant_id = ? AND p.is_active = 1
      GROUP BY p.id
    )
  `).get(req.tenantId);

  // Open Purchase Orders & Sales Orders
  const openPOs = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
    FROM purchase_orders
    WHERE tenant_id = ? AND status IN ('ORDERED', 'PARTIALLY_RECEIVED')
  `).get(req.tenantId);

  const openSOs = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
    FROM sales_orders
    WHERE tenant_id = ? AND status IN ('CONFIRMED', 'PACKED')
  `).get(req.tenantId);

  // Recent Stock Movement Activity (Past 7 days)
  const recentMovements = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      movement_type,
      COUNT(*) as count,
      SUM(quantity) as total_quantity
    FROM stock_movements
    WHERE tenant_id = ? AND created_at >= DATE('now', '-7 days')
    GROUP BY DATE(created_at), movement_type
    ORDER BY date ASC
  `).all(req.tenantId);

  // Stock Distribution across Warehouses
  const warehouseDistribution = db.prepare(`
    SELECT 
      w.id,
      w.name,
      w.code,
      COUNT(DISTINCT il.product_id) as sku_count,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_units,
      COALESCE(SUM(il.quantity_on_hand * p.cost_price), 0) as valuation
    FROM warehouses w
    LEFT JOIN inventory_levels il ON w.id = il.warehouse_id AND il.tenant_id = w.tenant_id
    LEFT JOIN products p ON il.product_id = p.id
    WHERE w.tenant_id = ?
    GROUP BY w.id
  `).all(req.tenantId);

  // Top fast-moving / high-value products
  const topProducts = db.prepare(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.unit_of_measure,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_stock,
      (COALESCE(SUM(il.quantity_on_hand), 0) * p.cost_price) as stock_valuation
    FROM products p
    LEFT JOIN inventory_levels il ON p.id = il.product_id AND il.tenant_id = p.tenant_id
    WHERE p.tenant_id = ?
    GROUP BY p.id
    ORDER BY stock_valuation DESC
    LIMIT 6
  `).all(req.tenantId);

  res.json({
    kpis: {
      total_products: totalProducts,
      total_warehouses: totalWarehouses,
      total_units: valuation.total_units_in_stock,
      inventory_cost_value: valuation.total_cost_value,
      inventory_retail_value: valuation.total_retail_value,
      potential_margin: valuation.total_retail_value - valuation.total_cost_value,
      low_stock_count: lowStockCounts?.low_stock_count || 0,
      out_of_stock_count: lowStockCounts?.out_of_stock_count || 0,
      open_pos_count: openPOs.count,
      open_pos_amount: openPOs.total_amount,
      open_sos_count: openSOs.count,
      open_sos_amount: openSOs.total_amount
    },
    warehouse_distribution: warehouseDistribution,
    top_products: topProducts,
    recent_movements: recentMovements
  });
});

// 2. Active Alerts (Low stock, out of stock, expiring batches)
router.get('/alerts', (req, res) => {
  refreshInventoryAlerts(req.tenantId);

  const alerts = db.prepare(`
    SELECT a.*, p.name as product_name, p.sku
    FROM alerts a
    LEFT JOIN products p ON a.product_id = p.id
    WHERE a.tenant_id = ?
    ORDER BY CASE a.severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, a.created_at DESC
  `).all(req.tenantId);

  res.json({ alerts });
});

// Mark Alert as Read
router.put('/alerts/:id/read', (req, res) => {
  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  res.json({ success: true });
});

export default router;

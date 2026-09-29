import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const refreshInventoryAlerts = (tenantId) => {
  try {
    // 1. Check for Low Stock / Out of Stock
    const lowStockProducts = db.prepare(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.reorder_point,
        COALESCE(SUM(il.quantity_on_hand), 0) as total_stock
      FROM products p
      LEFT JOIN inventory_levels il ON p.id = il.product_id AND il.tenant_id = ?
      WHERE p.tenant_id = ? AND p.is_active = 1
      GROUP BY p.id
      HAVING total_stock <= p.reorder_point
    `).all(tenantId, tenantId);

    const insertAlertStmt = db.prepare(`
      INSERT INTO alerts (id, tenant_id, type, product_id, message, severity)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Clean existing unread low-stock alerts to avoid duplicates
    db.prepare(`
      DELETE FROM alerts 
      WHERE tenant_id = ? AND type IN ('LOW_STOCK', 'OUT_OF_STOCK') AND is_read = 0
    `).run(tenantId);

    for (const item of lowStockProducts) {
      const type = item.total_stock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
      const severity = item.total_stock <= 0 ? 'HIGH' : 'MEDIUM';
      const message = item.total_stock <= 0
        ? `Product "${item.product_name}" (${item.sku}) is completely OUT OF STOCK!`
        : `Product "${item.product_name}" (${item.sku}) is LOW on stock (${item.total_stock} units left, reorder threshold is ${item.reorder_point}).`;

      insertAlertStmt.run(uuidv4(), tenantId, type, item.product_id, message, severity);
    }

    // 2. Check for batches expiring in the next 30 days
    const expiringBatches = db.prepare(`
      SELECT 
        il.product_id,
        p.name as product_name,
        il.warehouse_id,
        w.name as warehouse_name,
        il.batch_number,
        il.expiry_date,
        il.quantity_on_hand
      FROM inventory_levels il
      JOIN products p ON il.product_id = p.id
      JOIN warehouses w ON il.warehouse_id = w.id
      WHERE il.tenant_id = ? 
        AND il.expiry_date IS NOT NULL 
        AND il.expiry_date <= DATE('now', '+30 days')
        AND il.quantity_on_hand > 0
    `).all(tenantId);

    db.prepare(`
      DELETE FROM alerts 
      WHERE tenant_id = ? AND type = 'EXPIRING_SOON' AND is_read = 0
    `).run(tenantId);

    for (const batch of expiringBatches) {
      insertAlertStmt.run(
        uuidv4(),
        tenantId,
        'EXPIRING_SOON',
        batch.product_id,
        `Batch ${batch.batch_number} of "${batch.product_name}" at ${batch.warehouse_name} expires on ${batch.expiry_date} (${batch.quantity_on_hand} units).`,
        'HIGH'
      );
    }
  } catch (error) {
    console.error('Error refreshing alerts:', error);
  }
};

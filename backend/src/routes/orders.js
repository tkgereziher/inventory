import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { tenantMiddleware, requireTenant } from '../middleware/tenant.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { refreshInventoryAlerts } from '../services/alertService.js';

const router = express.Router();
router.use(optionalAuthMiddleware);
router.use(tenantMiddleware);
router.use(requireTenant);

// ==========================================
// 1. PURCHASE ORDERS (Inbound Procurement)
// ==========================================

// Get All Purchase Orders
router.get('/purchase', (req, res) => {
  const { status, supplier_id } = req.query;

  let query = `
    SELECT 
      po.*,
      s.name as supplier_name,
      w.name as warehouse_name,
      (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.id) as item_count,
      (SELECT SUM(poi.quantity_ordered) FROM purchase_order_items poi WHERE poi.po_id = po.id) as total_units_ordered,
      (SELECT SUM(poi.quantity_received) FROM purchase_order_items poi WHERE poi.po_id = po.id) as total_units_received
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN warehouses w ON po.warehouse_id = w.id
    WHERE po.tenant_id = ?
  `;

  const params = [req.tenantId];

  if (status) {
    query += ` AND po.status = ?`;
    params.push(status);
  }

  if (supplier_id) {
    query += ` AND po.supplier_id = ?`;
    params.push(supplier_id);
  }

  query += ` ORDER BY po.created_at DESC`;

  const pos = db.prepare(query).all(...params);

  const getItemsStmt = db.prepare(`
    SELECT poi.*, p.name as product_name, p.sku, p.unit_of_measure
    FROM purchase_order_items poi
    JOIN products p ON poi.product_id = p.id
    WHERE poi.po_id = ? AND poi.tenant_id = ?
  `);

  const enriched = pos.map(po => ({
    ...po,
    items: getItemsStmt.all(po.id, req.tenantId)
  }));

  res.json({ purchase_orders: enriched });
});

// Create Purchase Order
router.post('/purchase', (req, res) => {
  const {
    supplier_id,
    warehouse_id,
    expected_date,
    notes,
    items // array of { product_id, quantity_ordered, unit_price }
  } = req.body;

  if (!supplier_id || !warehouse_id || !items || !items.length) {
    return res.status(400).json({ error: 'Supplier, warehouse, and items are required' });
  }

  const poId = uuidv4();
  const poNumber = `PO-${Date.now().toString().slice(-6)}`;

  let totalAmount = 0;
  for (const item of items) {
    totalAmount += Number(item.quantity_ordered) * Number(item.unit_price);
  }

  const createPOTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO purchase_orders (
        id, tenant_id, po_number, supplier_id, warehouse_id,
        order_date, expected_date, status, total_amount, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, DATE('now'), ?, 'ORDERED', ?, ?, ?)
    `).run(
      poId,
      req.tenantId,
      poNumber,
      supplier_id,
      warehouse_id,
      expected_date || null,
      totalAmount,
      notes || null,
      req.user?.id || null
    );

    for (const item of items) {
      const lineTotal = Number(item.quantity_ordered) * Number(item.unit_price);
      db.prepare(`
        INSERT INTO purchase_order_items (
          id, tenant_id, po_id, product_id, quantity_ordered, quantity_received, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        uuidv4(),
        req.tenantId,
        poId,
        item.product_id,
        Number(item.quantity_ordered),
        Number(item.unit_price),
        lineTotal
      );
    }
  });

  try {
    createPOTx();

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE_PO',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      details: { poNumber, supplier_id, totalAmount, itemsCount: items.length }
    });

    res.status(201).json({ success: true, po_id: poId, po_number: poNumber, message: 'Purchase Order created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Receive Items Against Purchase Order (Increments Stock)
router.post('/purchase/:id/receive', (req, res) => {
  const poId = req.params.id;
  const { items, batch_number, expiry_date } = req.body; // array of { item_id, quantity_to_receive }

  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?').get(poId, req.tenantId);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
    return res.status(400).json({ error: `Cannot receive items for PO in status: ${po.status}` });
  }

  const receiveTx = db.transaction(() => {
    let allCompleted = true;

    for (const rec of items) {
      const line = db.prepare('SELECT * FROM purchase_order_items WHERE id = ? AND po_id = ? AND tenant_id = ?').get(rec.item_id, poId, req.tenantId);
      if (!line) continue;

      const qty = Number(rec.quantity_to_receive);
      if (qty <= 0) continue;

      const newReceived = line.quantity_received + qty;
      db.prepare('UPDATE purchase_order_items SET quantity_received = ? WHERE id = ?').run(newReceived, line.id);

      if (newReceived < line.quantity_ordered) {
        allCompleted = false;
      }

      // Add to inventory
      let existingLevel = db.prepare(`
        SELECT * FROM inventory_levels 
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
        LIMIT 1
      `).get(req.tenantId, line.product_id, po.warehouse_id);

      if (existingLevel) {
        db.prepare('UPDATE inventory_levels SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?').run(qty, existingLevel.id);
      } else {
        db.prepare(`
          INSERT INTO inventory_levels (
            id, tenant_id, product_id, warehouse_id, batch_number, expiry_date, quantity_on_hand, quantity_reserved
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(uuidv4(), req.tenantId, line.product_id, po.warehouse_id, batch_number || null, expiry_date || null, qty);
      }

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, product_id, movement_type, quantity, unit_cost,
          to_warehouse_id, batch_number, reference_type, reference_id, reason, performed_by_user_id
        ) VALUES (?, ?, ?, 'PO_RECEIPT', ?, ?, ?, ?, 'PURCHASE_ORDER', ?, ?, ?)
      `).run(
        uuidv4(),
        req.tenantId,
        line.product_id,
        qty,
        line.unit_price,
        po.warehouse_id,
        batch_number || null,
        poId,
        `PO Receipt for ${po.po_number}`,
        req.user?.id || null
      );
    }

    // Check remaining items
    const allLines = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(poId);
    const fullyReceived = allLines.every(l => l.quantity_received >= l.quantity_ordered);

    const newStatus = fullyReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
    db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(newStatus, poId);
  });

  try {
    receiveTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'RECEIVE_PO_GOODS',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      details: { poNumber: po.po_number }
    });

    res.json({ success: true, message: `Goods received against PO ${po.po_number}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. SALES ORDERS (Outbound Fulfillment)
// ==========================================

// Get All Sales Orders
router.get('/sales', (req, res) => {
  const { status, customer_id } = req.query;

  let query = `
    SELECT 
      so.*,
      c.name as customer_name,
      w.name as warehouse_name,
      (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.so_id = so.id) as item_count,
      (SELECT SUM(soi.quantity_ordered) FROM sales_order_items soi WHERE soi.so_id = so.id) as total_units_ordered,
      (SELECT SUM(soi.quantity_shipped) FROM sales_order_items soi WHERE soi.so_id = so.id) as total_units_shipped
    FROM sales_orders so
    JOIN customers c ON so.customer_id = c.id
    JOIN warehouses w ON so.warehouse_id = w.id
    WHERE so.tenant_id = ?
  `;

  const params = [req.tenantId];

  if (status) {
    query += ` AND so.status = ?`;
    params.push(status);
  }

  if (customer_id) {
    query += ` AND so.customer_id = ?`;
    params.push(customer_id);
  }

  query += ` ORDER BY so.created_at DESC`;

  const sos = db.prepare(query).all(...params);

  const getItemsStmt = db.prepare(`
    SELECT soi.*, p.name as product_name, p.sku, p.unit_of_measure
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    WHERE soi.so_id = ? AND soi.tenant_id = ?
  `);

  const enriched = sos.map(so => ({
    ...so,
    items: getItemsStmt.all(so.id, req.tenantId)
  }));

  res.json({ sales_orders: enriched });
});

// Create Sales Order
router.post('/sales', (req, res) => {
  const {
    customer_id,
    warehouse_id,
    shipping_address,
    items // array of { product_id, quantity_ordered, unit_price }
  } = req.body;

  if (!customer_id || !warehouse_id || !items || !items.length) {
    return res.status(400).json({ error: 'Customer, warehouse, and items are required' });
  }

  const soId = uuidv4();
  const soNumber = `SO-${Date.now().toString().slice(-6)}`;

  let totalAmount = 0;
  for (const item of items) {
    totalAmount += Number(item.quantity_ordered) * Number(item.unit_price);
  }

  const createSOTx = db.transaction(() => {
    // Check if enough stock exists in warehouse
    for (const item of items) {
      const stock = db.prepare(`
        SELECT COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) as available
        FROM inventory_levels
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      `).get(req.tenantId, item.product_id, warehouse_id)?.available || 0;

      if (stock < Number(item.quantity_ordered)) {
        throw new Error(`Insufficient available stock for item. Available: ${stock}, Requested: ${item.quantity_ordered}`);
      }
    }

    db.prepare(`
      INSERT INTO sales_orders (
        id, tenant_id, so_number, customer_id, warehouse_id,
        order_date, status, total_amount, shipping_address, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, DATE('now'), 'CONFIRMED', ?, ?, ?)
    `).run(
      soId,
      req.tenantId,
      soNumber,
      customer_id,
      warehouse_id,
      totalAmount,
      shipping_address || null,
      req.user?.id || null
    );

    for (const item of items) {
      const lineTotal = Number(item.quantity_ordered) * Number(item.unit_price);
      db.prepare(`
        INSERT INTO sales_order_items (
          id, tenant_id, so_id, product_id, quantity_ordered, quantity_shipped, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        uuidv4(),
        req.tenantId,
        soId,
        item.product_id,
        Number(item.quantity_ordered),
        Number(item.unit_price),
        lineTotal
      );
    }
  });

  try {
    createSOTx();

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE_SO',
      entityType: 'SALES_ORDER',
      entityId: soId,
      details: { soNumber, customer_id, totalAmount, itemsCount: items.length }
    });

    res.status(201).json({ success: true, so_id: soId, so_number: soNumber, message: 'Sales Order created & confirmed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fulfill / Ship Sales Order (Deducts Stock)
router.post('/sales/:id/fulfill', (req, res) => {
  const soId = req.params.id;

  const so = db.prepare('SELECT * FROM sales_orders WHERE id = ? AND tenant_id = ?').get(soId, req.tenantId);
  if (!so) return res.status(404).json({ error: 'Sales order not found' });
  if (so.status === 'SHIPPED' || so.status === 'DELIVERED') {
    return res.status(400).json({ error: 'Sales order has already been fulfilled/shipped' });
  }

  const items = db.prepare('SELECT * FROM sales_order_items WHERE so_id = ? AND tenant_id = ?').all(soId, req.tenantId);

  const fulfillTx = db.transaction(() => {
    for (const line of items) {
      const qtyToDeduct = line.quantity_ordered - line.quantity_shipped;
      if (qtyToDeduct <= 0) continue;

      // Deduct from stock levels
      let remaining = qtyToDeduct;
      const levels = db.prepare(`
        SELECT * FROM inventory_levels
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ? AND quantity_on_hand > 0
        ORDER BY expiry_date ASC, quantity_on_hand DESC
      `).all(req.tenantId, line.product_id, so.warehouse_id);

      for (const lvl of levels) {
        if (remaining <= 0) break;
        const deduct = Math.min(lvl.quantity_on_hand, remaining);
        db.prepare('UPDATE inventory_levels SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?').run(deduct, lvl.id);
        remaining -= deduct;
      }

      db.prepare('UPDATE sales_order_items SET quantity_shipped = quantity_ordered WHERE id = ?').run(line.id);

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, product_id, movement_type, quantity,
          from_warehouse_id, reference_type, reference_id, reason, performed_by_user_id
        ) VALUES (?, ?, ?, 'SO_FULFILLMENT', ?, ?, 'SALES_ORDER', ?, ?, ?)
      `).run(
        uuidv4(),
        req.tenantId,
        line.product_id,
        qtyToDeduct,
        so.warehouse_id,
        soId,
        `Fulfillment for SO ${so.so_number}`,
        req.user?.id || null
      );
    }

    db.prepare("UPDATE sales_orders SET status = 'SHIPPED' WHERE id = ?").run(soId);
  });

  try {
    fulfillTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'FULFILL_SO',
      entityType: 'SALES_ORDER',
      entityId: soId,
      details: { soNumber: so.so_number }
    });

    res.json({ success: true, message: `Sales Order ${so.so_number} marked as SHIPPED and stock deducted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

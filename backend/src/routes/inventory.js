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

// 1. Get Real-Time Inventory Stock Matrix
router.get('/levels', (req, res) => {
  const { warehouse_id, search, category_id, low_stock } = req.query;

  let query = `
    SELECT 
      il.id as level_id,
      il.product_id,
      p.name as product_name,
      p.sku,
      p.barcode,
      p.unit_of_measure,
      p.cost_price,
      p.selling_price,
      p.reorder_point,
      c.name as category_name,
      il.warehouse_id,
      w.name as warehouse_name,
      w.code as warehouse_code,
      il.location_id,
      l.bin_code,
      l.zone,
      il.batch_number,
      il.expiry_date,
      il.quantity_on_hand,
      il.quantity_reserved,
      (il.quantity_on_hand - il.quantity_reserved) as quantity_available,
      (il.quantity_on_hand * p.cost_price) as stock_valuation
    FROM inventory_levels il
    JOIN products p ON il.product_id = p.id
    JOIN warehouses w ON il.warehouse_id = w.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN locations l ON il.location_id = l.id
    WHERE il.tenant_id = ?
  `;

  const params = [req.tenantId];

  if (warehouse_id) {
    query += ` AND il.warehouse_id = ?`;
    params.push(warehouse_id);
  }

  if (category_id) {
    query += ` AND p.category_id = ?`;
    params.push(category_id);
  }

  if (search) {
    query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR il.batch_number LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (low_stock === 'true') {
    query += ` AND il.quantity_on_hand <= p.reorder_point`;
  }

  query += ` ORDER BY p.name ASC, w.name ASC`;

  const levels = db.prepare(query).all(...params);
  res.json({ levels, total_count: levels.length });
});

// 2. Stock In (Direct Receiving)
router.post('/stock-in', (req, res) => {
  const {
    product_id,
    warehouse_id,
    location_id,
    quantity,
    unit_cost,
    batch_number,
    expiry_date,
    reason = 'Standard Goods Receipt'
  } = req.body;

  if (!product_id || !warehouse_id || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Product, warehouse, and positive quantity are required' });
  }

  const numQty = Number(quantity);

  const stockInTx = db.transaction(() => {
    // 1. Check or update inventory level
    let existingLevel = db.prepare(`
      SELECT * FROM inventory_levels 
      WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ? 
        AND (location_id = ? OR (location_id IS NULL AND ? IS NULL))
        AND (batch_number = ? OR (batch_number IS NULL AND ? IS NULL))
    `).get(req.tenantId, product_id, warehouse_id, location_id || null, location_id || null, batch_number || null, batch_number || null);

    if (existingLevel) {
      db.prepare(`
        UPDATE inventory_levels 
        SET quantity_on_hand = quantity_on_hand + ?,
            expiry_date = COALESCE(?, expiry_date),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(numQty, expiry_date || null, existingLevel.id);
    } else {
      db.prepare(`
        INSERT INTO inventory_levels (
          id, tenant_id, product_id, warehouse_id, location_id,
          batch_number, expiry_date, quantity_on_hand, quantity_reserved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        uuidv4(),
        req.tenantId,
        product_id,
        warehouse_id,
        location_id || null,
        batch_number || null,
        expiry_date || null,
        numQty
      );
    }

    // 2. Record immutable stock movement
    const movementId = uuidv4();
    db.prepare(`
      INSERT INTO stock_movements (
        id, tenant_id, product_id, movement_type, quantity, unit_cost,
        to_warehouse_id, location_id, batch_number, reason, performed_by_user_id
      ) VALUES (?, ?, ?, 'STOCK_IN', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movementId,
      req.tenantId,
      product_id,
      numQty,
      Number(unit_cost) || 0,
      warehouse_id,
      location_id || null,
      batch_number || null,
      reason,
      req.user?.id || null
    );
  });

  try {
    stockInTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'STOCK_IN',
      entityType: 'INVENTORY',
      entityId: product_id,
      details: { product_id, warehouse_id, quantity: numQty, batch_number, reason }
    });

    res.json({ success: true, message: `Successfully received ${numQty} units into stock` });
  } catch (error) {
    console.error('Stock in error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Stock Out (Direct Dispatch / Consumption)
router.post('/stock-out', (req, res) => {
  const {
    product_id,
    warehouse_id,
    location_id,
    quantity,
    batch_number,
    reason = 'Dispatch / Damage / Internal Use'
  } = req.body;

  if (!product_id || !warehouse_id || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Product, warehouse, and positive quantity are required' });
  }

  const numQty = Number(quantity);

  const stockOutTx = db.transaction(() => {
    // Find matching stock level
    let existingLevel = db.prepare(`
      SELECT * FROM inventory_levels 
      WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
        AND (location_id = ? OR (location_id IS NULL AND ? IS NULL))
        AND (batch_number = ? OR (batch_number IS NULL AND ? IS NULL))
    `).get(req.tenantId, product_id, warehouse_id, location_id || null, location_id || null, batch_number || null, batch_number || null);

    if (!existingLevel || existingLevel.quantity_on_hand < numQty) {
      // If specific batch/bin doesn't have enough, check total in warehouse
      const totalInWarehouse = db.prepare(`
        SELECT SUM(quantity_on_hand) as total FROM inventory_levels
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      `).get(req.tenantId, product_id, warehouse_id)?.total || 0;

      if (totalInWarehouse < numQty) {
        throw new Error(`Insufficient stock in warehouse. Available: ${totalInWarehouse}, Requested: ${numQty}`);
      }
    }

    if (existingLevel && existingLevel.quantity_on_hand >= numQty) {
      db.prepare(`
        UPDATE inventory_levels 
        SET quantity_on_hand = quantity_on_hand - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(numQty, existingLevel.id);
    } else {
      // Deduct from available rows in warehouse
      let remainingToDeduct = numQty;
      const rows = db.prepare(`
        SELECT * FROM inventory_levels 
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ? AND quantity_on_hand > 0
        ORDER BY expiry_date ASC, quantity_on_hand DESC
      `).all(req.tenantId, product_id, warehouse_id);

      for (const row of rows) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(row.quantity_on_hand, remainingToDeduct);
        db.prepare(`UPDATE inventory_levels SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?`).run(deduct, row.id);
        remainingToDeduct -= deduct;
      }
    }

    // Record movement
    db.prepare(`
      INSERT INTO stock_movements (
        id, tenant_id, product_id, movement_type, quantity,
        from_warehouse_id, location_id, batch_number, reason, performed_by_user_id
      ) VALUES (?, ?, ?, 'STOCK_OUT', ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      req.tenantId,
      product_id,
      numQty,
      warehouse_id,
      location_id || null,
      batch_number || null,
      reason,
      req.user?.id || null
    );
  });

  try {
    stockOutTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'STOCK_OUT',
      entityType: 'INVENTORY',
      entityId: product_id,
      details: { product_id, warehouse_id, quantity: numQty, reason }
    });

    res.json({ success: true, message: `Successfully dispatched ${numQty} units` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Stock Adjustment (Physical Cycle Count Reconciliation)
router.post('/adjustment', (req, res) => {
  const {
    product_id,
    warehouse_id,
    new_quantity,
    reason = 'Inventory Cycle Count Reconciliation'
  } = req.body;

  if (!product_id || !warehouse_id || new_quantity === undefined) {
    return res.status(400).json({ error: 'Product, warehouse, and target new quantity are required' });
  }

  const targetQty = Math.max(0, Number(new_quantity));

  const adjustTx = db.transaction(() => {
    // Current stock sum
    const current = db.prepare(`
      SELECT COALESCE(SUM(quantity_on_hand), 0) as total FROM inventory_levels
      WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
    `).get(req.tenantId, product_id, warehouse_id)?.total || 0;

    const diff = targetQty - current;
    if (diff === 0) return;

    let primaryLevel = db.prepare(`
      SELECT * FROM inventory_levels 
      WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      LIMIT 1
    `).get(req.tenantId, product_id, warehouse_id);

    if (primaryLevel) {
      db.prepare(`
        UPDATE inventory_levels 
        SET quantity_on_hand = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(targetQty, primaryLevel.id);
    } else {
      db.prepare(`
        INSERT INTO inventory_levels (
          id, tenant_id, product_id, warehouse_id, quantity_on_hand, quantity_reserved
        ) VALUES (?, ?, ?, ?, ?, 0)
      `).run(uuidv4(), req.tenantId, product_id, warehouse_id, targetQty);
    }

    db.prepare(`
      INSERT INTO stock_movements (
        id, tenant_id, product_id, movement_type, quantity,
        from_warehouse_id, to_warehouse_id, reason, performed_by_user_id
      ) VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      req.tenantId,
      product_id,
      diff,
      diff < 0 ? warehouse_id : null,
      diff > 0 ? warehouse_id : null,
      `${reason} (Prior: ${current}, New: ${targetQty}, Diff: ${diff > 0 ? '+' : ''}${diff})`,
      req.user?.id || null
    );
  });

  try {
    adjustTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'INVENTORY',
      entityId: product_id,
      details: { product_id, warehouse_id, new_quantity: targetQty, reason }
    });

    res.json({ success: true, message: `Stock adjusted to ${targetQty} units` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Inter-Warehouse Transfers
router.get('/transfers', (req, res) => {
  const transfers = db.prepare(`
    SELECT 
      t.*,
      w_from.name as source_warehouse_name,
      w_to.name as destination_warehouse_name,
      (SELECT COUNT(*) FROM transfer_items ti WHERE ti.transfer_id = t.id) as item_count,
      (SELECT SUM(ti.quantity_requested) FROM transfer_items ti WHERE ti.transfer_id = t.id) as total_units
    FROM transfers t
    JOIN warehouses w_from ON t.source_warehouse_id = w_from.id
    JOIN warehouses w_to ON t.destination_warehouse_id = w_to.id
    WHERE t.tenant_id = ?
    ORDER BY t.created_at DESC
  `).all(req.tenantId);

  res.json({ transfers });
});

// Create Transfer
router.post('/transfers', (req, res) => {
  const {
    source_warehouse_id,
    destination_warehouse_id,
    notes,
    items // array of { product_id, quantity }
  } = req.body;

  if (!source_warehouse_id || !destination_warehouse_id || !items || !items.length) {
    return res.status(400).json({ error: 'Source warehouse, destination warehouse, and items are required' });
  }

  if (source_warehouse_id === destination_warehouse_id) {
    return res.status(400).json({ error: 'Source and destination warehouses cannot be the same' });
  }

  const transferId = uuidv4();
  const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

  const createTransferTx = db.transaction(() => {
    // Verify stock availability in source warehouse
    for (const item of items) {
      const stock = db.prepare(`
        SELECT COALESCE(SUM(quantity_on_hand), 0) as available
        FROM inventory_levels
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      `).get(req.tenantId, item.product_id, source_warehouse_id)?.available || 0;

      if (stock < Number(item.quantity)) {
        throw new Error(`Insufficient stock for product. Available: ${stock}, Requested for transfer: ${item.quantity}`);
      }
    }

    // Insert Transfer Header
    db.prepare(`
      INSERT INTO transfers (
        id, tenant_id, transfer_number, source_warehouse_id, destination_warehouse_id,
        status, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, 'IN_TRANSIT', ?, ?)
    `).run(
      transferId,
      req.tenantId,
      transferNumber,
      source_warehouse_id,
      destination_warehouse_id,
      notes || null,
      req.user?.id || null
    );

    // Insert Items and deduct from source warehouse
    for (const item of items) {
      const numQty = Number(item.quantity);
      db.prepare(`
        INSERT INTO transfer_items (id, tenant_id, transfer_id, product_id, quantity_requested, quantity_transferred)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), req.tenantId, transferId, item.product_id, numQty, numQty);

      // Deduct from source warehouse
      let remaining = numQty;
      const levels = db.prepare(`
        SELECT * FROM inventory_levels 
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ? AND quantity_on_hand > 0
        ORDER BY quantity_on_hand DESC
      `).all(req.tenantId, item.product_id, source_warehouse_id);

      for (const level of levels) {
        if (remaining <= 0) break;
        const deduct = Math.min(level.quantity_on_hand, remaining);
        db.prepare('UPDATE inventory_levels SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?').run(deduct, level.id);
        remaining -= deduct;
      }

      // Record Transfer Out Movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, product_id, movement_type, quantity,
          from_warehouse_id, to_warehouse_id, reference_type, reference_id, reason, performed_by_user_id
        ) VALUES (?, ?, ?, 'TRANSFER_OUT', ?, ?, ?, 'TRANSFER', ?, ?, ?)
      `).run(
        uuidv4(),
        req.tenantId,
        item.product_id,
        numQty,
        source_warehouse_id,
        destination_warehouse_id,
        transferId,
        `Inter-warehouse transfer ${transferNumber}`,
        req.user?.id || null
      );
    }
  });

  try {
    createTransferTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE_TRANSFER',
      entityType: 'TRANSFER',
      entityId: transferId,
      details: { transferNumber, source_warehouse_id, destination_warehouse_id, itemsCount: items.length }
    });

    res.status(201).json({ success: true, transfer_id: transferId, transfer_number: transferNumber, message: 'Transfer created and stock in transit' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete / Receive Transfer at Destination Warehouse
router.post('/transfers/:id/receive', (req, res) => {
  const transferId = req.params.id;

  const transfer = db.prepare(`
    SELECT * FROM transfers WHERE id = ? AND tenant_id = ?
  `).get(transferId, req.tenantId);

  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.status === 'RECEIVED') return res.status(400).json({ error: 'Transfer has already been received' });

  const items = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ? AND tenant_id = ?').all(transferId, req.tenantId);

  const receiveTx = db.transaction(() => {
    for (const item of items) {
      // Add to destination warehouse
      const existing = db.prepare(`
        SELECT * FROM inventory_levels
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
        LIMIT 1
      `).get(req.tenantId, item.product_id, transfer.destination_warehouse_id);

      if (existing) {
        db.prepare(`UPDATE inventory_levels SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?`).run(item.quantity_transferred, existing.id);
      } else {
        db.prepare(`
          INSERT INTO inventory_levels (id, tenant_id, product_id, warehouse_id, quantity_on_hand, quantity_reserved)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(uuidv4(), req.tenantId, item.product_id, transfer.destination_warehouse_id, item.quantity_transferred);
      }

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, product_id, movement_type, quantity,
          from_warehouse_id, to_warehouse_id, reference_type, reference_id, reason, performed_by_user_id
        ) VALUES (?, ?, ?, 'TRANSFER_IN', ?, ?, ?, 'TRANSFER', ?, ?, ?)
      `).run(
        uuidv4(),
        req.tenantId,
        item.product_id,
        item.quantity_transferred,
        transfer.source_warehouse_id,
        transfer.destination_warehouse_id,
        transferId,
        `Received transfer ${transfer.transfer_number}`,
        req.user?.id || null
      );
    }

    db.prepare(`
      UPDATE transfers 
      SET status = 'RECEIVED', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(transferId);
  });

  try {
    receiveTx();
    refreshInventoryAlerts(req.tenantId);

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'RECEIVE_TRANSFER',
      entityType: 'TRANSFER',
      entityId: transferId,
      details: { transferNumber: transfer.transfer_number }
    });

    res.json({ success: true, message: `Transfer ${transfer.transfer_number} marked as RECEIVED and inventory updated` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get Movements Ledger
router.get('/movements', (req, res) => {
  const { product_id, movement_type, warehouse_id, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      sm.*,
      p.name as product_name,
      p.sku,
      p.unit_of_measure,
      w_from.name as from_warehouse_name,
      w_to.name as to_warehouse_name,
      u.name as user_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN warehouses w_from ON sm.from_warehouse_id = w_from.id
    LEFT JOIN warehouses w_to ON sm.to_warehouse_id = w_to.id
    LEFT JOIN users u ON sm.performed_by_user_id = u.id
    WHERE sm.tenant_id = ?
  `;

  const params = [req.tenantId];

  if (product_id) {
    query += ` AND sm.product_id = ?`;
    params.push(product_id);
  }

  if (movement_type) {
    query += ` AND sm.movement_type = ?`;
    params.push(movement_type);
  }

  if (warehouse_id) {
    query += ` AND (sm.from_warehouse_id = ? OR sm.to_warehouse_id = ?)`;
    params.push(warehouse_id, warehouse_id);
  }

  query += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const movements = db.prepare(query).all(...params);
  res.json({ movements });
});

export default router;

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

// 1. Get Categories
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.tenant_id = c.tenant_id) as product_count
    FROM categories c
    WHERE c.tenant_id = ?
    ORDER BY c.name ASC
  `).all(req.tenantId);

  res.json({ categories });
});

// Create Category
router.post('/categories', (req, res) => {
  const { name, description, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO categories (id, tenant_id, name, description, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.tenantId, name.trim(), description || null, parent_id || null);

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json({ category });
});

// 2. Get All Products with aggregated stock, category name, status
router.get('/', (req, res) => {
  const { search, category_id, stock_status, brand, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      p.*,
      c.name as category_name,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_stock,
      COALESCE(SUM(il.quantity_reserved), 0) as total_reserved,
      (COALESCE(SUM(il.quantity_on_hand), 0) - COALESCE(SUM(il.quantity_reserved), 0)) as available_stock,
      (COALESCE(SUM(il.quantity_on_hand), 0) * p.cost_price) as total_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory_levels il ON p.id = il.product_id AND il.tenant_id = p.tenant_id
    WHERE p.tenant_id = ?
  `;

  const params = [req.tenantId];

  if (search) {
    query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (category_id) {
    query += ` AND p.category_id = ?`;
    params.push(category_id);
  }

  if (brand) {
    query += ` AND p.brand = ?`;
    params.push(brand);
  }

  query += ` GROUP BY p.id`;

  if (stock_status === 'OUT_OF_STOCK') {
    query += ` HAVING total_stock <= 0`;
  } else if (stock_status === 'LOW_STOCK') {
    query += ` HAVING total_stock > 0 AND total_stock <= p.reorder_point`;
  } else if (stock_status === 'IN_STOCK') {
    query += ` HAVING total_stock > p.reorder_point`;
  }

  query += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const products = db.prepare(query).all(...params);

  // Attach warehouse breakdown for each product
  const getWarehouseBreakdownStmt = db.prepare(`
    SELECT il.warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
           il.quantity_on_hand, il.quantity_reserved, il.batch_number, il.expiry_date
    FROM inventory_levels il
    JOIN warehouses w ON il.warehouse_id = w.id
    WHERE il.product_id = ? AND il.tenant_id = ?
  `);

  const enriched = products.map(prod => ({
    ...prod,
    warehouse_stock: getWarehouseBreakdownStmt.all(prod.id, req.tenantId)
  }));

  res.json({ products: enriched, count: enriched.length });
});

// 3. Lookup Product by Barcode or SKU
router.get('/lookup/:code', (req, res) => {
  const code = req.params.code.trim();

  const product = db.prepare(`
    SELECT 
      p.*,
      c.name as category_name,
      COALESCE(SUM(il.quantity_on_hand), 0) as total_stock,
      (COALESCE(SUM(il.quantity_on_hand), 0) - COALESCE(SUM(il.quantity_reserved), 0)) as available_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory_levels il ON p.id = il.product_id AND il.tenant_id = p.tenant_id
    WHERE p.tenant_id = ? AND (p.barcode = ? OR p.sku = ?)
    GROUP BY p.id
  `).get(req.tenantId, code, code);

  if (!product) {
    return res.status(404).json({ error: `Product with barcode or SKU '${code}' not found` });
  }

  const stockByWarehouse = db.prepare(`
    SELECT il.*, w.name as warehouse_name, w.code as warehouse_code
    FROM inventory_levels il
    JOIN warehouses w ON il.warehouse_id = w.id
    WHERE il.product_id = ? AND il.tenant_id = ?
  `).all(product.id, req.tenantId);

  res.json({ product: { ...product, warehouse_stock: stockByWarehouse } });
});

// 4. Get single product by ID
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.tenant_id = ?
  `).get(req.params.id, req.tenantId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const stock = db.prepare(`
    SELECT il.*, w.name as warehouse_name, w.code as warehouse_code, l.bin_code
    FROM inventory_levels il
    JOIN warehouses w ON il.warehouse_id = w.id
    LEFT JOIN locations l ON il.location_id = l.id
    WHERE il.product_id = ? AND il.tenant_id = ?
  `).all(product.id, req.tenantId);

  const movements = db.prepare(`
    SELECT sm.*, w_from.name as from_warehouse_name, w_to.name as to_warehouse_name
    FROM stock_movements sm
    LEFT JOIN warehouses w_from ON sm.from_warehouse_id = w_from.id
    LEFT JOIN warehouses w_to ON sm.to_warehouse_id = w_to.id
    WHERE sm.product_id = ? AND sm.tenant_id = ?
    ORDER BY sm.created_at DESC
    LIMIT 20
  `).all(product.id, req.tenantId);

  res.json({ product, stock, movements });
});

// 5. Create Product
router.post('/', (req, res) => {
  const {
    name,
    sku,
    barcode,
    category_id,
    brand,
    unit_of_measure = 'pcs',
    cost_price = 0,
    selling_price = 0,
    reorder_point = 10,
    reorder_quantity = 50,
    description,
    image_url,
    initial_warehouse_id,
    initial_quantity = 0
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  // Auto-generate SKU if not provided
  const generatedSku = sku ? sku.trim().toUpperCase() : `SKU-${Date.now().toString().slice(-6)}`;
  // Auto-generate barcode if not provided
  const generatedBarcode = barcode ? barcode.trim() : `88${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  // Check SKU uniqueness per tenant
  const existing = db.prepare('SELECT id FROM products WHERE tenant_id = ? AND sku = ?').get(req.tenantId, generatedSku);
  if (existing) {
    return res.status(400).json({ error: `A product with SKU '${generatedSku}' already exists in this tenant` });
  }

  const productId = uuidv4();

  const insertProductTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO products (
        id, tenant_id, name, sku, barcode, category_id, brand,
        unit_of_measure, cost_price, selling_price, reorder_point,
        reorder_quantity, description, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      productId,
      req.tenantId,
      name.trim(),
      generatedSku,
      generatedBarcode,
      category_id || null,
      brand || null,
      unit_of_measure,
      Number(cost_price) || 0,
      Number(selling_price) || 0,
      Number(reorder_point) || 0,
      Number(reorder_quantity) || 0,
      description || null,
      image_url || null
    );

    // If initial stock is specified
    if (initial_warehouse_id && Number(initial_quantity) > 0) {
      const invId = uuidv4();
      db.prepare(`
        INSERT INTO inventory_levels (
          id, tenant_id, product_id, warehouse_id, quantity_on_hand, quantity_reserved
        ) VALUES (?, ?, ?, ?, ?, 0)
      `).run(invId, req.tenantId, productId, initial_warehouse_id, Number(initial_quantity));

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, product_id, movement_type, quantity, unit_cost,
          to_warehouse_id, reason, performed_by_user_id
        ) VALUES (?, ?, ?, 'STOCK_IN', ?, ?, ?, 'Initial Stock Setup', ?)
      `).run(
        uuidv4(),
        req.tenantId,
        productId,
        Number(initial_quantity),
        Number(cost_price) || 0,
        initial_warehouse_id,
        req.user ? req.user.id : null
      );
    }
  });

  try {
    insertProductTx();

    logAudit({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: productId,
      details: { name, sku: generatedSku, cost_price, selling_price }
    });

    refreshInventoryAlerts(req.tenantId);

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json({ product: created, message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Product
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    barcode,
    category_id,
    brand,
    unit_of_measure,
    cost_price,
    selling_price,
    reorder_point,
    reorder_quantity,
    description,
    image_url,
    is_active
  } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      barcode = COALESCE(?, barcode),
      category_id = COALESCE(?, category_id),
      brand = COALESCE(?, brand),
      unit_of_measure = COALESCE(?, unit_of_measure),
      cost_price = COALESCE(?, cost_price),
      selling_price = COALESCE(?, selling_price),
      reorder_point = COALESCE(?, reorder_point),
      reorder_quantity = COALESCE(?, reorder_quantity),
      description = COALESCE(?, description),
      image_url = COALESCE(?, image_url),
      is_active = COALESCE(?, is_active)
    WHERE id = ? AND tenant_id = ?
  `).run(
    name,
    barcode,
    category_id,
    brand,
    unit_of_measure,
    cost_price !== undefined ? Number(cost_price) : null,
    selling_price !== undefined ? Number(selling_price) : null,
    reorder_point !== undefined ? Number(reorder_point) : null,
    reorder_quantity !== undefined ? Number(reorder_quantity) : null,
    description,
    image_url,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id,
    req.tenantId
  );

  refreshInventoryAlerts(req.tenantId);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ product: updated, message: 'Product updated successfully' });
});

// 7. Delete Product
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Delete product and associated inventory
  db.prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user?.id,
    action: 'DELETE_PRODUCT',
    entityType: 'PRODUCT',
    entityId: id,
    details: { name: product.name, sku: product.sku }
  });

  res.json({ message: 'Product deleted successfully' });
});

export default router;

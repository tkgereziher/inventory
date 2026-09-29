import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'inventory.db');
const db = new Database(dbPath);

// Enable Foreign Keys & WAL mode for ultra-fast concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Tenants table
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'ENTERPRISE',
      settings_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users table with tenant scoping
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'AUDITOR')) DEFAULT 'MANAGER',
      avatar_url TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, email)
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Warehouses
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      address TEXT,
      city TEXT,
      country TEXT,
      capacity_sqm REAL DEFAULT 1000,
      manager_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, code)
    );

    -- Warehouse Storage Locations / Bins
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      zone TEXT NOT NULL,
      aisle TEXT,
      rack TEXT,
      bin_code TEXT NOT NULL,
      max_capacity REAL DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, warehouse_id, bin_code)
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      tax_id TEXT,
      payment_terms TEXT,
      rating REAL DEFAULT 5.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      barcode TEXT,
      category_id TEXT,
      brand TEXT,
      unit_of_measure TEXT DEFAULT 'pcs',
      cost_price REAL NOT NULL DEFAULT 0.0,
      selling_price REAL NOT NULL DEFAULT 0.0,
      reorder_point INTEGER DEFAULT 10,
      reorder_quantity INTEGER DEFAULT 50,
      description TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      UNIQUE(tenant_id, sku)
    );

    -- Inventory Levels per Warehouse / Location / Batch
    CREATE TABLE IF NOT EXISTS inventory_levels (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      location_id TEXT,
      batch_number TEXT,
      expiry_date DATE,
      quantity_on_hand REAL NOT NULL DEFAULT 0,
      quantity_reserved REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
    );

    -- Stock Movements (Full Immutable Ledger)
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN (
        'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN',
        'PO_RECEIPT', 'SO_FULFILLMENT', 'RETURN'
      )),
      quantity REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      from_warehouse_id TEXT,
      to_warehouse_id TEXT,
      location_id TEXT,
      batch_number TEXT,
      reference_type TEXT,
      reference_id TEXT,
      reason TEXT,
      performed_by_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
      FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
    );

    -- Purchase Orders (Inbound Procurement)
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      po_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      order_date DATE DEFAULT (DATE('now')),
      expected_date DATE,
      status TEXT CHECK(status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED')) DEFAULT 'DRAFT',
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
      UNIQUE(tenant_id, po_number)
    );

    -- Purchase Order Line Items
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      po_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_ordered REAL NOT NULL,
      quantity_received REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    -- Sales Orders (Outbound Fulfillment)
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      so_number TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      order_date DATE DEFAULT (DATE('now')),
      status TEXT CHECK(status IN ('DRAFT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED')) DEFAULT 'DRAFT',
      total_amount REAL DEFAULT 0,
      shipping_address TEXT,
      created_by_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
      UNIQUE(tenant_id, so_number)
    );

    -- Sales Order Line Items
    CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      so_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_ordered REAL NOT NULL,
      quantity_shipped REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    -- Inter-warehouse Transfers
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      transfer_number TEXT NOT NULL,
      source_warehouse_id TEXT NOT NULL,
      destination_warehouse_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')) DEFAULT 'DRAFT',
      tracking_ref TEXT,
      notes TEXT,
      created_by_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
      FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
      UNIQUE(tenant_id, transfer_number)
    );

    -- Transfer Items
    CREATE TABLE IF NOT EXISTS transfer_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      transfer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_requested REAL NOT NULL,
      quantity_transferred REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Low Stock & Expiry Alerts
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRING_SOON', 'OVERSTOCK')) NOT NULL,
      product_id TEXT,
      warehouse_id TEXT,
      message TEXT NOT NULL,
      severity TEXT CHECK(severity IN ('HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
    );

    -- Subscription Plans definition
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      price_etb REAL NOT NULL,
      price_usd REAL NOT NULL,
      billing_interval TEXT DEFAULT 'MONTHLY',
      max_users INTEGER DEFAULT 5,
      max_warehouses INTEGER DEFAULT 2,
      max_products INTEGER DEFAULT 500,
      features_json TEXT,
      is_popular INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    -- Tenant Subscriptions
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED')) DEFAULT 'ACTIVE',
      billing_cycle TEXT CHECK(billing_cycle IN ('MONTHLY', 'ANNUAL')) DEFAULT 'MONTHLY',
      current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_period_end DATETIME,
      cancel_at_period_end INTEGER DEFAULT 0,
      last_payment_tx_ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Payments & Chapa Transactions Ledger
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      tx_ref TEXT UNIQUE NOT NULL,
      chapa_reference TEXT,
      plan_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'ETB',
      payment_method TEXT DEFAULT 'CHAPA',
      payment_channel TEXT, -- e.g. telebirr, cbebirr, awash, card
      status TEXT CHECK(status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      meta_json TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id, sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(tenant_id, barcode);
    CREATE INDEX IF NOT EXISTS idx_inventory_tenant_prod_wh ON inventory_levels(tenant_id, product_id, warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_movements_tenant ON stock_movements(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_so_tenant ON sales_orders(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_transfers_tenant ON transfers(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts(tenant_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON payments(tx_ref);
    CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
  `);
}

export default db;

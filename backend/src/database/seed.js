import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../config/database.js';
import { refreshInventoryAlerts } from '../services/alertService.js';

export function seed() {
  console.log('🌱 Starting comprehensive database seeding...');
  initDatabase();

  // Clean existing data
  db.exec(`
    DELETE FROM alerts;
    DELETE FROM audit_logs;
    DELETE FROM transfer_items;
    DELETE FROM transfers;
    DELETE FROM sales_order_items;
    DELETE FROM sales_orders;
    DELETE FROM purchase_order_items;
    DELETE FROM purchase_orders;
    DELETE FROM stock_movements;
    DELETE FROM inventory_levels;
    DELETE FROM locations;
    DELETE FROM products;
    DELETE FROM customers;
    DELETE FROM suppliers;
    DELETE FROM categories;
    DELETE FROM users;
    DELETE FROM warehouses;
    DELETE FROM tenants;
  `);

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // ========================================================
  // TENANT 1: Apex Global Electronics
  // ========================================================
  const tenant1Id = 'tenant-apex-101';
  db.prepare(`
    INSERT INTO tenants (id, name, slug, plan, settings_json)
    VALUES (?, 'Apex Global Electronics', 'apex-electronics', 'ENTERPRISE', ?)
  `).run(tenant1Id, JSON.stringify({ currency: 'USD', country: 'US', timezone: 'America/New_York' }));

  // Tenant 1 Users
  const userApexAdmin = 'user-apex-01';
  db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role)
    VALUES (?, ?, 'Sarah Connor (Admin)', 'admin@apex.com', ?, 'TENANT_ADMIN')
  `).run(userApexAdmin, tenant1Id, passwordHash);

  db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role)
    VALUES (?, ?, 'Marcus Vance (Manager)', 'manager@apex.com', ?, 'MANAGER')
  `).run(uuidv4(), tenant1Id, passwordHash);

  // Tenant 1 Warehouses
  const apexWh1 = 'wh-apex-main';
  const apexWh2 = 'wh-apex-west';
  db.prepare(`
    INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm, manager_name)
    VALUES (?, ?, 'Apex Silicon Valley Hub', 'WH-SVO1', 'San Jose', 'USA', 12500, 'Marcus Vance')
  `).run(apexWh1, tenant1Id);

  db.prepare(`
    INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm, manager_name)
    VALUES (?, ?, 'Apex Texas Distribution', 'WH-ATX2', 'Austin', 'USA', 8000, 'David Kim')
  `).run(apexWh2, tenant1Id);

  // Tenant 1 Categories
  const catSemi = uuidv4();
  const catSensors = uuidv4();
  const catDisplays = uuidv4();
  const catRobotics = uuidv4();

  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catSemi, tenant1Id, 'Semiconductors & MCUs');
  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catSensors, tenant1Id, 'IoT & Sensor Modules');
  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catDisplays, tenant1Id, 'OLED & Touch Displays');
  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catRobotics, tenant1Id, 'Robotics & Actuators');

  // Tenant 1 Suppliers
  const supApex1 = uuidv4();
  const supApex2 = uuidv4();
  db.prepare(`
    INSERT INTO suppliers (id, tenant_id, name, contact_name, email, phone, payment_terms, rating)
    VALUES (?, ?, 'TSMC Components Ltd', 'Kao Chen', 'orders@tsmc-dist.com', '+886-3-567-8888', 'Net 30', 4.9)
  `).run(supApex1, tenant1Id);

  db.prepare(`
    INSERT INTO suppliers (id, tenant_id, name, contact_name, email, phone, payment_terms, rating)
    VALUES (?, ?, 'Sony Semiconductor Global', 'Kenji Sato', 'sales@sony-semi.jp', '+81-3-6744-1111', 'Net 45', 4.8)
  `).run(supApex2, tenant1Id);

  // Tenant 1 Customers
  const custApex1 = uuidv4();
  const custApex2 = uuidv4();
  db.prepare(`
    INSERT INTO customers (id, tenant_id, name, contact_name, email, phone, address)
    VALUES (?, ?, 'Tesla Energy Systems', 'Elon M.', 'procure@tesla.com', '+1-512-555-0199', 'Austin, TX')
  `).run(custApex1, tenant1Id);

  db.prepare(`
    INSERT INTO customers (id, tenant_id, name, contact_name, email, phone, address)
    VALUES (?, ?, 'Boston Dynamics Labs', 'Rachel Green', 'ops@bostondynamics.com', '+1-617-555-0144', 'Waltham, MA')
  `).run(custApex2, tenant1Id);

  // Tenant 1 Products
  const apexProducts = [
    { id: uuidv4(), name: 'ARM Cortex-M7 Core Processor', sku: 'APX-MCU-M70', barcode: '880192837401', cat: catSemi, cost: 14.50, sell: 28.00, reorder: 50, wh1_qty: 450, wh2_qty: 120 },
    { id: uuidv4(), name: 'Ultra-Precision LiDAR Scanner Mod', sku: 'APX-LIDAR-V4', barcode: '880192837402', cat: catSensors, cost: 120.00, sell: 249.99, reorder: 20, wh1_qty: 65, wh2_qty: 15 },
    { id: uuidv4(), name: '6.7" Super-AMOLED 120Hz Panel', sku: 'APX-DISP-67A', barcode: '880192837403', cat: catDisplays, cost: 42.00, sell: 89.00, reorder: 40, wh1_qty: 8, wh2_qty: 4 }, // LOW STOCK ALERT
    { id: uuidv4(), name: 'Brushless Servo Motor 48V 10Nm', sku: 'APX-SRV-4810', barcode: '880192837404', cat: catRobotics, cost: 85.00, sell: 175.00, reorder: 25, wh1_qty: 0, wh2_qty: 0 }, // OUT OF STOCK
    { id: uuidv4(), name: 'Wi-Fi 7 + Bluetooth 5.4 Comms Chip', sku: 'APX-WIFI-700', barcode: '880192837405', cat: catSemi, cost: 6.20, sell: 14.99, reorder: 100, wh1_qty: 1200, wh2_qty: 600 },
    { id: uuidv4(), name: '6-Axis IMU Gyroscope & Accel', sku: 'APX-IMU-6050', barcode: '880192837406', cat: catSensors, cost: 2.80, sell: 7.50, reorder: 150, wh1_qty: 2400, wh2_qty: 800 }
  ];

  for (const p of apexProducts) {
    db.prepare(`
      INSERT INTO products (
        id, tenant_id, name, sku, barcode, category_id, brand, unit_of_measure,
        cost_price, selling_price, reorder_point, reorder_quantity, description
      ) VALUES (?, ?, ?, ?, ?, ?, 'ApexTech', 'pcs', ?, ?, ?, 100, 'Industrial grade precision hardware component')
    `).run(p.id, tenant1Id, p.name, p.sku, p.barcode, p.cat, p.cost, p.sell, p.reorder);

    if (p.wh1_qty > 0) {
      db.prepare(`
        INSERT INTO inventory_levels (id, tenant_id, product_id, warehouse_id, batch_number, quantity_on_hand, quantity_reserved)
        VALUES (?, ?, ?, ?, 'BAT-2026-A1', ?, 0)
      `).run(uuidv4(), tenant1Id, p.id, apexWh1, p.wh1_qty);

      db.prepare(`
        INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity, unit_cost, to_warehouse_id, batch_number, reason, performed_by_user_id)
        VALUES (?, ?, ?, 'STOCK_IN', ?, ?, ?, 'BAT-2026-A1', 'Initial Setup & Intake', ?)
      `).run(uuidv4(), tenant1Id, p.id, p.wh1_qty, p.cost, apexWh1, userApexAdmin);
    }

    if (p.wh2_qty > 0) {
      db.prepare(`
        INSERT INTO inventory_levels (id, tenant_id, product_id, warehouse_id, batch_number, quantity_on_hand, quantity_reserved)
        VALUES (?, ?, ?, ?, 'BAT-2026-A2', ?, 0)
      `).run(uuidv4(), tenant1Id, p.id, apexWh2, p.wh2_qty);
    }
  }

  // ========================================================
  // TENANT 2: GreenLeaf Organics & FMCG
  // ========================================================
  const tenant2Id = 'tenant-greenleaf-202';
  db.prepare(`
    INSERT INTO tenants (id, name, slug, plan, settings_json)
    VALUES (?, 'GreenLeaf Organics & FMCG', 'greenleaf-organics', 'ENTERPRISE', ?)
  `).run(tenant2Id, JSON.stringify({ currency: 'USD', country: 'US', timezone: 'America/Chicago' }));

  db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role)
    VALUES (?, ?, 'Elena Rostova (Admin)', 'admin@greenleaf.com', ?, 'TENANT_ADMIN')
  `).run(uuidv4(), tenant2Id, passwordHash);

  const glWh1 = uuidv4();
  db.prepare(`
    INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm, manager_name)
    VALUES (?, ?, 'Midwest Cold Storage & Distribution', 'WH-COLD-01', 'Chicago', 'USA', 6500, 'Elena Rostova')
  `).run(glWh1, tenant2Id);

  const catDairy = uuidv4();
  const catProduce = uuidv4();
  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catDairy, tenant2Id, 'Dairy & Plant Milks');
  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catProduce, tenant2Id, 'Organic Fresh Produce');

  const glProducts = [
    { id: uuidv4(), name: 'Organic Cold-Pressed Almond Milk 1L', sku: 'GL-ALM-100', barcode: '770112233441', cat: catDairy, cost: 1.80, sell: 4.49, reorder: 100, qty: 850, exp: '2026-10-15' },
    { id: uuidv4(), name: 'Fairtrade Organic Arabica Beans 1kg', sku: 'GL-COF-001', barcode: '770112233442', cat: catProduce, cost: 8.50, sell: 18.99, reorder: 50, qty: 420, exp: '2027-01-20' },
    { id: uuidv4(), name: 'Raw Honeycomb Glass Jar 500g', sku: 'GL-HNY-500', barcode: '770112233443', cat: catProduce, cost: 5.20, sell: 12.50, reorder: 40, qty: 15, exp: '2027-06-30' } // Low stock
  ];

  for (const p of glProducts) {
    db.prepare(`
      INSERT INTO products (
        id, tenant_id, name, sku, barcode, category_id, brand, unit_of_measure,
        cost_price, selling_price, reorder_point, reorder_quantity, description
      ) VALUES (?, ?, ?, ?, ?, ?, 'GreenLeaf', 'unit', ?, ?, ?, 100, 'Certified USDA Organic FMCG product')
    `).run(p.id, tenant2Id, p.name, p.sku, p.barcode, p.cat, p.cost, p.sell, p.reorder);

    db.prepare(`
      INSERT INTO inventory_levels (id, tenant_id, product_id, warehouse_id, batch_number, expiry_date, quantity_on_hand, quantity_reserved)
      VALUES (?, ?, ?, ?, 'LOT-GL-99', ?, ?, 0)
    `).run(uuidv4(), tenant2Id, p.id, glWh1, p.exp, p.qty);
  }

  // ========================================================
  // TENANT 3: Titan Heavy Machinery & Industrial Tools
  // ========================================================
  const tenant3Id = 'tenant-titan-303';
  db.prepare(`
    INSERT INTO tenants (id, name, slug, plan, settings_json)
    VALUES (?, 'Titan Heavy Machinery & Industrial', 'titan-industrial', 'ENTERPRISE', ?)
  `).run(tenant3Id, JSON.stringify({ currency: 'USD', country: 'DE', timezone: 'Europe/Berlin' }));

  db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role)
    VALUES (?, ?, 'Hans Weber (Admin)', 'admin@titan.com', ?, 'TENANT_ADMIN')
  `).run(uuidv4(), tenant3Id, passwordHash);

  const titanWh1 = uuidv4();
  db.prepare(`
    INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm, manager_name)
    VALUES (?, ?, 'Frankfurt Central Logistics Hub', 'WH-FRA-01', 'Frankfurt', 'Germany', 22000, 'Hans Weber')
  `).run(titanWh1, tenant3Id);

  const catHydraulics = uuidv4();
  db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catHydraulics, tenant3Id, 'Hydraulic Systems');

  const titanProd1 = uuidv4();
  db.prepare(`
    INSERT INTO products (id, tenant_id, name, sku, barcode, category_id, brand, unit_of_measure, cost_price, selling_price, reorder_point, reorder_quantity, description)
    VALUES (?, ?, 'High-Pressure Hydraulic Cylinder 250bar', 'TTN-HYD-250', '990182736451', ?, 'TitanPower', 'unit', 340.00, 720.00, 10, 20, 'Heavy industrial hydraulic cylinder')
  `).run(titanProd1, tenant3Id, catHydraulics);

  db.prepare(`
    INSERT INTO inventory_levels (id, tenant_id, product_id, warehouse_id, batch_number, quantity_on_hand, quantity_reserved)
    VALUES (?, ?, ?, ?, 'BATCH-TTN-01', 48, 0)
  `).run(uuidv4(), tenant3Id, titanProd1, titanWh1);

  // Generate Alerts across all tenants
  refreshInventoryAlerts(tenant1Id);
  refreshInventoryAlerts(tenant2Id);
  refreshInventoryAlerts(tenant3Id);

  console.log('✅ Database seeded successfully with multi-tenant data!');
  console.log('🔑 Default credentials for all demo tenants:');
  console.log('   Apex Global:       admin@apex.com / Password123!');
  console.log('   GreenLeaf Organics: admin@greenleaf.com / Password123!');
  console.log('   Titan Industrial:  admin@titan.com / Password123!');
}

// Run if called directly
seed();

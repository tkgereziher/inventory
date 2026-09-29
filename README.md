# OmniStock — High-Performance Multi-Tenant Inventory Management System

A production-grade, fast, lightweight multi-tenant Inventory Management & ERP platform with a **modern light design system**, public marketing & verification portal, React Router client routing, Chapa payment gateway integration (Telebirr, CBE Birr, Awash, Cards), multi-tier subscription plans, row-level data partitioning, real-time stock matrix tracking, barcode & QR scanner integration, automated low-stock and batch expiry alerts, and full purchase/sales order lifecycles.

---

## 🌟 Key Architecture & Highlights

- **Light Modern Theme**: Crisp slate-50 canvas, clean white surfaces, subtle borders, high contrast readability, and refined emerald accents.
- **Client Routing with React Router**:
  - `/` — Public Marketing & Landing Portal (Hero, Live SKU Barcode Tracker, Features, Pricing Plans & Chapa trust badges).
  - `/pricing` — Dedicated Subscription Plans & Feature Matrix with Monthly/Annual toggle and ETB / USD currency switcher.
  - `/checkout` / `/subscribe` — Multi-step Tenant Onboarding & frictionless Chapa Checkout.
  - `/payment/callback` — Chapa transaction status verification & receipt confirmation screen.
  - `/verify-sku` — Standalone Public SKU & Global Barcode Tracker with deep-linking.
  - `/login` / `/portal-select` — Dedicated Tenant Gateway Selection & Sign In.
  - `/app/:tab` — Authenticated Workspace (`dashboard`, `products`, `warehouses`, `operations`, `purchase-orders`, `sales-orders`, `barcode-station`, `alerts`, `audit`, `settings`).
- **Chapa Payment Gateway Integration (Ethiopia & Global)**:
  - Supports **Telebirr**, **CBE Birr**, **Awash Birr**, and **Visa / Mastercard**.
  - Dual Mode: Seamless live gateway redirect when `CHAPA_SECRET_KEY` is provided, plus an interactive test simulator with instant OTP verification and token issuance.
  - Auto-provisions tenant partitions, default warehouses, categories, and administrator credentials upon successful payment verification.
- **Subscription Tiers & Quota Controls**:
  - **Starter Tier** (1,499 ETB / mo | $29 / mo): 1 Warehouse, 3 Users, 500 SKUs.
  - **Growth Professional** (3,999 ETB / mo | $79 / mo): 5 Warehouses, 15 Users, 5,000 SKUs, Automated Inter-warehouse Routing, Barcode Station, Audit Ledger.
  - **Enterprise Logistics** (8,999 ETB / mo | $179 / mo): Unlimited Warehouses, Users, SKUs, Dedicated Sharding, Webhooks, and SLA.
  - 14-Day Pro Free Trial available with zero credit card required.
- **Multi-Tenant Architecture**: Strict row-level partition isolation via indexed `tenant_id`. Seamless 1-click organization switcher.
- **Fast Lightweight Backend**: Built on Node.js + Express with high-throughput SQLite (`better-sqlite3` in WAL mode) and automated migrations.
- **Real-Time Inventory Operations**:
  - **Stock In (Goods Receipt)**: Batch & expiration date logging.
  - **Stock Out (Dispatch)**: Automated deduction with reason codes.
  - **Physical Cycle Count Adjustment**: Real-time discrepancy balancing.
  - **Inter-Warehouse Transfers**: In-transit state flow (`IN_TRANSIT` ➔ `RECEIVED`).
- **Procurement & Fulfillment**:
  - **Purchase Orders (Inbound)**: Multi-line procurement with automated stock intake.
  - **Sales Orders (Outbound)**: Client orders with automated stock reservation and shipment deduction.
- **Barcode & QR Hub**:
  - Live webcam barcode scanning via `html5-qrcode`.
  - Printable SVG & QR code asset stickers.
  - Rapid scan-to-receive and scan-to-dispatch.
- **Automated Alerts Center**: Safety reorder point threshold monitoring and batch expiry warnings with 1-click replenishment PO generation.
- **Immutable Audit Trail Ledger**: Compliance logs with user attribution and previous vs. new stock state.

---

## 🚀 Quick Start & Running Locally

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Seed Demo Multi-Tenant Data & Subscription Plans
```bash
npm run seed
```

### 3. Launch Development Server (Both Backend & Frontend)
```bash
npm run dev
```

- **Public Website & Portal**: [http://localhost:5173](http://localhost:5173)
- **Pricing & Subscription Plans**: [http://localhost:5173/pricing](http://localhost:5173/pricing)
- **Chapa Tenant Checkout**: [http://localhost:5173/checkout?plan=PRO](http://localhost:5173/checkout?plan=PRO)
- **Public SKU Tracker**: [http://localhost:5173/verify-sku](http://localhost:5173/verify-sku)
- **Tenant Portal Gateway**: [http://localhost:5173/login](http://localhost:5173/login)
- **Backend REST API**: [http://localhost:5000/api](http://localhost:5000/api)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🏢 Pre-Seeded Demo Tenants & Accounts

All seeded demo accounts use password: `Password123!`

| Tenant Organization | Industry | Demo Admin Email | Feature Focus |
|---|---|---|---|
| **Apex Global Electronics** | High-Tech / Semiconductors | `admin@apex.com` | Microcontrollers, LiDAR, Sensors |
| **GreenLeaf Organics & FMCG** | Food & Perishables | `admin@greenleaf.com` | Cold storage, Batch expiry tracking |
| **Titan Industrial Machinery** | Heavy Machinery & Parts | `admin@titan.com` | Heavy parts, Industrial cylinders |

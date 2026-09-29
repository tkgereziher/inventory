# OmniStock — High-Performance Multi-Tenant Inventory Management System

A production-grade, fast, lightweight multi-tenant Inventory Management & ERP platform with row-level data partitioning, real-time stock matrix tracking, barcode & QR scanner integration, automated low-stock and batch expiry alerts, and full purchase/sales order lifecycles.

---

## 🌟 Key Architecture & Highlights

- **Multi-Tenant Architecture**: Strict row-level partition isolation via indexed `tenant_id`. Seamless 1-click organization switcher.
- **Fast Lightweight Backend**: Built on Node.js + Express with high-throughput SQLite (`better-sqlite3` in WAL mode) and automated migrations.
- **Modern Glassmorphism UI**: Built with React 18, Vite, TailwindCSS, Lucide Icons, and interactive SVG/QR Code generation.
- **Real-Time Inventory Operations**:
  - **Stock In (Goods Receipt)**: Batch & expiration date logging.
  - **Stock Out (Dispatch)**: Automated deduction with reason codes.
  - **Physical Cycle Count Adjustment**: Real-time discrepancy balancing.
  - **Inter-Warehouse Transfers**: In-transit state flow (`IN_TRANSIT` ➡️ `RECEIVED`).
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
# In project root
npm run install:all
```

### 2. Seed Demo Multi-Tenant Data
```bash
npm run seed
```

### 3. Launch Development Server (Both Backend & Frontend)
```bash
npm run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
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

---

## 📂 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/database.js    # SQLite schema & foreign keys in WAL mode
│   │   ├── middleware/           # Tenant resolution & JWT auth/RBAC
│   │   ├── routes/               # Modular REST endpoints
│   │   ├── services/             # Audit logs & automated alert triggers
│   │   ├── database/seed.js      # Multi-tenant demo dataset
│   │   └── server.js             # Express API entrypoint
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, Sidebar, Modals
│   │   ├── context/              # Auth & Multi-tenant context
│   │   ├── services/api.js       # Frontend REST client
│   │   ├── views/                # Dashboard, Products, Warehouses, Operations, Orders, Barcode Hub, Alerts, Audit
│   │   ├── App.jsx
│   │   └── index.css             # Glassmorphic Tailwind design system
│   └── package.json
├── dev-runner.js                 # Dual-service concurrent runner
└── package.json                  # Monorepo root orchestrator
```

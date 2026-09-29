import React from 'react';
import { 
  LayoutDashboard, Package, Warehouse, ArrowLeftRight, 
  ShoppingCart, Truck, QrCode, AlertTriangle, 
  History, Settings, Users, ShieldCheck, Globe
} from 'lucide-react';

export const Sidebar = ({ currentTab, onSelectTab, alertsCount = 0, onBackToPublic }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & SKUs', icon: Package },
    { id: 'warehouses', label: 'Warehouses & Bins', icon: Warehouse },
    { id: 'operations', label: 'Stock Operations', icon: ArrowLeftRight },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'sales_orders', label: 'Sales Orders', icon: Truck },
    { id: 'barcode_station', label: 'Barcode & QR Hub', icon: QrCode },
    { id: 'alerts', label: 'Stock Alerts', icon: AlertTriangle, badge: alertsCount },
    { id: 'audit', label: 'Audit Trail Ledger', icon: History },
    { id: 'settings', label: 'Tenant & Team', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-3 hidden md:flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0 shadow-sm">
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
          Management Suite
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tenant Isolation Info Badge & Public link */}
      <div className="space-y-2">
        {onBackToPublic && (
          <button
            onClick={onBackToPublic}
            className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all"
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Public Portal Website</span>
          </button>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Row-Level Isolated</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Scoped to your organization's partition.
          </p>
        </div>
      </div>
    </aside>
  );
};

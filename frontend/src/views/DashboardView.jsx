import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  DollarSign, Package, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, Warehouse, ShoppingCart, Truck, 
  TrendingUp, RefreshCw, BarChart3, Layers
} from 'lucide-react';

export const DashboardView = ({ onNavigate }) => {
  const { currentTenant } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const res = await api.getDashboardAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentTenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const warehouses = data?.warehouse_distribution || [];
  const topProducts = data?.top_products || [];
  const movements = data?.recent_movements || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2">
            <span>Executive Inventory Overview</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active Organization: <strong className="text-slate-800">{currentTenant?.name}</strong> • Partition ID: <code className="font-mono text-emerald-700">{currentTenant?.slug}</code>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('operations')}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
          >
            <Package className="w-4 h-4" />
            <span>Stock In / Out</span>
          </button>
          <button
            onClick={() => onNavigate('purchase_orders')}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-3.5 py-2 rounded-xl border border-slate-300 text-xs transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>New PO</span>
          </button>
          <button
            onClick={fetchDashboard}
            className="p-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inventory Cost Valuation */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ${(kpis.inventory_cost_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
              <span>Retail Value:</span>
              <span className="text-emerald-700 font-bold">
                ${(kpis.inventory_retail_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Units on Hand</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {(kpis.total_units || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across <strong className="text-slate-700">{kpis.total_products || 0}</strong> SKU catalog items
            </div>
          </div>
        </div>

        {/* Low Stock & Out of Stock Alerts */}
        <div 
          onClick={() => onNavigate('alerts')}
          className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-amber-400 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Health</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700 tracking-tight flex items-center space-x-2">
              <span>{kpis.low_stock_count || 0}</span>
              <span className="text-xs font-medium text-slate-500">Low Stock</span>
            </div>
            <div className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center space-x-1">
              <span>{kpis.out_of_stock_count || 0} Out of Stock items</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Active Orders Pipeline */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center space-x-1">
                <span className="text-emerald-700">{kpis.open_pos_count || 0}</span>
                <span className="text-slate-500 text-xs">Inbound POs</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">${(kpis.open_pos_amount || 0).toLocaleString()}</div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center space-x-1">
                <span className="text-purple-700">{kpis.open_sos_count || 0}</span>
                <span className="text-slate-500 text-xs">Outbound SOs</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">${(kpis.open_sos_amount || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouses & Top Products Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Distribution Cards */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Warehouse className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Warehouses & Stock Distribution</h2>
            </div>
            <button
              onClick={() => onNavigate('warehouses')}
              className="text-xs text-emerald-700 hover:underline font-bold flex items-center space-x-1"
            >
              <span>Manage Warehouses</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warehouses.map((wh) => (
              <div key={wh.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{wh.name}</h3>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {wh.code}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    ${(wh.valuation || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
                  <span>SKUs: <strong className="text-slate-800">{wh.sku_count}</strong></span>
                  <span>Units: <strong className="text-slate-800">{wh.total_units.toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top High-Valuation Products */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Top Inventory Assets</h2>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs text-sky-700 hover:underline font-bold"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {topProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="max-w-[170px]">
                  <div className="font-bold text-slate-900 truncate">{p.name}</div>
                  <div className="text-[10px] font-mono text-slate-500">{p.sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700">${(p.stock_valuation || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">{p.total_stock} {p.unit_of_measure}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

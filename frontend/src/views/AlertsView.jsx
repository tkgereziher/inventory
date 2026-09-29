import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  AlertTriangle, RefreshCw, ShoppingCart, CheckCircle2, 
  Calendar, ShieldAlert, ArrowRight
} from 'lucide-react';

export const AlertsView = ({ onNavigate }) => {
  const { currentTenant } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const res = await api.getAlerts();
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentTenant]);

  const handleMarkRead = async (id) => {
    try {
      await api.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Stock Health & Reorder Warning Center</span>
          </h1>
          <p className="text-xs text-slate-500">
            Automated alerts for depleted inventory thresholds and expiring perishable batches
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Alerts Grid / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Scanning inventory thresholds...
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center space-y-2 border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-bold text-slate-900">All Inventory Levels Are Healthy!</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No products are below their safety reorder thresholds and no batches are expiring within the next 30 days.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isHigh = alert.severity === 'HIGH';
            const isRead = alert.is_read === 1;

            return (
              <div
                key={alert.id}
                className={`glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all border ${
                  isHigh ? 'border-rose-200 bg-rose-50/30' : 'border-amber-200 bg-amber-50/30'
                } ${isRead ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    isHigh ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isHigh ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alert.type.replace('_', ' ')}
                      </span>
                      {alert.sku && (
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {alert.sku}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => onNavigate('purchase_orders')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Create Replenishment PO</span>
                  </button>

                  {!isRead && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium border border-slate-300 shadow-sm"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

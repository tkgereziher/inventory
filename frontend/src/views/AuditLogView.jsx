import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { History, Shield, RefreshCw, User, Filter } from 'lucide-react';

export const AuditLogView = () => {
  const { currentTenant } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const res = await api.getAuditLogs({ action: actionFilter });
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentTenant, actionFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Immutable Audit Trail & Activity Ledger</span>
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographically partitioned compliance log of all inventory transfers, fulfillments, and data changes
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="">All Action Types</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="STOCK_OUT">Stock Out</option>
            <option value="STOCK_ADJUSTMENT">Adjustment</option>
            <option value="CREATE_PO">Purchase Order</option>
            <option value="CREATE_SO">Sales Order</option>
            <option value="CREATE_PRODUCT">Product Added</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 text-slate-700 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading audit ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let details = {};
                  try {
                    details = JSON.parse(log.details_json || '{}');
                  } catch {
                    details = {};
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-800 font-semibold">
                        {log.entity_type}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {log.user_name || 'System / Service'}
                      </td>

                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate font-sans text-xs">
                        {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

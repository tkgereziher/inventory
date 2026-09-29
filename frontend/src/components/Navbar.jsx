import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Layers, Building2, Bell, User, LogOut, ChevronDown, 
  Check, Sparkles, AlertTriangle, Globe, ArrowLeft
} from 'lucide-react';

export const Navbar = ({ onOpenAuth, onOpenScanner, onBackToPublic }) => {
  const { user, tenants, currentTenant, switchTenant, logout, quickDemoLogin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchAlerts = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getAlerts();
      setAlerts(res.alerts || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [currentTenant]);

  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-sm">
      {/* Brand & Multi-Tenant Selector */}
      <div className="flex items-center space-x-3">
        {/* Back to Public Portal Button */}
        {onBackToPublic && (
          <button
            onClick={onBackToPublic}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-200"
            title="Return to Public Website"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Public Website</span>
          </button>
        )}

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-bold text-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-sm">OmniStock</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                Workspace
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* Active Tenant Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTenantMenu(!showTenantMenu);
              setShowAlertsMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold transition-all hover:border-emerald-500"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="max-w-[140px] md:max-w-[180px] truncate">
              {currentTenant ? currentTenant.name : 'Select Tenant'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showTenantMenu && (
            <div className="absolute left-0 mt-2 w-72 glass-dropdown rounded-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5 flex items-center justify-between">
                <span>Switch Organization</span>
                <span className="text-emerald-600 text-[10px] font-mono">Row-Level Isolated</span>
              </div>
              <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      switchTenant(t.id);
                      setShowTenantMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                      currentTenant?.id === t.id
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {t.slug}</div>
                    </div>
                    {currentTenant?.id === t.id && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 my-1.5"></div>
              <div className="px-2 py-1 text-[11px] text-slate-500 font-semibold">
                ⚡ Quick Demo Switch:
              </div>
              <div className="grid grid-cols-3 gap-1 px-1">
                <button
                  onClick={() => { quickDemoLogin('apex-electronics'); setShowTenantMenu(false); }}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-[10px] rounded text-slate-700 font-medium truncate"
                  title="Apex Electronics"
                >
                  Apex Tech
                </button>
                <button
                  onClick={() => { quickDemoLogin('greenleaf-organics'); setShowTenantMenu(false); }}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-[10px] rounded text-slate-700 font-medium truncate"
                  title="GreenLeaf Organics"
                >
                  GreenLeaf
                </button>
                <button
                  onClick={() => { quickDemoLogin('titan-industrial'); setShowTenantMenu(false); }}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-[10px] rounded text-slate-700 font-medium truncate"
                  title="Titan Industrial"
                >
                  Titan Heavy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center space-x-3">
        {/* Quick Barcode Scan Button */}
        <button
          onClick={onOpenScanner}
          className="hidden sm:flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Barcode Scanner</span>
        </button>

        {/* Alerts Center Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAlertsMenu(!showAlertsMenu);
              setShowTenantMenu(false);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Notifications & Inventory Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-dropdown rounded-xl p-3 z-50 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-xs text-slate-800">Automated Inventory Alerts</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">
                  {unreadAlerts.length} Unresolved
                </span>
              </div>

              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    🎉 All inventory levels are optimal! No low stock alerts.
                  </div>
                ) : (
                  alerts.slice(0, 6).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2.5 rounded-lg text-xs border ${
                        alert.severity === 'HIGH'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>{alert.type.replace('_', ' ')}</span>
                        <span className="text-[10px] opacity-70">
                          {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug">
                        {alert.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Auth */}
        <div className="relative">
          {user ? (
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowAlertsMenu(false);
                setShowTenantMenu(false);
              }}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                {user.name.charAt(0)}
              </div>
              <span className="hidden md:inline max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-sm"
            >
              Sign In
            </button>
          )}

          {showUserMenu && user && (
            <div className="absolute right-0 mt-2 w-56 glass-dropdown rounded-xl p-2 z-50 shadow-xl">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{user.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                <div className="mt-1 text-[10px] inline-block font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                  {user.role}
                </div>
              </div>

              <div className="mt-1">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

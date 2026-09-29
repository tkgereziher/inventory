import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Layers, Lock, Mail, Building2, User, 
  Sparkles, Check, X, ArrowRight
} from 'lucide-react';

export const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const { login, quickDemoLogin, tenants } = useAuth();
  const [tab, setTab] = useState('login'); // 'login', 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Register state
  const [regCompany, setRegCompany] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, tenantId || undefined);
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register({
        company_name: regCompany,
        name: regName,
        email: regEmail,
        password: regPassword
      });
      await login(regEmail, regPassword);
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tenant Cloud Authentication</h2>
              <p className="text-[10px] text-slate-500 font-medium">Row-Partitioned Enterprise Workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Instant Demo Profiles */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Instant Demo Switch (1-Click)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={async () => {
                await quickDemoLogin('apex-electronics');
                if (onLoginSuccess) onLoginSuccess();
                onClose();
              }}
              className="p-2 bg-white hover:bg-emerald-50 rounded-lg text-left border border-slate-200 hover:border-emerald-300 transition-all text-[11px] shadow-sm"
            >
              <div className="font-bold text-slate-800 truncate">Apex Tech</div>
              <div className="text-[9px] text-slate-500">Electronics</div>
            </button>

            <button
              onClick={async () => {
                await quickDemoLogin('greenleaf-organics');
                if (onLoginSuccess) onLoginSuccess();
                onClose();
              }}
              className="p-2 bg-white hover:bg-emerald-50 rounded-lg text-left border border-slate-200 hover:border-emerald-300 transition-all text-[11px] shadow-sm"
            >
              <div className="font-bold text-slate-800 truncate">GreenLeaf</div>
              <div className="text-[9px] text-slate-500">Organics/FMCG</div>
            </button>

            <button
              onClick={async () => {
                await quickDemoLogin('titan-industrial');
                if (onLoginSuccess) onLoginSuccess();
                onClose();
              }}
              className="p-2 bg-white hover:bg-emerald-50 rounded-lg text-left border border-slate-200 hover:border-emerald-300 transition-all text-[11px] shadow-sm"
            >
              <div className="font-bold text-slate-800 truncate">Titan Heavy</div>
              <div className="text-[9px] text-slate-500">Machinery</div>
            </button>
          </div>
        </div>

        {/* Tabs: Sign In / Create Organization */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
              tab === 'login' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
              tab === 'register' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Register New Tenant
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Organization Tenant</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Auto-detect from user</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apex.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company / Organization Name *</label>
              <input
                type="text"
                required
                value={regCompany}
                onChange={(e) => setRegCompany(e.target.value)}
                placeholder="e.g. Quantum Logistics Group"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Admin Full Name *</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Rachel Adams"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Admin Email *</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="admin@quantum.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 mt-2"
            >
              {loading ? 'Creating Organization...' : 'Provision Tenant Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

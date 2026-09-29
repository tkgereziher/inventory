import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, Lock, Mail, ArrowRight, Layers, 
  Sparkles, CheckCircle2, ShieldCheck, AlertCircle, ChevronRight, Zap, Warehouse, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TenantLoginView = () => {
  const navigate = useNavigate();
  const { login, quickDemoLogin, tenants, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      await login(email, password, selectedTenantId || undefined);
      navigate('/app/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (slug) => {
    setLoading(true);
    try {
      await quickDemoLogin(slug);
      navigate('/app/dashboard');
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 lg:px-12 h-18 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">OmniStock</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                Tenant Portal
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center space-x-4 text-xs font-bold">
          <Link to="/" className="text-slate-600 hover:text-emerald-600">Home</Link>
          <Link to="/pricing" className="text-slate-600 hover:text-emerald-600">Pricing & Plans</Link>
          <Link to="/checkout?plan=PRO" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl shadow-sm">
            Join as Tenant
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Select Tenant Gateway or Sign In</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">Organization Tenant Access</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Choose a provisioned enterprise demo organization or enter your custom tenant admin credentials.
          </p>
        </div>

        {/* 1-Click Demo Gateways */}
        <div className="space-y-4">
          <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            ⚡ Quick-Launch Demo Portals (Instant One-Click Login)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Apex */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Apex Global Electronics</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">High-tech semiconductors & MCUs</p>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleDemoSelect('apex-electronics')}
                className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Enter Apex</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* GreenLeaf */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">GreenLeaf Organics</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">FMCG, cold storage, batch lot tracking</p>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleDemoSelect('greenleaf-organics')}
                className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Enter GreenLeaf</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Titan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Titan Heavy Machinery</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Hydraulic cylinders & central logistics</p>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleDemoSelect('titan-industrial')}
                className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Enter Titan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Custom Credentials Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base">Custom Tenant Credentials</h3>
            <p className="text-xs text-slate-500">Sign in with your registered email and password.</p>
          </div>

          {(localError || authError) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localError || authError}</span>
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select Organization (Optional)</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Auto-Detect from Email</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@apex.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

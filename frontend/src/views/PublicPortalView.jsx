import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Layers, ArrowRight, ShieldCheck, Warehouse, QrCode, 
  BarChart3, Sparkles, CheckCircle2, Search, Package, 
  Truck, ShoppingCart, Lock, Globe, Building2, ChevronRight, Zap,
  CreditCard, Smartphone, Shield, Star, Check
} from 'lucide-react';
import { ChapaPaymentModal } from '../components/ChapaPaymentModal';

export const PublicPortalView = () => {
  const navigate = useNavigate();
  const { quickDemoLogin, setAuthSession } = useAuth();

  const [publicSearch, setPublicSearch] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Pricing quick toggle on landing page
  const [landingCycle, setLandingCycle] = useState('MONTHLY');
  const [landingCurrency, setLandingCurrency] = useState('ETB');
  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);
  const [showChapaModal, setShowChapaModal] = useState(false);

  const handlePublicLookup = async (e) => {
    e?.preventDefault();
    if (!publicSearch.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const res = await api.lookupProduct(publicSearch.trim());
      setLookupResult(res.product);
    } catch (err) {
      setLookupError(`No public product record found matching "${publicSearch}". Try APX-MCU-M70 or 880192837401.`);
    } finally {
      setLookupLoading(false);
    }
  };

  const samplePlans = [
    {
      id: 'plan-starter',
      code: 'STARTER',
      name: 'Starter Tier',
      price_etb: 1499,
      price_usd: 29,
      wh: '1 Warehouse',
      users: '3 Users',
      skus: '500 SKUs',
      features: [
        'Webcam Barcode Scanning',
        'Inbound PO & Outbound SO',
        'Stock Movement Ledger',
        'Chapa & Telebirr Checkout'
      ]
    },
    {
      id: 'plan-pro',
      code: 'PRO',
      name: 'Growth Pro',
      popular: true,
      price_etb: 3999,
      price_usd: 79,
      wh: '5 Warehouses',
      users: '15 Users',
      skus: '5,000 SKUs',
      features: [
        'Multi-Warehouse Transfer Routing',
        'Live Barcode Station & Webcam',
        'Automated Low Stock Alerts',
        'Full Immutable Audit Ledger',
        'Chapa Instant Settlement (CBE, Telebirr)',
        'Priority Technical Support'
      ]
    },
    {
      id: 'plan-enterprise',
      code: 'ENTERPRISE',
      name: 'Enterprise Logistics',
      price_etb: 8999,
      price_usd: 179,
      wh: 'Unlimited Warehouses',
      users: 'Unlimited Users',
      skus: 'Unlimited SKUs',
      features: [
        'Dedicated Tenant DB Sharding',
        'Custom Roles & Granular RBAC',
        'Custom Webhooks & REST API',
        'ERP & POS Integration Support',
        '24/7 Dedicated Account Engineer'
      ]
    }
  ];

  const getPlanPrice = (plan) => {
    if (landingCurrency === 'USD') {
      const p = landingCycle === 'ANNUAL' ? Math.round(plan.price_usd * 0.83) : plan.price_usd;
      return `$${p} / mo`;
    }
    const p = landingCycle === 'ANNUAL' ? Math.round(plan.price_etb * 0.83) : plan.price_etb;
    return `${p.toLocaleString()} ETB / mo`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 lg:px-12 h-18 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">OmniStock</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                Cloud Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Enterprise Multi-Tenant Logistics & Inventory</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
          <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
          <a href="#portals" className="hover:text-emerald-600 transition-colors">Tenant Portals</a>
          <a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing & Plans</a>
          <Link to="/verify-sku" className="hover:text-emerald-600 transition-colors">Public SKU Tracker</Link>
          <a href="#security" className="hover:text-emerald-600 transition-colors">Security & Chapa</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-xs font-bold text-slate-700 hover:text-emerald-600 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/checkout?plan=PRO"
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
          >
            <span>Join with Chapa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 lg:px-12 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multi-Tenant Architecture • Chapa Payment Integration</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Unified Inventory Intelligence & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Multi-Site Logistics</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            A high-performance cloud platform engineered for multi-tenant enterprise logistics. Real-time multi-warehouse tracking, webcam barcode recognition, automated procurement workflows, and instant Ethiopian Chapa payments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to="/checkout?plan=PRO"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
            >
              <span>Get Started via Chapa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                quickDemoLogin('apex-electronics');
                navigate('/app/dashboard');
              }}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Launch 1-Click Demo</span>
            </button>

            <Link
              to="/verify-sku"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-sm transition-all"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Verify Public SKU</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 text-left">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Tenant Data Isolation</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">&lt; 10ms</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Real-Time Stock Query</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">Chapa ETB</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Telebirr & CBE Gateway</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">Zero-Config</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Instant Tenant Provisioning</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Subscription Section */}
      <section id="pricing" className="py-20 px-6 lg:px-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Flexible Subscription Plans</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Choose the Perfect Plan for Your Warehouses
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Transparent pricing with instant Chapa Ethiopian payment or 14-day zero-risk trial.
            </p>

            {/* Interval & Currency Selector */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
                <button
                  onClick={() => setLandingCycle('MONTHLY')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    landingCycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setLandingCycle('ANNUAL')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                    landingCycle === 'ANNUAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">17% OFF</span>
                </button>
              </div>

              <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
                <button
                  onClick={() => setLandingCurrency('ETB')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    landingCurrency === 'ETB' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  🇪🇹 ETB
                </button>
                <button
                  onClick={() => setLandingCurrency('USD')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    landingCurrency === 'USD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  🇺🇸 USD
                </button>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {samplePlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all ${
                  plan.popular
                    ? 'bg-slate-900 text-white shadow-2xl ring-2 ring-emerald-500 md:-translate-y-2'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                    Recommended For High-Growth
                  </div>
                )}

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black">{plan.name}</h3>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      plan.popular ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {plan.code}
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl font-black">{getPlanPrice(plan)}</div>
                    <div className={`text-xs mt-1 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.wh} • {plan.users} • {plan.skus}
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-2 border-t border-slate-100/20">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start space-x-2 text-xs">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span className={plan.popular ? 'text-slate-200' : 'text-slate-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 space-y-2">
                  <Link
                    to={`/checkout?plan=${plan.code}&cycle=${landingCycle}`}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm ${
                      plan.popular
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <span>Subscribe via Chapa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/checkout?plan=${plan.code}&trial=true`}
                    className={`w-full py-2 text-center text-xs font-bold rounded-xl transition-colors block ${
                      plan.popular ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Start 14-Day Free Trial
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center space-x-2 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <span>View In-Depth Feature Comparison Table & FAQ</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tenant Portals Gateway Section */}
      <section id="portals" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Organization Gateway</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Dedicated Tenant Portals
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Each tenant operates within an isolated partition with customized SKUs, warehouses, staff roles, and order records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tenant 1: Apex Electronics */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  High-Tech / MCUs
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Apex Global Electronics</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Semiconductor components, precision LiDAR sensors, and Silicon Valley distribution hub.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                quickDemoLogin('apex-electronics');
                navigate('/app/dashboard');
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-sm group-hover:bg-emerald-600"
            >
              <span>Enter Apex Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tenant 2: GreenLeaf Organics */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  FMCG & Cold Storage
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">GreenLeaf Organics</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Organic dairy, arabica coffee, batch lot tracking, and perishable expiry management.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                quickDemoLogin('greenleaf-organics');
                navigate('/app/dashboard');
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-sm group-hover:bg-emerald-600"
            >
              <span>Enter GreenLeaf Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tenant 3: Titan Heavy Machinery */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Heavy Machinery
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Titan Industrial Tools</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hydraulic cylinders, machinery parts, and Frankfurt central distribution logistics.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                quickDemoLogin('titan-industrial');
                navigate('/app/dashboard');
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-sm group-hover:bg-emerald-600"
            >
              <span>Enter Titan Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Public SKU Tracker Section */}
      <section id="tracker" className="py-16 px-6 lg:px-12 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Public Item Verification</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Live Product SKU & Barcode Tracker
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Auditors, logistics partners, and recipients can look up public item details and verification status.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handlePublicLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={publicSearch}
                onChange={(e) => setPublicSearch(e.target.value)}
                placeholder="Enter Barcode or SKU (e.g. 880192837401 or APX-MCU-M70)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 shrink-0"
            >
              {lookupLoading ? 'Verifying...' : 'Verify SKU'}
            </button>
          </form>

          {/* Quick Samples */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Try sample codes:</span>
            {['880192837401', 'APX-LIDAR-V4', 'GL-ALM-100', '990182736451'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setPublicSearch(code);
                  api.lookupProduct(code).then(r => setLookupResult(r.product)).catch(() => {});
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-mono rounded-lg border border-slate-200 transition-colors"
              >
                {code}
              </button>
            ))}
          </div>

          {/* Lookup Result Box */}
          {lookupResult && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                    {lookupResult.sku}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{lookupResult.name}</h3>
                  <div className="text-xs text-slate-500">
                    Category: <strong className="text-slate-700">{lookupResult.category_name || 'General'}</strong> • Brand: <strong className="text-slate-700">{lookupResult.brand || 'Enterprise'}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold text-slate-900">
                    {lookupResult.total_stock} <span className="text-xs text-slate-500 font-normal">{lookupResult.unit_of_measure}</span>
                  </div>
                  <span className="badge-green mt-1 inline-block">Active Verified SKU</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">Barcode: {lookupResult.barcode}</span>
                <span>Retail Value: ${lookupResult.selling_price?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {lookupError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {lookupError}
            </div>
          )}
        </div>
      </section>

      {/* Enterprise Platform Capabilities */}
      <section id="features" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Enterprise Capabilities</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Engineered for High-Velocity Supply Chains
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Warehouse className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Multi-Warehouse Routing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track inventory distribution across regional hubs, storage aisles, and bin locations with automated stock transfers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Live Webcam Barcode Hub</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scan standard barcodes or QR asset labels directly from browser webcams or handheld laser guns for rapid intake.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Immutable Audit Ledger</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every stock movement, shipment, receiving event, and cycle adjustment is permanently attributed with audit logs.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Chapa Trust Section */}
      <section id="security" className="py-16 px-6 lg:px-12 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-3 py-1 rounded-full">
              Enterprise Grade Compliance
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">Bank-Grade Chapa Settlement & Data Isolation</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              All financial transactions are handled through Chapa with 256-bit encryption. Your warehouse inventory records remain partitioned in isolated tenant databases with 99.9% uptime SLA.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <div className="text-xl font-bold text-emerald-400">Chapa Verified</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Telebirr & CBE Birr</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <div className="text-xl font-bold text-emerald-400">99.9% SLA</div>
              <div className="text-[10px] text-slate-400 mt-0.5">High Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-10 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2 font-medium">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800">OmniStock Cloud</span>
            <span>• Multi-Tenant Logistics System</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/pricing" className="hover:text-emerald-600 font-semibold">Pricing & Plans</Link>
            <span>•</span>
            <Link to="/verify-sku" className="hover:text-emerald-600 font-semibold">Public SKU Tracker</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-emerald-600 font-semibold">Tenant Sign In</Link>
            <span>•</span>
            <span className="font-mono text-emerald-600">Chapa ETB Integrated 🇪🇹</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

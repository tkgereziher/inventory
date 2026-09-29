import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Check, X, Sparkles, Shield, Zap, ArrowRight, 
  HelpCircle, ChevronDown, ChevronUp, CreditCard,
  Building2, Layers, CheckCircle2, Warehouse, Users, PackageCheck
} from 'lucide-react';
import { api } from '../services/api';
import { ChapaPaymentModal } from '../components/ChapaPaymentModal';
import { useAuth } from '../context/AuthContext';

export const PricingView = () => {
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('MONTHLY'); // 'MONTHLY' | 'ANNUAL'
  const [currency, setCurrency] = useState('ETB'); // 'ETB' | 'USD'
  
  // Chapa Modal State
  const [selectedPlanForChapa, setSelectedPlanForChapa] = useState(null);
  const [showChapaModal, setShowChapaModal] = useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getSubscriptionPlans();
      setPlans(res.plans || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    // Navigate to dedicated checkout flow or open instant Chapa modal
    navigate(`/checkout?plan=${plan.code}&cycle=${billingCycle}&currency=${currency}`);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getPrice = (plan) => {
    if (currency === 'USD') {
      const price = billingCycle === 'ANNUAL' ? Math.round(plan.price_usd * 0.83) : plan.price_usd;
      return `$${price}`;
    }
    const price = billingCycle === 'ANNUAL' ? Math.round(plan.price_etb * 0.83) : plan.price_etb;
    return `${price.toLocaleString()} ETB`;
  };

  const getBillingLabel = () => {
    return billingCycle === 'ANNUAL' ? 'per month, billed annually' : 'per month, billed monthly';
  };

  const faqs = [
    {
      q: 'How does Chapa payment work on OmniStock?',
      a: 'Chapa is Ethiopia’s premier, PCI-DSS compliant payment gateway. When you subscribe, you can pay directly in Ethiopian Birr (ETB) using Telebirr, CBE Birr, Awash Birr, or debit/credit cards. Once approved, your organization’s dedicated multi-tenant partition is provisioned instantly.'
    },
    {
      q: 'Can I start with a Free Trial before paying?',
      a: 'Yes! We offer a full 14-day Pro Trial with zero credit card required. You can test barcode scanning, warehouse transfers, multi-user permissions, and order workflows with real data.'
    },
    {
      q: 'Is our tenant inventory data completely isolated from other companies?',
      a: 'Absolutely. OmniStock enforces strict row-level security and tenant data boundaries. Every database query, stock movement ledger, product SKU, and audit log is partitioned and scoped strictly to your tenant ID.'
    },
    {
      q: 'Can I switch or upgrade my plan later?',
      a: 'Yes, you can upgrade from Starter to Pro or Enterprise at any time from your Tenant Settings. Your remaining balance is automatically prorated via Chapa.'
    },
    {
      q: 'Do you support custom integrations with local Ethiopian ERPs?',
      a: 'Enterprise plans include full REST API access, webhook subscriptions, and dedicated integration support for SAP, Oracle, and custom Ethiopian accounting systems.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 lg:px-12 h-18 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">OmniStock</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Enterprise Logistics & Multi-Tenant Inventory</p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <Link to="/pricing" className="text-emerald-600 font-bold transition-colors">Pricing & Plans</Link>
          <Link to="/verify-sku" className="hover:text-emerald-600 transition-colors">Public SKU Tracker</Link>
          <Link to="/login" className="hover:text-emerald-600 transition-colors">Tenant Portals</Link>
        </nav>

        {/* Actions */}
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
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <section className="pt-16 pb-12 px-6 lg:px-12 bg-gradient-to-b from-white to-slate-50 text-center space-y-4 border-b border-slate-200">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Flexible Plans • Instant Chapa ETB & Card Checkout</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Simple, Transparent Pricing for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
            Every Scale of Supply Chain
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Start in seconds with integrated Chapa payment (Telebirr, CBE Birr, Awash, Cards). Provision isolated multi-warehouse environments with zero technical overhead.
        </p>

        {/* Toggles Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Monthly / Annual Toggle */}
          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center shadow-inner">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('ANNUAL')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                billingCycle === 'ANNUAL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full ${
                billingCycle === 'ANNUAL' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Save 17%
              </span>
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center shadow-inner">
            <button
              onClick={() => setCurrency('ETB')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currency === 'ETB'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇪🇹 ETB (Chapa)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currency === 'USD'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇺🇸 USD ($)
            </button>
          </div>
        </div>
      </section>

      {/* Main Pricing Cards Grid */}
      <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium">Loading pricing tiers...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const isPopular = plan.is_popular || plan.code === 'PRO';
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                    isPopular
                      ? 'bg-white border-2 border-emerald-500 shadow-2xl shadow-emerald-500/15 md:-translate-y-2'
                      : 'bg-white border border-slate-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[11px] uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                      Most Popular For Growing Warehouses
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Plan Header */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          {plan.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {plan.code === 'STARTER' && 'Ideal for single retail shops and boutique distributors.'}
                        {plan.code === 'PRO' && 'Complete high-velocity multi-site supply chain orchestration.'}
                        {plan.code === 'ENTERPRISE' && 'Custom high-throughput logistics, sharding, and API webhooks.'}
                      </p>
                    </div>

                    {/* Pricing Figure */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tight">
                          {getPrice(plan)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{getBillingLabel()}</p>
                    </div>

                    {/* Usage Limits Pill */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <div className="text-xs font-black text-slate-900">{plan.max_users >= 999 ? '∞' : plan.max_users}</div>
                        <div className="text-[10px] text-slate-500">Users</div>
                      </div>
                      <div className="border-x border-slate-200">
                        <div className="text-xs font-black text-slate-900">{plan.max_warehouses >= 999 ? '∞' : plan.max_warehouses}</div>
                        <div className="text-[10px] text-slate-500">Warehouses</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">{plan.max_products >= 9999 ? '∞' : plan.max_products.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">SKUs</div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Included Capabilities:</div>
                      <ul className="space-y-2.5">
                        {plan.features?.map((feat, idx) => (
                          <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-600">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-8 space-y-2">
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-md ${
                        isPopular
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>Join with Chapa / Card</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => navigate(`/checkout?plan=${plan.code}&trial=true`)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      Start 14-Day Free Trial
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chapa Payment Trust & Security Bar */}
        <div className="mt-16 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chapa Certified Ethiopian Payment Switch</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black">Supported Payment Channels</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Pay seamlessly using Telebirr, CBE Birr, Awash Birr, or International Visa & Mastercard with automated invoice generation and tax receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-xs font-bold border border-white/10 font-mono">
              ⚡ Telebirr Mobile
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-xs font-bold border border-white/10 font-mono">
              🏦 CBE Birr
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-xs font-bold border border-white/10 font-mono">
              💼 Awash Bank
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-xs font-bold border border-white/10 font-mono">
              💳 Visa / Mastercard
            </span>
          </div>
        </div>

        {/* Detailed Feature Comparison Matrix */}
        <div className="mt-20 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Comprehensive Feature Comparison</h2>
            <p className="text-xs text-slate-500">Every tool your team needs to optimize warehouse fulfillment and prevent stockouts.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider">
                  <th className="p-4 pl-6">Feature & Module</th>
                  <th className="p-4 text-center">Starter</th>
                  <th className="p-4 text-center text-emerald-700 bg-emerald-50/50">Growth Pro</th>
                  <th className="p-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-4 pl-6 font-bold text-slate-900">Tenant Data Isolation</td>
                  <td className="p-4 text-center font-bold text-emerald-600">100% Isolated</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">100% Isolated</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Dedicated Partition / DB</td>
                </tr>
                <tr>
                  <td className="p-4 pl-6 font-bold text-slate-900">Webcam & Barcode Scanner Station</td>
                  <td className="p-4 text-center">Standard Barcode</td>
                  <td className="p-4 text-center bg-emerald-50/30">Live Camera + Laser Guns</td>
                  <td className="p-4 text-center">High-Speed Industrial Scanners</td>
                </tr>
                <tr>
                  <td className="p-4 pl-6 font-bold text-slate-900">Inter-Warehouse Transfer Routing</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Multi-Zone Automated Routing</td>
                </tr>
                <tr>
                  <td className="p-4 pl-6 font-bold text-slate-900">Batch Lot & Expiry Alerts</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">Real-Time</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Predictive Machine Learning</td>
                </tr>
                <tr>
                  <td className="p-4 pl-6 font-bold text-slate-900">Immutable Audit Ledger History</td>
                  <td className="p-4 text-center">30 Days</td>
                  <td className="p-4 text-center bg-emerald-50/30 font-bold text-emerald-600">1 Year History</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Lifetime Permanent Archival</td>
                </tr>
                <tr>
                  <td className="p-4 pl-6 font-bold text-slate-900">Chapa Local Payment Support</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Custom Gateway Routing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-20 max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500">Everything you need to know about subscriptions, billing, and onboarding.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between font-bold text-xs text-slate-900 hover:text-emerald-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-10 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2 font-medium">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800">OmniStock Cloud</span>
            <span>• Multi-Tenant Logistics System</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/verify-sku" className="hover:text-emerald-600 font-semibold">SKU Tracker</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-emerald-600 font-semibold">Tenant Portal Sign In</Link>
            <span>•</span>
            <span className="font-mono text-emerald-600">Chapa Active 🇪🇹</span>
          </div>
        </div>
      </footer>

      {/* Chapa Payment Popup Modal */}
      <ChapaPaymentModal
        isOpen={showChapaModal}
        onClose={() => setShowChapaModal(false)}
        plan={selectedPlanForChapa}
        billingCycle={billingCycle}
        onPaymentSuccess={(res) => {
          if (res.token) {
            setAuthSession(res.token, res.user, res.tenant);
          }
        }}
      />
    </div>
  );
};

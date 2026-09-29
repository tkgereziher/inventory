import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, User, Mail, Phone, Lock, ShieldCheck, 
  CreditCard, Smartphone, ArrowRight, CheckCircle2, 
  Sparkles, ArrowLeft, Layers, AlertCircle, Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const CheckoutView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession, currentTenant, user: authUser } = useAuth();

  const planCodeParam = searchParams.get('plan') || 'PRO';
  const cycleParam = searchParams.get('cycle') || 'MONTHLY';
  const isTrialParam = searchParams.get('trial') === 'true';

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState(cycleParam);
  const [isTrial, setIsTrial] = useState(isTrialParam);
  const [channel, setChannel] = useState('telebirr'); // telebirr, cbebirr, awash, card

  // Form fields
  const [orgName, setOrgName] = useState(currentTenant?.name || '');
  const [adminName, setAdminName] = useState(authUser?.name || '');
  const [email, setEmail] = useState(authUser?.email || '');
  const [phone, setPhone] = useState('0911234567');
  const [password, setPassword] = useState('Password123!');

  // Flow & State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [txRef, setTxRef] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.getSubscriptionPlans();
      setPlans(res.plans || []);
      const matched = res.plans?.find(p => p.code === planCodeParam) || res.plans?.[1] || res.plans?.[0];
      setSelectedPlan(matched);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const getAmount = () => {
    if (!selectedPlan) return 0;
    if (billingCycle === 'ANNUAL') {
      return Math.round(selectedPlan.price_etb * 10);
    }
    return selectedPlan.price_etb;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!orgName.trim() || !adminName.trim() || !email.trim()) {
      setErrorMsg('Please complete all organization and admin contact fields.');
      return;
    }

    setLoading(true);

    // If User chose Free 14-Day Trial
    if (isTrial) {
      try {
        const trialRes = await api.registerFreeTrial({
          tenantName: orgName,
          adminName,
          adminEmail: email,
          adminPassword: password
        });

        if (trialRes.token) {
          setAuthSession(trialRes.token, trialRes.user, trialRes.tenant);
        }
        navigate('/app/dashboard');
      } catch (err) {
        setErrorMsg(err.message || 'Failed to start free trial');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Chapa Payment Flow
    try {
      const payload = {
        planId: selectedPlan.id,
        billingCycle,
        tenantName: orgName,
        adminName,
        adminEmail: email,
        adminPhone: phone,
        adminPassword: password,
        paymentChannel: channel,
        returnUrl: `${window.location.origin}/payment/callback`
      };

      const chapaRes = await api.initiateChapaCheckout(payload);
      setTxRef(chapaRes.tx_ref);

      if (chapaRes.isLiveChapa && chapaRes.checkoutUrl) {
        window.location.href = chapaRes.checkoutUrl;
        return;
      }

      // Interactive Simulator Step
      if (channel === 'telebirr' || channel === 'cbebirr' || channel === 'awash') {
        setOtpStep(true);
      } else {
        // Card immediate verification
        setTimeout(async () => {
          navigate(`/payment/callback?tx_ref=${chapaRes.tx_ref}`);
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const verifyRes = await api.verifyPayment(txRef, true);
      if (verifyRes.token) {
        setAuthSession(verifyRes.token, verifyRes.user, verifyRes.tenant);
      }
      navigate(`/payment/callback?tx_ref=${txRef}`);
    } catch (err) {
      setErrorMsg(err.message || 'Payment verification failed');
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
                Secure Checkout
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Instant Tenant Provisioning via Chapa</p>
          </div>
        </Link>

        <Link
          to="/pricing"
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Plans</span>
        </Link>
      </header>

      {/* Main Checkout Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Payment Channel (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isTrial ? '14-Day Full Pro Access' : 'Official Chapa Gateway Integration'}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isTrial ? 'Start 14-Day Free Trial' : 'Complete Tenant Subscription'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Your dedicated cloud partition and warehouse ledger will be provisioned in real time.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* OTP Simulator Step */}
            {otpStep ? (
              <div className="space-y-6 text-center py-6 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">Confirm {channel.toUpperCase()} Payment</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Enter the authorization PIN/OTP dispatched to <strong className="text-slate-800">{phone}</strong> for {getAmount().toLocaleString()} ETB.
                  </p>
                </div>

                <div className="max-w-xs mx-auto space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    placeholder="1 2 3 4 5 6"
                    className="w-full text-center tracking-[0.5em] text-2xl font-black font-mono py-3 bg-slate-50 border-2 border-emerald-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  />
                  <p className="text-[11px] text-emerald-600 font-medium">
                    💡 Simulated test gateway: enter any code (e.g. 123456)
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                  <button
                    type="button"
                    disabled={loading || otpValue.length < 4}
                    onClick={handleConfirmOtp}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Launch Workspace</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpStep(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 py-1"
                  >
                    ← Modify details
                  </button>
                </div>
              </div>
            ) : (
              /* Main Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Organization & Tenant Details */}
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>1. Organization & Account Info</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Company / Organization Name</label>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Abyssinia Logistics Hub"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Administrator Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="Abebe Bikila"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Work Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@abyssinia.et"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Ethiopian Mobile Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0911234567"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Admin Workspace Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Payment Channel Selection (If not Free Trial) */}
                {!isTrial && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>2. Chapa Payment Channel (Ethiopia)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'telebirr', name: 'Telebirr', icon: '📱', desc: 'Mobile PIN' },
                        { id: 'cbebirr', name: 'CBE Birr', icon: '🏦', desc: 'CBE Mobile' },
                        { id: 'awash', name: 'Awash Birr', icon: '💼', desc: 'Awash Wallet' },
                        { id: 'card', name: 'Visa/Cards', icon: '💳', desc: 'Debit/Credit' }
                      ].map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setChannel(ch.id)}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            channel === ch.id
                              ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className="text-xl mb-1">{ch.icon}</div>
                          <div className="text-xs font-bold">{ch.name}</div>
                          <div className="text-[10px] text-slate-500">{ch.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit CTA */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Initializing Secure Session...</span>
                      </>
                    ) : isTrial ? (
                      <>
                        <span>Activate 14-Day Free Pro Trial</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Pay {getAmount().toLocaleString()} ETB via Chapa</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => setIsTrial(!isTrial)}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      {isTrial ? '← Switch to Paid Instant Subscription' : 'Prefer to try free for 14 days first?'}
                    </button>
                    <span>Row-Level Data Security</span>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Order & Plan Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-extrabold text-slate-900 text-sm">Order Summary</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {isTrial ? 'Trial Mode' : 'Chapa Instant'}
                </span>
              </div>

              {/* Plan Switcher */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Tier</label>
                <div className="space-y-2">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        selectedPlan?.id === p.id
                          ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black">{p.name}</div>
                        <div className="text-[11px] text-slate-500">Up to {p.max_warehouses} warehouses • {p.max_users} users</div>
                      </div>
                      <div className="text-xs font-black text-emerald-700">
                        {p.price_etb.toLocaleString()} ETB
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Billing Cycle Switcher */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billing Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      billingCycle === 'MONTHLY'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('ANNUAL')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                      billingCycle === 'ANNUAL'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>Annual (Save 17%)</span>
                  </button>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{isTrial ? '0 ETB' : `${getAmount().toLocaleString()} ETB`}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT & Tax:</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-100">
                  <span>Total Due:</span>
                  <span className="text-emerald-700 text-base">
                    {isTrial ? '0 ETB (14-Day Trial)' : `${getAmount().toLocaleString()} ETB`}
                  </span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center space-x-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Zero-risk guarantee. Cancel or switch plans anytime.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, AlertCircle, Loader2, 
  CreditCard, Smartphone, ArrowRight, RefreshCw, Lock, Sparkles, Building2
} from 'lucide-react';
import { api } from '../services/api';

export const ChapaPaymentModal = ({ 
  isOpen, 
  onClose, 
  plan, 
  billingCycle = 'MONTHLY',
  onPaymentSuccess,
  tenantInfo = null
}) => {
  const [step, setStep] = useState('info'); // 'info', 'channel', 'otp', 'verifying', 'success', 'error'
  const [channel, setChannel] = useState('telebirr'); // telebirr, cbebirr, awash, card
  const [phone, setPhone] = useState(tenantInfo?.phone || '0911234567');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [txRef, setTxRef] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('channel');
      setErrorMsg('');
      setOtp('');
      setPaymentResult(null);
    }
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const calculateAmount = () => {
    if (billingCycle === 'ANNUAL') {
      return Math.round(plan.price_etb * 10); // 2 months discount
    }
    return plan.price_etb;
  };

  const amount = calculateAmount();

  const handleInitiatePayment = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        planId: plan.id,
        billingCycle,
        tenantName: tenantInfo?.name || 'OmniStock Organization',
        adminName: tenantInfo?.adminName || 'Admin User',
        adminEmail: tenantInfo?.email || 'admin@omnistock.cloud',
        adminPhone: phone,
        adminPassword: tenantInfo?.password || 'Password123!',
        paymentChannel: channel
      };

      const res = await api.initiateChapaCheckout(payload);
      setTxRef(res.tx_ref);

      if (res.isLiveChapa && res.checkoutUrl) {
        // Live Chapa gateway redirect
        window.location.href = res.checkoutUrl;
        return;
      }

      // If sandbox / simulated payment flow, proceed to OTP confirmation step
      if (channel === 'telebirr' || channel === 'cbebirr' || channel === 'awash') {
        setStep('otp');
      } else {
        // Direct card simulation
        setStep('verifying');
        setTimeout(async () => {
          await handleVerifyTransaction(res.tx_ref);
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initiate Chapa transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTransaction = async (reference) => {
    setLoading(true);
    setErrorMsg('');
    setStep('verifying');

    try {
      const ref = reference || txRef;
      const res = await api.verifyPayment(ref, true);
      setPaymentResult(res);
      setStep('success');

      if (onPaymentSuccess) {
        onPaymentSuccess(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment verification failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight">Chapa Secure Checkout</span>
                <span className="text-[10px] font-mono bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  ETB Gateway
                </span>
              </div>
              <p className="text-xs text-slate-300">Official Ethiopian Payment Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Summary Ribbon */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Plan: </span>
            <span className="font-bold text-slate-900">{plan.name}</span>
            <span className="text-slate-400"> ({billingCycle === 'ANNUAL' ? 'Annual / 2 Mo Free' : 'Monthly'})</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Total: </span>
            <span className="font-extrabold text-emerald-700 text-sm">{amount.toLocaleString()} ETB</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Select Chapa Payment Channel */}
          {step === 'channel' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Ethiopian Payment Channel
                </label>
                <p className="text-xs text-slate-500">
                  Instant mobile wallet or bank debit with official Chapa API processing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Telebirr */}
                <button
                  type="button"
                  onClick={() => setChannel('telebirr')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    channel === 'telebirr'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                      Telebirr
                    </span>
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">Ethio Telecom Telebirr</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Instant Mobile Wallet PIN / USSD</div>
                </button>

                {/* CBE Birr */}
                <button
                  type="button"
                  onClick={() => setChannel('cbebirr')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    channel === 'cbebirr'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 font-mono">
                      CBE Birr
                    </span>
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">Commercial Bank of Ethiopia</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Direct CBE Mobile Banking</div>
                </button>

                {/* Awash Birr */}
                <button
                  type="button"
                  onClick={() => setChannel('awash')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    channel === 'awash'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-mono">
                      Awash Birr
                    </span>
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">Awash Bank Wallet</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Awash Birr Pro & Debit</div>
                </button>

                {/* Debit & Credit Cards */}
                <button
                  type="button"
                  onClick={() => setChannel('card')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    channel === 'card'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300 font-mono">
                      Cards
                    </span>
                    <CreditCard className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">Visa / Mastercard</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Local & International Cards</div>
                </button>
              </div>

              {/* Mobile Phone Input for Wallets */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700">
                  {channel === 'card' ? 'Billing Contact Phone' : 'Ethiopian Phone Number (+251)'}
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0911234567 or +251911234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  A verification prompt or OTP will be dispatched to this number.
                </p>
              </div>

              {/* Security Note */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center space-x-3 text-xs text-slate-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Protected with Chapa 256-bit TLS encryption & PCI-DSS compliance.</span>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleInitiatePayment}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Chapa...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {amount.toLocaleString()} ETB with Chapa</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Simulated OTP / PIN confirmation */}
          {step === 'otp' && (
            <div className="space-y-5 text-center py-2 animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Smartphone className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Authorize {channel.toUpperCase()} Payment
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Enter the 6-digit Chapa authorization code sent to <strong className="text-slate-800">{phone}</strong>
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="1 2 3 4 5 6"
                  className="w-full text-center tracking-[0.5em] text-2xl font-black font-mono py-3 bg-slate-50 border-2 border-emerald-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-emerald-600 font-medium">
                  💡 Sandbox simulation mode: enter any 6 digits (e.g. 123456)
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={loading || otp.length < 4}
                  onClick={() => handleVerifyTransaction()}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying with Chapa Ledger...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Activate Subscription</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('channel')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
                >
                  ← Change Payment Channel
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Verifying */}
          {step === 'verifying' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Verifying Chapa Payment...</h3>
                <p className="text-xs text-slate-500">Communicating with Ethiopian National Payment Switch</p>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && paymentResult && (
            <div className="space-y-5 text-center py-2 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  Payment Verified
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Welcome to OmniStock Cloud!</h3>
                <p className="text-xs text-slate-600">
                  Your <strong className="text-slate-800">{plan.name}</strong> subscription is active.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono font-bold text-slate-800">{paymentResult.tx_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chapa Reference:</span>
                  <span className="font-mono text-slate-700">{paymentResult.chapa_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-extrabold text-emerald-700">{paymentResult.amount} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Tenant:</span>
                  <span className="font-bold text-slate-900">{paymentResult.tenant?.name || 'Your Workspace'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (paymentResult.token) {
                    window.location.href = '/app/dashboard';
                  }
                }}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Enter Your Inventory Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 5: Error */}
          {step === 'error' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Payment Could Not Be Completed</h3>
                <p className="text-xs text-rose-600">{errorMsg || 'Please try another payment channel.'}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('channel')}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

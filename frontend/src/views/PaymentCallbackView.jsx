import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Loader2, ArrowRight, 
  Layers, Download, Printer, ShieldCheck, Building2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PaymentCallbackView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();

  const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref') || '';
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (txRef) {
      verify();
    } else {
      setLoading(false);
      setErrorMsg('No transaction reference found in callback URL.');
    }
  }, [txRef]);

  const verify = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.verifyPayment(txRef, true);
      setResult(res);

      if (res.token) {
        setAuthSession(res.token, res.user, res.tenant);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setErrorMsg(err.message || 'Failed to verify transaction status.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterWorkspace = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
      {/* Top Brand */}
      <Link to="/" className="flex items-center space-x-3 mb-8">
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
        </div>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-8 text-center space-y-6">
        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">Verifying Chapa Payment...</h2>
              <p className="text-xs text-slate-500 font-mono">tx_ref: {txRef}</p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">Payment Verification Issue</h2>
              <p className="text-xs text-rose-600">{errorMsg}</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/pricing"
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Return to Pricing
              </Link>
              <button
                onClick={verify}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
              >
                Retry Verification
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                Transaction Verified • Chapa ETB
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Subscription Activated!</h2>
              <p className="text-xs text-slate-500">
                Your multi-tenant workspace is live and ready for inventory intake.
              </p>
            </div>

            {/* Official Receipt Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Organization:</span>
                <span className="font-extrabold text-slate-900">{result?.tenant?.name || 'OmniStock Tenant'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Tier:</span>
                <span className="font-bold text-slate-800">{result?.plan?.name || 'Growth Professional'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-700">{result?.amount?.toLocaleString()} {result?.currency || 'ETB'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono text-slate-700 text-[11px]">{result?.tx_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-slate-700">Chapa (Ethiopia)</span>
              </div>
            </div>

            <button
              onClick={handleEnterWorkspace}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
            >
              <span>Launch Management Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Package, QrCode, ArrowLeft, Layers, 
  CheckCircle2, AlertCircle, Building2, ShieldCheck,
  Warehouse, ArrowRight, Tag, Boxes
} from 'lucide-react';
import { api } from '../services/api';

export const SkuTrackerView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [query, setQuery] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialCode) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  const handleLookup = async (codeToSearch) => {
    const code = (codeToSearch || query).trim();
    if (!code) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);
    setSearchParams({ code });

    try {
      const res = await api.lookupProduct(code);
      setResult(res.product);
    } catch (err) {
      setErrorMsg(`No product record found matching "${code}". Please verify the barcode format.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e?.preventDefault();
    handleLookup(query);
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
                Public SKU Verification
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center space-x-4 text-xs font-bold">
          <Link to="/" className="text-slate-600 hover:text-emerald-600">Home</Link>
          <Link to="/pricing" className="text-slate-600 hover:text-emerald-600">Pricing</Link>
          <Link to="/login" className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl">Tenant Sign In</Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <QrCode className="w-4 h-4" />
            <span>Universal Barcode & SKU Lookup Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Verify Product SKU & Stock Integrity
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Authorized supply chain partners and customers can lookup inventory records, batch lot specifications, and item authenticity.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Product SKU, Barcode, or EAN (e.g. 880192837401)"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/20 shrink-0 transition-all"
            >
              {loading ? 'Searching...' : 'Lookup Item'}
            </button>
          </form>

          {/* Quick Click Samples */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
            <span className="font-semibold">Quick verification samples:</span>
            {['880192837401', 'APX-LIDAR-V4', 'GL-ALM-100', '990182736451'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setQuery(code);
                  handleLookup(code);
                }}
                className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 rounded-lg text-slate-700 font-mono text-xs border border-slate-200 transition-colors"
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Search Error */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Product Result Card */}
        {result && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg">
                    {result.sku}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {result.brand || 'Enterprise'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">{result.name}</h2>
                <p className="text-xs text-slate-500 max-w-lg">{result.description}</p>
              </div>

              <div className="text-left sm:text-right bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="text-3xl font-black text-slate-900">
                  {result.total_stock} <span className="text-xs text-slate-500 font-bold">{result.unit_of_measure}</span>
                </div>
                <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center sm:justify-end space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Public Stock</span>
                </div>
              </div>
            </div>

            {/* Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium">Barcode / EAN</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{result.barcode || 'N/A'}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium">Category</span>
                <p className="font-bold text-slate-800 mt-0.5">{result.category_name || 'Standard'}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium">Unit Selling Price</span>
                <p className="font-bold text-slate-800 mt-0.5">${result.selling_price?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium">Ledger Status</span>
                <p className="font-bold text-emerald-600 mt-0.5">Active Catalog Item</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

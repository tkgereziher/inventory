import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  QrCode, Camera, Search, Sparkles, CheckCircle2, 
  ArrowDownLeft, ArrowUpRight, AlertCircle, Package, RefreshCw
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const BarcodeScannerView = () => {
  const { currentTenant } = useAuth();
  const [scanCode, setScanCode] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const scannerRef = useRef(null);

  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!currentTenant) return;
      try {
        const res = await api.getWarehouses();
        setWarehouses(res.warehouses || []);
        if (res.warehouses?.length > 0) {
          setSelectedWarehouseId(res.warehouses[0].id);
        }
      } catch {
        // ignore
      }
    };
    fetchWarehouses();
  }, [currentTenant]);

  const handleLookup = async (codeToLookup) => {
    const code = (codeToLookup || scanCode).trim();
    if (!code) return;

    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.lookupProduct(code);
      setScannedProduct(res.product);
      setMsg({ type: 'success', text: `Found product "${res.product.name}"` });
    } catch (err) {
      setScannedProduct(null);
      setMsg({ type: 'error', text: err.message || `No product found matching code "${code}"` });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStockIn = async () => {
    if (!scannedProduct || !selectedWarehouseId) return;
    try {
      await api.stockIn({
        product_id: scannedProduct.id,
        warehouse_id: selectedWarehouseId,
        quantity: quickQty,
        reason: 'Barcode Quick Scan Stock In'
      });
      setMsg({ type: 'success', text: `Successfully scanned and added ${quickQty} units to warehouse!` });
      handleLookup(scannedProduct.barcode || scannedProduct.sku);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleQuickStockOut = async () => {
    if (!scannedProduct || !selectedWarehouseId) return;
    try {
      await api.stockOut({
        product_id: scannedProduct.id,
        warehouse_id: selectedWarehouseId,
        quantity: quickQty,
        reason: 'Barcode Quick Scan Dispatch'
      });
      setMsg({ type: 'success', text: `Successfully scanned and dispatched ${quickQty} units!` });
      handleLookup(scannedProduct.barcode || scannedProduct.sku);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  // Start Camera Scanner
  useEffect(() => {
    let scanner = null;
    if (cameraActive) {
      scanner = new Html5QrcodeScanner(
        "barcode-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          let code = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.barcode || parsed.sku) {
              code = parsed.barcode || parsed.sku;
            }
          } catch {
            // Raw code
          }
          setScanCode(code);
          handleLookup(code);
          setCameraActive(false);
          scanner.clear();
        },
        () => {}
      );
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [cameraActive]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-emerald-600" />
          <span>Barcode & QR Rapid Scanning Station</span>
        </h1>
        <p className="text-xs text-slate-500">
          Instant SKU lookup, camera barcode recognition, and rapid 1-click warehouse intake/dispatch
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Input Panel */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Scan or Enter Code
          </h2>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Scan Barcode or Type SKU (e.g. 880192837401)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleLookup()}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-emerald-600"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCameraActive(!cameraActive)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  cameraActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>{cameraActive ? 'Close Camera' : 'Open Camera Scanner'}</span>
              </button>

              <button
                onClick={() => handleLookup()}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lookup'}
              </button>
            </div>
          </div>

          {/* Camera Scanner Container */}
          {cameraActive && (
            <div className="pt-3">
              <div id="barcode-reader" className="overflow-hidden rounded-xl border border-slate-300"></div>
            </div>
          )}

          {/* Feedback messages */}
          {msg.text && (
            <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          {/* Quick Demo Barcodes */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Test Sample Barcodes:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {['880192837401', '880192837402', '880192837405', '770112233441', '990182736451'].map(code => (
                <button
                  key={code}
                  onClick={() => { setScanCode(code); handleLookup(code); }}
                  className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[10px] font-mono rounded border border-slate-200 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Details & Rapid Action Deck */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4 border border-slate-200">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Scanned Item Summary & Rapid Operations
            </h2>

            {scannedProduct ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {scannedProduct.sku}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{scannedProduct.name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Category: <span className="text-slate-800 font-semibold">{scannedProduct.category_name || 'N/A'}</span> • Brand: <span className="text-slate-800 font-semibold">{scannedProduct.brand || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900">
                      {scannedProduct.total_stock} <span className="text-xs text-slate-500 font-normal">{scannedProduct.unit_of_measure}</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-bold mt-0.5">
                      Price: ${scannedProduct.selling_price?.toFixed(2)} (Cost: ${scannedProduct.cost_price?.toFixed(2)})
                    </div>
                  </div>
                </div>

                {/* Stock distribution per warehouse */}
                {scannedProduct.warehouse_stock?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500">Warehouse Location Breakdown:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {scannedProduct.warehouse_stock.map((ws, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                          <div className="text-slate-500 font-medium text-[11px]">{ws.warehouse_name}</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">{ws.quantity_on_hand} units</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Scan or search a barcode above to load the live inventory record and perform quick operations.
              </div>
            )}
          </div>

          {/* Rapid Action Dock */}
          {scannedProduct && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Warehouse Hub</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div className="w-28">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Scan Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleQuickStockIn}
                  className="flex items-center justify-center space-x-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Rapid Stock In (+{quickQty})</span>
                </button>

                <button
                  onClick={handleQuickStockOut}
                  className="flex items-center justify-center space-x-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Rapid Dispatch (-{quickQty})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

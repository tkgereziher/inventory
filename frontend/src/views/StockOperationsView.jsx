import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ArrowLeftRight, ArrowDownLeft, ArrowUpRight, 
  Scale, Truck, CheckCircle2, AlertCircle, RefreshCw, Check
} from 'lucide-react';

export const StockOperationsView = () => {
  const { currentTenant } = useAuth();
  const [activeTab, setActiveTab] = useState('stock_in');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Form states
  const [stockInForm, setStockInForm] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: '',
    unit_cost: '',
    batch_number: '',
    expiry_date: '',
    reason: 'Goods Receipt'
  });

  const [stockOutForm, setStockOutForm] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: '',
    batch_number: '',
    reason: 'Dispatch'
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    product_id: '',
    warehouse_id: '',
    new_quantity: '',
    reason: 'Physical Cycle Count Audit'
  });

  const [transferForm, setTransferForm] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    product_id: '',
    quantity: '',
    notes: 'Internal stock balancing transfer'
  });

  const loadBaseData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [prodRes, whRes, trfRes] = await Promise.all([
        api.getProducts(),
        api.getWarehouses(),
        api.getTransfers()
      ]);
      setProducts(prodRes.products || []);
      setWarehouses(whRes.warehouses || []);
      setTransfers(trfRes.transfers || []);

      if (prodRes.products?.length > 0) {
        setStockInForm(p => ({ ...p, product_id: p.product_id || prodRes.products[0].id }));
        setStockOutForm(p => ({ ...p, product_id: p.product_id || prodRes.products[0].id }));
        setAdjustmentForm(p => ({ ...p, product_id: p.product_id || prodRes.products[0].id }));
        setTransferForm(p => ({ ...p, product_id: p.product_id || prodRes.products[0].id }));
      }
      if (whRes.warehouses?.length > 0) {
        setStockInForm(p => ({ ...p, warehouse_id: p.warehouse_id || whRes.warehouses[0].id }));
        setStockOutForm(p => ({ ...p, warehouse_id: p.warehouse_id || whRes.warehouses[0].id }));
        setAdjustmentForm(p => ({ ...p, warehouse_id: p.warehouse_id || whRes.warehouses[0].id }));
        setTransferForm(p => ({
          ...p,
          source_warehouse_id: p.source_warehouse_id || whRes.warehouses[0].id,
          destination_warehouse_id: p.destination_warehouse_id || (whRes.warehouses[1]?.id || whRes.warehouses[0].id)
        }));
      }
    } catch (err) {
      console.error('Error loading operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [currentTenant]);

  const handleStockIn = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.stockIn(stockInForm);
      setMsg({ type: 'success', text: `Successfully received ${stockInForm.quantity} units into inventory!` });
      setStockInForm(prev => ({ ...prev, quantity: '', batch_number: '' }));
      loadBaseData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleStockOut = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.stockOut(stockOutForm);
      setMsg({ type: 'success', text: `Successfully dispatched ${stockOutForm.quantity} units!` });
      setStockOutForm(prev => ({ ...prev, quantity: '' }));
      loadBaseData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleAdjustment = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.stockAdjustment(adjustmentForm);
      setMsg({ type: 'success', text: `Physical count adjusted to ${adjustmentForm.new_quantity} units!` });
      setAdjustmentForm(prev => ({ ...prev, new_quantity: '' }));
      loadBaseData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.createTransfer({
        source_warehouse_id: transferForm.source_warehouse_id,
        destination_warehouse_id: transferForm.destination_warehouse_id,
        notes: transferForm.notes,
        items: [{ product_id: transferForm.product_id, quantity: transferForm.quantity }]
      });
      setMsg({ type: 'success', text: 'Transfer created and stock moved into transit!' });
      setTransferForm(prev => ({ ...prev, quantity: '' }));
      loadBaseData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleReceiveTransfer = async (id) => {
    try {
      await api.receiveTransfer(id);
      setMsg({ type: 'success', text: 'Transfer items verified and received at destination hub!' });
      loadBaseData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
          <span>Stock Operations & Logistics Center</span>
        </h1>
        <p className="text-xs text-slate-500">
          Execute Goods Receipts, Dispatches, Cycle Count Reconciliations, and Inter-Warehouse Transfers
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTab('stock_in'); setMsg({ type: '', text: '' }); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stock_in'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Stock In (Receipt)</span>
        </button>

        <button
          onClick={() => { setActiveTab('stock_out'); setMsg({ type: '', text: '' }); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stock_out'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Stock Out (Dispatch)</span>
        </button>

        <button
          onClick={() => { setActiveTab('adjustment'); setMsg({ type: '', text: '' }); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'adjustment'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Cycle Count Adjustment</span>
        </button>

        <button
          onClick={() => { setActiveTab('transfer'); setMsg({ type: '', text: '' }); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'transfer'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Inter-Warehouse Transfer</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
          msg.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      {/* 1. STOCK IN FORM */}
      {activeTab === 'stock_in' && (
        <div className="glass-panel p-6 rounded-2xl max-w-2xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Direct Goods Receipt Intake</span>
          </h2>

          <form onSubmit={handleStockIn} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Product SKU *</label>
                <select
                  required
                  value={stockInForm.product_id}
                  onChange={(e) => setStockInForm({ ...stockInForm, product_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Warehouse Hub *</label>
                <select
                  required
                  value={stockInForm.warehouse_id}
                  onChange={(e) => setStockInForm({ ...stockInForm, warehouse_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Received *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={stockInForm.unit_cost}
                  onChange={(e) => setStockInForm({ ...stockInForm, unit_cost: e.target.value })}
                  placeholder="Optional cost override"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Lot Number</label>
                <input
                  type="text"
                  value={stockInForm.batch_number}
                  onChange={(e) => setStockInForm({ ...stockInForm, batch_number: e.target.value })}
                  placeholder="e.g. LOT-2026-09"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration Date (If Perishable)</label>
                <input
                  type="date"
                  value={stockInForm.expiry_date}
                  onChange={(e) => setStockInForm({ ...stockInForm, expiry_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Note / Reason</label>
                <input
                  type="text"
                  value={stockInForm.reason}
                  onChange={(e) => setStockInForm({ ...stockInForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20"
              >
                Confirm Stock In
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. STOCK OUT FORM */}
      {activeTab === 'stock_out' && (
        <div className="glass-panel p-6 rounded-2xl max-w-2xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Stock Dispatch / Consumption</span>
          </h2>

          <form onSubmit={handleStockOut} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product SKU *</label>
                <select
                  required
                  value={stockOutForm.product_id}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, product_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Available: {p.total_stock}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatching Warehouse *</label>
                <select
                  required
                  value={stockOutForm.warehouse_id}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, warehouse_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Deduct *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={stockOutForm.quantity}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Purpose</label>
                <select
                  value={stockOutForm.reason}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Customer Dispatch">Customer Dispatch</option>
                  <option value="Damaged / Write-off">Damaged / Write-off</option>
                  <option value="Internal Factory Consumption">Internal Factory Consumption</option>
                  <option value="Sample for Quality Lab">Sample for Quality Lab</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/20"
              >
                Confirm Dispatch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CYCLE COUNT ADJUSTMENT */}
      {activeTab === 'adjustment' && (
        <div className="glass-panel p-6 rounded-2xl max-w-2xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Scale className="w-4 h-4 text-amber-600" />
            <span>Cycle Count Reconciliation</span>
          </h2>

          <form onSubmit={handleAdjustment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product *</label>
                <select
                  required
                  value={adjustmentForm.product_id}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, product_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse *</label>
                <select
                  required
                  value={adjustmentForm.warehouse_id}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, warehouse_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Physical Count (New Quantity) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustmentForm.new_quantity}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, new_quantity: e.target.value })}
                  placeholder="e.g. 150"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md shadow-amber-600/20"
              >
                Reconcile Stock Balance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. INTER-WAREHOUSE TRANSFER */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl max-w-3xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Initiate Inter-Warehouse Transfer</span>
            </h2>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Origin / Source Warehouse *</label>
                  <select
                    required
                    value={transferForm.source_warehouse_id}
                    onChange={(e) => setTransferForm({ ...transferForm, source_warehouse_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Warehouse *</label>
                  <select
                    required
                    value={transferForm.destination_warehouse_id}
                    onChange={(e) => setTransferForm({ ...transferForm, destination_warehouse_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product to Transfer *</label>
                  <select
                    required
                    value={transferForm.product_id}
                    onChange={(e) => setTransferForm({ ...transferForm, product_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Units *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                    placeholder="e.g. 20"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20"
                >
                  Ship & Put in Transit
                </button>
              </div>
            </form>
          </div>

          {/* Transfers Status List */}
          <div className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active & Historic Transfer Orders ({transfers.length})
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Transfer Ref</th>
                    <th className="px-4 py-3">Source Warehouse</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Total Units</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">
                        No transfer orders found.
                      </td>
                    </tr>
                  ) : (
                    transfers.map(trf => (
                      <tr key={trf.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{trf.transfer_number}</td>
                        <td className="px-4 py-3 text-slate-800">{trf.source_warehouse_name}</td>
                        <td className="px-4 py-3 text-slate-800">{trf.destination_warehouse_name}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{trf.total_units}</td>
                        <td className="px-4 py-3">
                          {trf.status === 'IN_TRANSIT' ? (
                            <span className="badge-amber">In Transit</span>
                          ) : (
                            <span className="badge-green">Received</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {trf.status === 'IN_TRANSIT' && (
                            <button
                              onClick={() => handleReceiveTransfer(trf.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                            >
                              Receive at Dest
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

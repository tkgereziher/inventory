import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ShoppingCart, Plus, Search, RefreshCw, X, 
  CheckCircle2, DollarSign, Calendar, Truck
} from 'lucide-react';

export const PurchaseOrdersView = () => {
  const { currentTenant } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for new PO
  const [formData, setFormData] = useState({
    supplier_id: '',
    warehouse_id: '',
    expected_date: '',
    notes: '',
    items: []
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [poRes, supRes, whRes, prodRes] = await Promise.all([
        api.getPurchaseOrders(),
        api.getSuppliers(),
        api.getWarehouses(),
        api.getProducts()
      ]);
      setPurchaseOrders(poRes.purchase_orders || []);
      setSuppliers(supRes.suppliers || []);
      setWarehouses(whRes.warehouses || []);
      setProducts(prodRes.products || []);
    } catch (err) {
      console.error('Error loading purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const handleOpenCreate = () => {
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      warehouse_id: warehouses[0]?.id || '',
      expected_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: 'Standard procurement replenishment',
      items: products[0] ? [{ product_id: products[0].id, quantity_ordered: 50, unit_price: products[0].cost_price }] : []
    });
    setFormError('');
    setShowCreateModal(true);
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0].id, quantity_ordered: 20, unit_price: products[0].cost_price }]
    }));
  };

  const removeItemRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const updateItemRow = (idx, field, val) => {
    setFormData(prev => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'product_id') {
        const prod = products.find(p => p.id === val);
        if (prod) next[idx].unit_price = prod.cost_price;
      }
      return { ...prev, items: next };
    });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.supplier_id || !formData.warehouse_id || formData.items.length === 0) {
      setFormError('Supplier, warehouse, and at least one item are required');
      return;
    }

    try {
      setSaving(true);
      await api.createPurchaseOrder(formData);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReceiveGoods = async (po) => {
    try {
      const receivePayload = {
        items: po.items.map(item => ({
          item_id: item.id,
          quantity_to_receive: item.quantity_ordered - item.quantity_received
        }))
      };
      await api.receivePurchaseOrder(po.id, receivePayload);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.quantity_ordered || 0) * Number(item.unit_price || 0)), 0);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <span>Inbound Procurement & Purchase Orders</span>
          </h1>
          <p className="text-xs text-slate-500">
            Issue orders to vendors and receive incoming stock directly into warehouse hubs
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* PO List Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Destination Hub</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Units (Rec/Ord)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No purchase orders found. Click "Create Purchase Order" to start procurement.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const isCompleted = po.status === 'COMPLETED';
                  const isPartiallyReceived = po.status === 'PARTIALLY_RECEIVED';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {po.po_number}
                        <div className="text-[10px] text-slate-500 font-sans">{po.order_date}</div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {po.supplier_name}
                      </td>

                      <td className="px-4 py-3 text-slate-800">
                        {po.warehouse_name}
                      </td>

                      <td className="px-4 py-3 font-bold text-emerald-700">
                        ${(po.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{po.total_units_received || 0}</span>
                        <span className="text-slate-500"> / {po.total_units_ordered || 0}</span>
                      </td>

                      <td className="px-4 py-3">
                        {isCompleted && <span className="badge-green">Completed</span>}
                        {isPartiallyReceived && <span className="badge-blue">Partially Received</span>}
                        {!isCompleted && !isPartiallyReceived && <span className="badge-amber">Ordered</span>}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {!isCompleted && (
                          <button
                            onClick={() => handleReceiveGoods(po)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            Receive Goods
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <span>Create Purchase Order (Procurement)</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Vendor *</label>
                  <select
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Warehouse *</label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Purchase Line Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-emerald-700 hover:underline font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItemRow(idx, 'product_id', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItemRow(idx, 'quantity_ordered', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Unit Cost"
                          value={item.unit_price}
                          onChange={(e) => updateItemRow(idx, 'unit_price', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div className="w-24 text-right font-mono text-xs font-bold text-emerald-700 pr-2">
                        ${((Number(item.quantity_ordered) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary & Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Total Order Valuation: <strong className="text-emerald-700 text-sm ml-1 font-bold">${calculateTotal().toFixed(2)}</strong>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20"
                  >
                    {saving ? 'Placing Order...' : 'Confirm Purchase Order'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

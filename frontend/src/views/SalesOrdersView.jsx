import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Truck, Plus, Search, RefreshCw, X, 
  CheckCircle2, DollarSign, Calendar, User
} from 'lucide-react';

export const SalesOrdersView = () => {
  const { currentTenant } = useAuth();
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for new SO
  const [formData, setFormData] = useState({
    customer_id: '',
    warehouse_id: '',
    shipping_address: '',
    items: []
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [soRes, custRes, whRes, prodRes] = await Promise.all([
        api.getSalesOrders(),
        api.getCustomers(),
        api.getWarehouses(),
        api.getProducts()
      ]);
      setSalesOrders(soRes.sales_orders || []);
      setCustomers(custRes.customers || []);
      setWarehouses(whRes.warehouses || []);
      setProducts(prodRes.products || []);
    } catch (err) {
      console.error('Error loading sales orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const handleOpenCreate = () => {
    setFormData({
      customer_id: customers[0]?.id || '',
      warehouse_id: warehouses[0]?.id || '',
      shipping_address: 'Enterprise Delivery Dock #4',
      items: products[0] ? [{ product_id: products[0].id, quantity_ordered: 5, unit_price: products[0].selling_price }] : []
    });
    setFormError('');
    setShowCreateModal(true);
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0].id, quantity_ordered: 2, unit_price: products[0].selling_price }]
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
        if (prod) next[idx].unit_price = prod.selling_price;
      }
      return { ...prev, items: next };
    });
  };

  const handleCreateSO = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.customer_id || !formData.warehouse_id || formData.items.length === 0) {
      setFormError('Customer, warehouse, and at least one item are required');
      return;
    }

    try {
      setSaving(true);
      await api.createSalesOrder(formData);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFulfillOrder = async (id) => {
    try {
      await api.fulfillSalesOrder(id);
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
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>Sales Orders & Outbound Fulfillment</span>
          </h1>
          <p className="text-xs text-slate-500">
            Fulfill client orders and automatically deduct stock from assigned warehouse locations
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sales Order</span>
        </button>
      </div>

      {/* SO List Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">SO Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Dispatch Hub</th>
                <th className="px-4 py-3">Order Total</th>
                <th className="px-4 py-3">Units (Shipped/Ordered)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading sales orders...
                  </td>
                </tr>
              ) : salesOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No sales orders found. Click "Create Sales Order" to start fulfillment.
                  </td>
                </tr>
              ) : (
                salesOrders.map((so) => {
                  const isShipped = so.status === 'SHIPPED' || so.status === 'DELIVERED';

                  return (
                    <tr key={so.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {so.so_number}
                        <div className="text-[10px] text-slate-500 font-sans">{so.order_date}</div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {so.customer_name}
                      </td>

                      <td className="px-4 py-3 text-slate-800">
                        {so.warehouse_name}
                      </td>

                      <td className="px-4 py-3 font-bold text-emerald-700">
                        ${(so.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{so.total_units_shipped || 0}</span>
                        <span className="text-slate-500"> / {so.total_units_ordered || 0}</span>
                      </td>

                      <td className="px-4 py-3">
                        {isShipped ? (
                          <span className="badge-green">Shipped</span>
                        ) : (
                          <span className="badge-purple">Confirmed</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {!isShipped && (
                          <button
                            onClick={() => handleFulfillOrder(so.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            Pick & Ship
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

      {/* Create SO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>Create Outbound Sales Order</span>
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

            <form onSubmit={handleCreateSO} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Account *</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatching Warehouse *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Destination</label>
                  <input
                    type="text"
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sales Line Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-emerald-700 hover:underline font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
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
                            <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Avail: {p.total_stock}</option>
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
                          placeholder="Price ($)"
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

              {/* Summary & Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Total Order Value: <strong className="text-emerald-700 text-sm ml-1 font-bold">${calculateTotal().toFixed(2)}</strong>
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
                    {saving ? 'Creating Order...' : 'Confirm Sales Order'}
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

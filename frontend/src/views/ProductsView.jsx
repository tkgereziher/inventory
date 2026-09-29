import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Package, Search, Plus, Filter, QrCode, Edit2, 
  Trash2, AlertTriangle, RefreshCw, Check, X, Printer, Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const ProductsView = () => {
  const { currentTenant } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    brand: '',
    unit_of_measure: 'pcs',
    cost_price: '',
    selling_price: '',
    reorder_point: 10,
    reorder_quantity: 50,
    description: '',
    initial_warehouse_id: '',
    initial_quantity: ''
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [prodRes, catRes, whRes] = await Promise.all([
        api.getProducts({ search, category_id: categoryId, stock_status: stockStatus }),
        api.getCategories(),
        api.getWarehouses()
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setWarehouses(whRes.warehouses || []);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant, search, categoryId, stockStatus]);

  const generateRandomSku = () => {
    const prefix = formData.name ? formData.name.substring(0, 3).toUpperCase() : 'SKU';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({ ...prev, sku: `${prefix}-${rand}` }));
  };

  const generateRandomBarcode = () => {
    const rand = `880${Math.floor(100000000 + Math.random() * 900000000)}`;
    setFormData(prev => ({ ...prev, barcode: rand }));
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      barcode: `880${Math.floor(100000000 + Math.random() * 900000000)}`,
      category_id: categories[0]?.id || '',
      brand: '',
      unit_of_measure: 'pcs',
      cost_price: '',
      selling_price: '',
      reorder_point: 10,
      reorder_quantity: 50,
      description: '',
      initial_warehouse_id: warehouses[0]?.id || '',
      initial_quantity: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category_id: p.category_id || '',
      brand: p.brand || '',
      unit_of_measure: p.unit_of_measure || 'pcs',
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      reorder_point: p.reorder_point,
      reorder_quantity: p.reorder_quantity,
      description: p.description || '',
      initial_warehouse_id: '',
      initial_quantity: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name) {
      setFormError('Product title is required');
      return;
    }

    try {
      setSaving(true);
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await api.deleteProduct(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Product Catalog & Stock Matrix</span>
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive SKU list, batch barcodes, and real-time inventory on hand
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-3.5 rounded-xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, Barcode, Product Name, Brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
        >
          <option value="">All Stock Levels</option>
          <option value="IN_STOCK">In Stock (Normal)</option>
          <option value="LOW_STOCK">Low Stock (At/Below Threshold)</option>
          <option value="OUT_OF_STOCK">Out of Stock (Zero)</option>
        </select>

        <button
          onClick={loadData}
          className="p-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 text-slate-600 shadow-sm"
          title="Refresh table"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Product / SKU</th>
                <th className="px-4 py-3">Category / Brand</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Cost / Sell</th>
                <th className="px-4 py-3">Stock on Hand</th>
                <th className="px-4 py-3">Valuation</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOutOfStock = p.total_stock <= 0;
                  const isLowStock = p.total_stock > 0 && p.total_stock <= p.reorder_point;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] font-mono font-bold text-emerald-700">{p.sku}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-800">{p.category_name || 'Unassigned'}</div>
                        <div className="text-[10px] text-slate-500">{p.brand || '—'}</div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => setBarcodePreviewProduct(p)}
                          className="flex items-center space-x-1 font-mono text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:border-emerald-500 text-slate-700 font-semibold"
                          title="Click to view & print Barcode / QR label"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{p.barcode || 'Generate'}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">${p.selling_price.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">Cost: ${p.cost_price.toFixed(2)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {p.total_stock} {p.unit_of_measure}
                          </span>
                          {isOutOfStock && <span className="badge-red">Out of Stock</span>}
                          {isLowStock && <span className="badge-amber">Low ({p.reorder_point})</span>}
                          {!isOutOfStock && !isLowStock && <span className="badge-green">Optimal</span>}
                        </div>
                        {p.warehouse_stock?.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {p.warehouse_stock.map(wh => `${wh.warehouse_code}: ${wh.quantity_on_hand}`).join(' | ')}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-emerald-700">
                        ${(p.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shadow-sm"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-rose-600 rounded-lg shadow-sm"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>{editingProduct ? 'Edit Product SKU' : 'Add New Inventory SKU'}</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Microcontroller STM32F407 or Industrial Valve"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>SKU Code *</span>
                    <button type="button" onClick={generateRandomSku} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center space-x-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Auto Gen</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Barcode / UPC *</span>
                    <button type="button" onClick={generateRandomBarcode} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center space-x-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Auto Gen</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. ApexCore or Bosch"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Alert Threshold</label>
                  <input
                    type="number"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="meters">Meters (m)</option>
                    <option value="liters">Liters (L)</option>
                  </select>
                </div>

                {/* Initial Stock (Only for new items) */}
                {!editingProduct && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Warehouse</label>
                      <select
                        value={formData.initial_warehouse_id}
                        onChange={(e) => setFormData({ ...formData, initial_warehouse_id: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">No initial stock</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Quantity</label>
                      <input
                        type="number"
                        value={formData.initial_quantity}
                        onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode & QR Sticker Preview Modal */}
      {barcodePreviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Barcode & QR Asset Label</span>
              </h2>
              <button onClick={() => setBarcodePreviewProduct(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Label Card */}
            <div className="mt-4 p-5 bg-slate-50 text-slate-900 rounded-xl shadow-inner border border-slate-200 space-y-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {currentTenant?.name}
              </div>

              <div className="font-extrabold text-sm text-slate-900 leading-tight">
                {barcodePreviewProduct.name}
              </div>

              <div className="flex items-center justify-center py-2 bg-white p-3 rounded-lg border border-slate-200 mx-auto w-fit">
                <QRCodeSVG
                  value={JSON.stringify({
                    tenant: currentTenant?.slug,
                    sku: barcodePreviewProduct.sku,
                    barcode: barcodePreviewProduct.barcode,
                    name: barcodePreviewProduct.name
                  })}
                  size={120}
                  level="H"
                />
              </div>

              <div className="font-mono text-base font-black tracking-widest text-slate-900 border-t border-dashed border-slate-300 pt-2">
                {barcodePreviewProduct.barcode}
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-600 px-2 font-bold">
                <span>SKU: {barcodePreviewProduct.sku}</span>
                <span>Price: ${barcodePreviewProduct.selling_price.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

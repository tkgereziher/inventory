import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Warehouse, Plus, MapPin, Package, DollarSign, 
  Layers, RefreshCw, X, Check, ArrowRight
} from 'lucide-react';

export const WarehousesView = () => {
  const { currentTenant } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseDetail, setWarehouseDetail] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    capacity_sqm: 5000,
    manager_name: ''
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadWarehouses = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const res = await api.getWarehouses();
      setWarehouses(res.warehouses || []);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseDetail = async (id) => {
    try {
      const res = await api.getWarehouse(id);
      setWarehouseDetail(res);
    } catch (err) {
      console.error('Failed to load warehouse detail:', err);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, [currentTenant]);

  const handleSelectWarehouse = (wh) => {
    setSelectedWarehouse(wh);
    loadWarehouseDetail(wh.id);
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.code) {
      setFormError('Warehouse name and code are required');
      return;
    }

    try {
      setSaving(true);
      await api.createWarehouse(formData);
      setShowAddModal(false);
      loadWarehouses();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Warehouse className="w-5 h-5 text-emerald-600" />
            <span>Warehouses & Storage Locations</span>
          </h1>
          <p className="text-xs text-slate-500">
            Multi-site distribution hubs, storage bins, zones, and capacity utilization
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              code: `WH-${Math.floor(100 + Math.random() * 900)}`,
              address: '',
              city: '',
              country: '',
              capacity_sqm: 5000,
              manager_name: ''
            });
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Warehouse Hub</span>
        </button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading warehouses...
          </div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No warehouses found. Click "Add Warehouse Hub" to create your first storage location.
          </div>
        ) : (
          warehouses.map((wh) => (
            <div
              key={wh.id}
              onClick={() => handleSelectWarehouse(wh)}
              className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                      {wh.code}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-emerald-700 transition-colors">
                      {wh.name}
                    </h2>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all">
                    <Warehouse className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{wh.city ? `${wh.city}, ${wh.country || ''}` : 'Location unassigned'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">SKUs</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{wh.total_skus}</div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Units</div>
                  <div className="text-xs font-bold text-sky-700 mt-0.5">{wh.total_units.toLocaleString()}</div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Valuation</div>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">
                    ${(wh.total_valuation || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Warehouse Detail Modal */}
      {selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                    {selectedWarehouse.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{selectedWarehouse.name}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manager: {selectedWarehouse.manager_name || 'Unassigned'} • Capacity: {selectedWarehouse.capacity_sqm} m²
                </p>
              </div>
              <button onClick={() => setSelectedWarehouse(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inventory Items in this warehouse */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Items Stored at this Location ({warehouseDetail?.inventory?.length || 0} active SKUs)
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Batch / Lot</th>
                      <th className="px-3 py-2">Quantity</th>
                      <th className="px-3 py-2">Cost Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warehouseDetail?.inventory?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-500">
                          No items currently in this warehouse.
                        </td>
                      </tr>
                    ) : (
                      warehouseDetail?.inventory?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-900">{item.product_name}</td>
                          <td className="px-3 py-2 font-mono text-emerald-700 font-bold text-[11px]">{item.sku}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{item.batch_number || 'Standard'}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{item.quantity_on_hand} {item.unit_of_measure}</td>
                          <td className="px-3 py-2 text-emerald-700 font-bold">${(item.quantity_on_hand * item.cost_price).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Warehouse className="w-5 h-5 text-emerald-600" />
                <span>Add Warehouse Facility</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dallas Central Logistics Hub"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH-DAL1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (m²)</label>
                  <input
                    type="number"
                    value={formData.capacity_sqm}
                    onChange={(e) => setFormData({ ...formData, capacity_sqm: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Dallas, TX"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. USA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Manager</label>
                <input
                  type="text"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
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
                  {saving ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

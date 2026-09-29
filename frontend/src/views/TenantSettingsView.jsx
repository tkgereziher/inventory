import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Building2, Users, Shield, Plus, Key, 
  CheckCircle2, RefreshCw, X, CreditCard, Sparkles,
  ArrowRight, ShieldCheck, Warehouse, Package
} from 'lucide-react';
import { ChapaPaymentModal } from '../components/ChapaPaymentModal';

export const TenantSettingsView = () => {
  const { currentTenant, setAuthSession } = useAuth();
  const [users, setUsers] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showChapaModal, setShowChapaModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAREHOUSE_STAFF'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [usersRes, subRes, plansRes] = await Promise.all([
        api.getUsers(),
        api.getCurrentSubscription().catch(() => ({})),
        api.getSubscriptionPlans().catch(() => ({ plans: [] }))
      ]);

      setUsers(usersRes.users || []);
      setSubscriptionData(subRes || null);
      setPlans(plansRes.plans || []);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await api.createUser(newUser);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'WAREHOUSE_STAFF' });
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenUpgrade = (plan) => {
    setUpgradePlan(plan);
    setShowChapaModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <span>Tenant Organization & Billing Management</span>
        </h1>
        <p className="text-xs text-slate-500">
          Manage organization profiles, Chapa subscription plans, quota limits, and team access.
        </p>
      </div>

      {/* Subscription & Chapa Billing Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-3xl text-white shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
              <Sparkles className="w-3 h-3" />
              <span>Chapa Active Plan: {subscriptionData?.subscription?.plan_name || currentTenant?.plan || 'Growth Pro'}</span>
            </div>
            <h2 className="text-xl font-black">{currentTenant?.name}</h2>
            <p className="text-xs text-slate-300">
              Billing Status: <span className="font-bold text-emerald-400">Active</span> • Powered by Chapa Gateway (ETB)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const targetPlan = plans.find(p => p.code === 'ENTERPRISE') || plans[2] || plans[0];
                handleOpenUpgrade(targetPlan);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center space-x-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Upgrade / Renew via Chapa</span>
            </button>
          </div>
        </div>

        {/* Quota Usage Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <div className="text-slate-400 text-[11px] font-medium">Team Members</div>
            <div className="text-lg font-black text-white mt-0.5">
              {subscriptionData?.usage?.users || users.length} <span className="text-xs text-slate-400 font-normal">/ {subscriptionData?.subscription?.max_users || 15} Max</span>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <div className="text-slate-400 text-[11px] font-medium">Active Warehouses</div>
            <div className="text-lg font-black text-white mt-0.5">
              {subscriptionData?.usage?.warehouses || 2} <span className="text-xs text-slate-400 font-normal">/ {subscriptionData?.subscription?.max_warehouses || 5} Max</span>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <div className="text-slate-400 text-[11px] font-medium">Catalog SKUs</div>
            <div className="text-lg font-black text-white mt-0.5">
              {subscriptionData?.usage?.products || 6} <span className="text-xs text-slate-400 font-normal">/ {subscriptionData?.subscription?.max_products || 5000} Max</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Profile Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Organization Profile & Tenant Data Scope
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Tenant Name</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{currentTenant?.name}</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Tenant Identifier / Slug</div>
            <div className="text-sm font-mono font-bold text-emerald-700 mt-1">{currentTenant?.slug}</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Data Isolation Mode</div>
            <div className="text-sm font-bold text-sky-700 mt-1">Row-Level Partitioning</div>
          </div>
        </div>
      </div>

      {/* Chapa Payment History */}
      {subscriptionData?.recent_payments && subscriptionData.recent_payments.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Chapa Transactions & Payment Invoices</span>
            </h2>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Transaction Reference</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {subscriptionData.recent_payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.tx_ref}</td>
                    <td className="px-4 py-3 capitalize">{p.payment_channel || 'Chapa'}</td>
                    <td className="px-4 py-3 font-black text-emerald-700">{p.amount.toLocaleString()} {p.currency}</td>
                    <td className="px-4 py-3">
                      <span className="badge-green">{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users & Team List */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Team Members & Role-Based Access ({users.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Users are restricted solely to this organization's database scope
            </p>
          </div>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Invite / Add User</span>
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Member Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-1" />
                    Loading team members...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-green">Active</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Add Team Member</span>
              </h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Alex Hunter"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="alex@company.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RBAC Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                  <option value="MANAGER">Inventory Manager</option>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="AUDITOR">Compliance Auditor</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20"
                >
                  {saving ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade with Chapa Modal */}
      <ChapaPaymentModal
        isOpen={showChapaModal}
        onClose={() => setShowChapaModal(false)}
        plan={upgradePlan}
        tenantInfo={{
          name: currentTenant?.name,
          email: users[0]?.email,
          phone: '0911234567'
        }}
        onPaymentSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};

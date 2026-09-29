import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize tenants and user on startup
  const init = async () => {
    try {
      setLoading(true);
      const tenantRes = await api.getTenants();
      setTenants(tenantRes.tenants || []);

      const savedTenantId = localStorage.getItem('omni_tenant_id');
      const matchedTenant = tenantRes.tenants?.find(t => t.id === savedTenantId) || tenantRes.tenants?.[0];

      if (matchedTenant) {
        setCurrentTenant(matchedTenant);
        localStorage.setItem('omni_tenant_id', matchedTenant.id);
      }

      // Check for valid token
      const token = localStorage.getItem('omni_token');
      if (token) {
        try {
          const meRes = await api.getMe();
          if (meRes?.user) {
            setUser(meRes.user);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('omni_token');
        }
      }
    } catch (err) {
      console.error('Failed to initialize auth/tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const login = async (email, password, tenantId = null) => {
    setAuthError(null);
    try {
      const activeTenant = tenantId || currentTenant?.id;
      const res = await api.login(email, password, activeTenant);
      localStorage.setItem('omni_token', res.token);
      localStorage.setItem('omni_tenant_id', res.user.tenant_id);
      setUser(res.user);

      const matched = tenants.find(t => t.id === res.user.tenant_id);
      if (matched) setCurrentTenant(matched);

      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('omni_token');
    setUser(null);
  };

  const switchTenant = (tenantId) => {
    const target = tenants.find(t => t.id === tenantId);
    if (target) {
      setCurrentTenant(target);
      localStorage.setItem('omni_tenant_id', target.id);
      // Auto refresh current view
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: target }));
    }
  };

  const quickDemoLogin = async (slug) => {
    try {
      let email = 'admin@apex.com';
      if (slug === 'greenleaf-organics') email = 'admin@greenleaf.com';
      if (slug === 'titan-industrial') email = 'admin@titan.com';

      const tenant = tenants.find(t => t.slug === slug);
      if (tenant) {
        setCurrentTenant(tenant);
        localStorage.setItem('omni_tenant_id', tenant.id);
      }

      await login(email, 'Password123!', tenant?.id);
    } catch (err) {
      console.error('Quick demo login error:', err);
    }
  };

  const setAuthSession = (token, newUser, newTenant) => {
    if (token) localStorage.setItem('omni_token', token);
    if (newUser?.tenant_id || newTenant?.id) {
      localStorage.setItem('omni_tenant_id', newUser?.tenant_id || newTenant?.id);
    }
    if (newUser) setUser(newUser);
    if (newTenant) setCurrentTenant(newTenant);
    init();
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenants,
      currentTenant,
      loading,
      authError,
      login,
      logout,
      switchTenant,
      quickDemoLogin,
      setAuthSession,
      refreshTenants: init
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const API_BASE = '/api';

export const getHeaders = () => {
  const token = localStorage.getItem('omni_token');
  const tenantId = localStorage.getItem('omni_tenant_id');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  return headers;
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  // Auth
  login: (email, password, tenant_id) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, tenant_id }) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Tenants
  getTenants: () => request('/tenants'),
  getTenant: (id) => request(`/tenants/${id}`),

  // Products & Categories
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? '?' + query : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/products/categories'),
  createCategory: (body) => request('/products/categories', { method: 'POST', body: JSON.stringify(body) }),
  lookupProduct: (code) => request(`/products/lookup/${encodeURIComponent(code)}`),

  // Warehouses
  getWarehouses: () => request('/warehouses'),
  getWarehouse: (id) => request(`/warehouses/${id}`),
  createWarehouse: (body) => request('/warehouses', { method: 'POST', body: JSON.stringify(body) }),
  updateWarehouse: (id, body) => request(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createLocation: (whId, body) => request(`/warehouses/${whId}/locations`, { method: 'POST', body: JSON.stringify(body) }),

  // Inventory Operations
  getInventoryLevels: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/levels${query ? '?' + query : ''}`);
  },
  stockIn: (body) => request('/inventory/stock-in', { method: 'POST', body: JSON.stringify(body) }),
  stockOut: (body) => request('/inventory/stock-out', { method: 'POST', body: JSON.stringify(body) }),
  stockAdjustment: (body) => request('/inventory/adjustment', { method: 'POST', body: JSON.stringify(body) }),
  getTransfers: () => request('/inventory/transfers'),
  createTransfer: (body) => request('/inventory/transfers', { method: 'POST', body: JSON.stringify(body) }),
  receiveTransfer: (id) => request(`/inventory/transfers/${id}/receive`, { method: 'POST' }),
  getMovements: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/movements${query ? '?' + query : ''}`);
  },

  // Orders
  getPurchaseOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders/purchase${query ? '?' + query : ''}`);
  },
  createPurchaseOrder: (body) => request('/orders/purchase', { method: 'POST', body: JSON.stringify(body) }),
  receivePurchaseOrder: (id, body) => request(`/orders/purchase/${id}/receive`, { method: 'POST', body: JSON.stringify(body) }),

  getSalesOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders/sales${query ? '?' + query : ''}`);
  },
  createSalesOrder: (body) => request('/orders/sales', { method: 'POST', body: JSON.stringify(body) }),
  fulfillSalesOrder: (id) => request(`/orders/sales/${id}/fulfill`, { method: 'POST' }),

  // Suppliers & Customers
  getSuppliers: () => request('/suppliers'),
  createSupplier: (body) => request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  getCustomers: () => request('/customers'),
  createCustomer: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),

  // Analytics & Alerts
  getDashboardAnalytics: () => request('/analytics/dashboard'),
  getAlerts: () => request('/analytics/alerts'),
  markAlertRead: (id) => request(`/analytics/alerts/${id}/read`, { method: 'PUT' }),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit${query ? '?' + query : ''}`);
  },

  // Users
  getUsers: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
};

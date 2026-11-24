import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboardMetrics = (range = '30d', startDate = null, endDate = null) => {
  let url = `/dashboard/metrics?range=${range}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  }
  return api.get(url);
};

// Orders
export const getOrders = (params = {}) => api.get('/orders', { params });
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const createOrder = (orderData) => api.post('/orders', orderData);
export const updateOrderStatus = (id, statusData) => api.patch(`/orders/${id}/status`, statusData);
export const executeOrderAiAction = (id, actionData) => api.post(`/orders/${id}/ai-action`, actionData);

// Customers
export const getCustomers = (params = {}) => api.get('/customers', { params });
export const createCustomer = (customerData) => api.post('/customers', customerData);
export const updateCustomer = (id, customerData) => api.put(`/customers/${id}`, customerData);

// Inventory
export const getProducts = (params = {}) => api.get('/inventory/products', { params });
export const createProduct = (productData) => api.post('/inventory/products', productData);
export const updateProduct = (id, productData) => api.put(`/inventory/products/${id}`, productData);
export const adjustStock = (adjData) => api.post('/inventory/adjust', adjData);
export const getStockMovements = (productId = null) => {
  const url = productId ? `/inventory/movements?product_id=${productId}` : '/inventory/movements';
  return api.get(url);
};

// Payments
export const getPayments = (params = {}) => api.get('/payments', { params });
export const recordPayment = (paymentData) => api.post('/payments', paymentData);
export const executePaymentAiAction = (id, actionData) => api.post(`/payments/${id}/ai-action`, actionData);

// Dispatch
export const getDispatches = (params = {}) => api.get('/dispatch', { params });
export const updateDispatch = (id, dispatchData) => api.patch(`/dispatch/${id}`, dispatchData);
export const makeDispatch = (dispatchData = {}) => api.post('/dispatch/make-dispatch', dispatchData);
export const executeDispatchAiAction = (id, actionData) => api.post(`/dispatch/${id}/ai-action`, actionData);


// Complaints
export const getComplaints = (params = {}) => api.get('/complaints', { params });
export const fileComplaint = (complaintData) => api.post('/complaints', complaintData);
export const updateComplaint = (id, compData) => api.patch(`/complaints/${id}`, compData);

// Suppliers & Purchase Orders
export const getSuppliers = () => api.get('/suppliers');
export const createSupplier = (supplierData) => api.post('/suppliers', supplierData);
export const getPurchaseOrders = () => api.get('/suppliers/purchase-orders');
export const createPurchaseOrder = (poData) => api.post('/suppliers/purchase-orders', poData);
export const receivePurchaseOrder = (id) => api.post(`/suppliers/purchase-orders/${id}/receive`);

// AI Intelligence
export const getAiInsights = (params = {}) => api.get('/ai/insights', { params });
export const triggerProactiveScan = () => api.post('/ai/scan');
export const approveAiAction = (actionData) => api.post('/ai/actions/approve', actionData);
export const dismissAiInsight = (id) => api.post(`/ai/insights/${id}/dismiss`);
export const getHealthScore = () => api.get('/ai/health-score');
export const getDailyBriefing = (forceRefresh = false) => api.get(`/ai/daily-briefing?force_refresh=${forceRefresh}`);
export const getDemandForecasting = () => api.get('/ai/forecasting');
export const getRevenueLeakage = () => api.get('/ai/revenue-leakage');
export const getCustomerIntelligence = () => api.get('/ai/customer-intelligence');
export const getSupplierIntelligence = () => api.get('/ai/supplier-intelligence');
export const runWhatIfSimulation = (scenarioData) => api.post('/ai/simulate', scenarioData);

// Employees & Audit Logs
export const getEmployees = () => api.get('/employees');
export const getAuditLogs = (limit = 50) => api.get(`/audit-logs?limit=${limit}`);

// Voice AI Assistant
export const sendVoiceChat = (message, sessionId = 'default_owner', voiceMode = true) =>
  api.post('/voice/chat', { message, session_id: sessionId, voice_mode: voiceMode });

export const confirmVoiceAction = (sessionId = 'default_owner', confirm = true) =>
  api.post('/voice/confirm', { session_id: sessionId, confirm });

export const getVoiceGreeting = () =>
  api.get('/voice/proactive-greeting');

export default api;

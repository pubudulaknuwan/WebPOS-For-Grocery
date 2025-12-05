/**
 * API Service Layer
 * Centralized API communication with token management
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Set authentication token in localStorage
 */
export const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

/**
 * Set refresh token in localStorage
 */
export const setRefreshToken = (token) => {
  localStorage.setItem('refresh_token', token);
};

/**
 * Remove refresh token from localStorage
 */
export const removeRefreshToken = () => {
  localStorage.removeItem('refresh_token');
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok || !data.access) {
      throw new Error('Token refresh failed');
    }

    setAuthToken(data.access);
    if (data.refresh) {
      setRefreshToken(data.refresh);
    }

    return data.access;
  } catch (error) {
    removeAuthToken();
    removeRefreshToken();
    throw error;
  }
};

/**
 * Make authenticated API request with automatic token refresh
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // If 401 Unauthorized, try to refresh token and retry once
    if (response.status === 401 && token) {
      try {
        const newToken = await refreshAccessToken();
        config.headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }

    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

/**
 * Login API call
 */
export const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Login failed');
  }

  // Store tokens
  setAuthToken(data.access);
  setRefreshToken(data.refresh);

  return data;
};

/**
 * Logout - clear tokens
 */
export const logout = () => {
  removeAuthToken();
  removeRefreshToken();
};

/**
 * Search product by SKU
 */
export const searchProduct = async (sku) => {
  const { response, data } = await apiRequest(`/products/search?sku=${encodeURIComponent(sku)}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Product not found');
  }

  return data.product;
};

/**
 * Create a new transaction
 */
export const createTransaction = async (
  items, 
  paymentMethod, 
  cashReceived = null, 
  changeAmount = null,
  discountPercentage = 0,
  discountAmount = 0
) => {
  const payload = {
    items: items.map(item => {
      const itemPayload = {
        product_id: item.product_id || item.id,
        quantity: item.quantity,
      };
      
      // Only include discount fields if they have values
      if (item.discount_percentage && parseFloat(item.discount_percentage) > 0) {
        itemPayload.discount_percentage = parseFloat(item.discount_percentage);
      }
      if (item.discount_amount && parseFloat(item.discount_amount) > 0) {
        itemPayload.discount_amount = parseFloat(item.discount_amount);
      }
      
      return itemPayload;
    }),
    payment_method: paymentMethod,
  };

  // Add transaction-level discounts (only if > 0)
  if (discountPercentage && parseFloat(discountPercentage) > 0) {
    payload.discount_percentage = parseFloat(discountPercentage);
  }
  if (discountAmount && parseFloat(discountAmount) > 0) {
    payload.discount_amount = parseFloat(discountAmount);
  }

  // Add cash received and change for Cash payments
  if (paymentMethod === 'Cash' && cashReceived !== null) {
    // Round to 2 decimal places to match backend validation
    payload.cash_received = Math.round(parseFloat(cashReceived) * 100) / 100;
    if (changeAmount !== null) {
      payload.change_amount = Math.round(parseFloat(changeAmount) * 100) / 100;
    }
  }

  const { response, data } = await apiRequest('/transactions/new', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Transaction failed');
  }

  return data;
};

/**
 * Get list of transactions with optional filters
 */
export const getTransactions = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.cashier_id) queryParams.append('cashier_id', filters.cashier_id);
  if (filters.payment_method) queryParams.append('payment_method', filters.payment_method);
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);

  const { response, data } = await apiRequest(`/transactions/?${queryParams.toString()}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch transactions');
  }

  return data;
};

/**
 * Get transaction details by ID
 */
export const getTransaction = async (transactionId) => {
  const { response, data } = await apiRequest(`/transactions/${transactionId}/`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Transaction not found');
  }

  return data.transaction;
};

/**
 * Get list of products with optional filters
 */
export const getProducts = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.low_stock) queryParams.append('low_stock', 'true');
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);

  const { response, data } = await apiRequest(`/products/?${queryParams.toString()}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch products');
  }

  return data;
};

/**
 * Get low stock products
 */
export const getLowStockProducts = async (threshold = 10) => {
  const { response, data } = await apiRequest(`/products/low-stock?threshold=${threshold}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch low stock products');
  }

  return data;
};

/**
 * Get receipt data for a transaction
 */
export const getReceipt = async (transactionId) => {
  const { response, data } = await apiRequest(`/transactions/${transactionId}/receipt`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch receipt');
  }

  return data;
};

/**
 * Create a new product
 */
export const createProduct = async (productData) => {
  const { response, data } = await apiRequest('/products/create', {
    method: 'POST',
    body: JSON.stringify(productData),
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to create product');
  }

  return data;
};

/**
 * Update a product
 */
export const updateProduct = async (productId, productData) => {
  const { response, data } = await apiRequest(`/products/${productId}/`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update product');
  }

  return data;
};

/**
 * Delete a product
 */
export const deleteProduct = async (productId) => {
  const { response, data } = await apiRequest(`/products/${productId}/`, {
    method: 'DELETE',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete product');
  }

  return data;
};

/**
 * Update inventory stock
 */
export const updateInventory = async (productId, stockQuantity, reason = '') => {
  const { response, data } = await apiRequest(`/products/${productId}/inventory`, {
    method: 'PUT',
    body: JSON.stringify({
      stock_quantity: stockQuantity,
      adjustment_reason: reason
    }),
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update inventory');
  }

  return data;
};

/**
 * Get sales report
 */
export const getSalesReport = async (startDate = null, endDate = null, period = 'daily', groupBy = 'date') => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  if (period) queryParams.append('period', period);
  if (groupBy) queryParams.append('group_by', groupBy);

  const { response, data } = await apiRequest(`/transactions/reports/sales?${queryParams.toString()}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch sales report');
  }

  return data;
};

/**
 * Get top products report
 */
export const getTopProductsReport = async (startDate = null, endDate = null, limit = 10) => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  if (limit) queryParams.append('limit', limit);

  const { response, data } = await apiRequest(`/transactions/reports/top-products?${queryParams.toString()}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch top products report');
  }

  return data;
};

/**
 * Get cashier performance report
 */
export const getCashierPerformanceReport = async (startDate = null, endDate = null, cashierId = null) => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  if (cashierId) queryParams.append('cashier_id', cashierId);

  const { response, data } = await apiRequest(`/transactions/reports/cashier-performance?${queryParams.toString()}`, {
    method: 'GET',
  });

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch cashier performance report');
  }

  return data;
};

/**
 * Export sales report to CSV
 */
export const exportSalesReport = async (startDate = null, endDate = null) => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/transactions/reports/export-sales?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export sales report');
  }

  // Get the blob and create download link
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales_report_${startDate || 'all'}_${endDate || 'all'}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};


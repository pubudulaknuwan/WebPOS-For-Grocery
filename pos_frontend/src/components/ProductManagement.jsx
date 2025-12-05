/**
 * Product Management Component
 * Admin interface for managing products and inventory
 */

import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ProductForm from './ProductForm';
import { apiRequest, getProducts } from '../services/api';

function ProductManagement({ onClose }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    low_stock: false,
    page: 1,
    limit: 50
  });
  const [totalCount, setTotalCount] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [filters]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getProducts(filters);
      setProducts(data.products || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getProducts({ limit: 1000 });
      const uniqueCategories = [...new Set(data.products.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories.sort());
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const { response, data } = await apiRequest(`/products/${productId}/`, {
        method: 'DELETE',
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete product');
      }

      // Refresh products list
      fetchProducts();
      alert('Product deleted successfully');
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleFormClose = (refresh = false) => {
    setShowProductForm(false);
    setEditingProduct(null);
    if (refresh) {
      fetchProducts();
      fetchCategories();
    }
  };

  const handleUpdateStock = async (productId, newStock) => {
    try {
      const { response, data } = await apiRequest(`/products/${productId}/inventory`, {
        method: 'PUT',
        body: JSON.stringify({
          stock_quantity: parseInt(newStock),
          adjustment_reason: 'Manual update'
        }),
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update stock');
      }

      // Refresh products list
      fetchProducts();
      return true;
    } catch (err) {
      alert('Error updating stock: ' + err.message);
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Product Management</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCreateProduct}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold"
            >
              + Add Product
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-700 bg-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name or SKU..."
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={filters.low_stock}
                  onChange={(e) => handleFilterChange('low_stock', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Low Stock Only</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ search: '', category: '', low_stock: false, page: 1, limit: 50 })}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSpinner text="Loading products..." />
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No products found</p>
              <button
                onClick={handleCreateProduct}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Add First Product
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onUpdateStock={handleUpdateStock}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {!isLoading && !error && products.length > 0 && (
          <div className="p-4 border-t border-gray-700 flex justify-between items-center">
            <p className="text-gray-400 text-sm">
              Showing {((filters.page - 1) * filters.limit) + 1} - {Math.min(filters.page * filters.limit, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                disabled={filters.page === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page * filters.limit >= totalCount}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleFormClose}
          onSuccess={() => handleFormClose(true)}
        />
      )}
    </div>
  );
}

// Product Row Component
function ProductRow({ product, onEdit, onDelete, onUpdateStock }) {
  const [stockInput, setStockInput] = useState(product.stock_quantity || 0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const handleStockUpdate = async () => {
    const newStock = parseInt(stockInput);
    if (isNaN(newStock) || newStock < 0) {
      alert('Please enter a valid stock quantity');
      return;
    }

    setIsUpdatingStock(true);
    const success = await onUpdateStock(product.id, newStock);
    setIsUpdatingStock(false);
    
    if (!success) {
      setStockInput(product.stock_quantity || 0);
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-400' };
    if (stock <= 5) return { label: 'Critical', color: 'text-red-300' };
    if (stock <= 10) return { label: 'Low', color: 'text-yellow-400' };
    return { label: 'In Stock', color: 'text-green-400' };
  };

  const stockStatus = getStockStatus(product.stock_quantity || 0);

  return (
    <div className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-white">{product.name}</h3>
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
              {product.sku}
            </span>
            {product.category && (
              <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                {product.category}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Price:</span>
              <span className="text-white ml-2">AED {parseFloat(product.unit_price).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Cost:</span>
              <span className="text-white ml-2">AED {parseFloat(product.cost).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Stock:</span>
              <span className={`ml-2 font-semibold ${stockStatus.color}`}>
                {product.stock_quantity || 0} ({stockStatus.label})
              </span>
            </div>
            <div>
              <span className="text-gray-400">Margin:</span>
              <span className="text-green-400 ml-2">
                {((parseFloat(product.unit_price) - parseFloat(product.cost)) / parseFloat(product.unit_price) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          {/* Stock Update */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStockUpdate()}
              className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-center"
              disabled={isUpdatingStock}
            />
            <button
              onClick={handleStockUpdate}
              disabled={isUpdatingStock || stockInput == product.stock_quantity}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded disabled:opacity-50"
            >
              {isUpdatingStock ? '...' : 'Update'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(product)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductManagement;



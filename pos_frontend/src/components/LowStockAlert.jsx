/**
 * Low Stock Alert Component
 * Displays products with low stock levels
 */

import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { apiRequest } from '../services/api';

function LowStockAlert({ onClose }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [threshold, setThreshold] = useState(10);

  useEffect(() => {
    fetchLowStockProducts();
  }, [threshold]);

  const fetchLowStockProducts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { response, data } = await apiRequest(`/products/low-stock?threshold=${threshold}`, {
        method: 'GET',
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch low stock products');
      }

      setProducts(data.products || []);
    } catch (err) {
      setError(err.message || 'Failed to load low stock products');
      console.error('Error fetching low stock products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-600' };
    if (stock <= 5) return { label: 'Critical', color: 'bg-red-500' };
    if (stock <= 10) return { label: 'Low', color: 'bg-yellow-500' };
    return { label: 'Normal', color: 'bg-green-500' };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Low Stock Alerts</h2>
            <p className="text-sm text-gray-400 mt-1">
              Products with stock below threshold
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Threshold Filter */}
        <div className="p-4 border-b border-gray-700 bg-gray-700">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-300">Stock Threshold:</label>
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
              className="w-24 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
            />
            <button
              onClick={fetchLowStockProducts}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSpinner text="Loading low stock products..." />
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchLowStockProducts}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No products with low stock</p>
              <p className="text-sm mt-2">All products are above the threshold</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => {
                const stockStatus = getStockStatus(product.stock_quantity || 0);
                return (
                  <div
                    key={product.id}
                    className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-white">
                            {product.name}
                          </h3>
                          <span className={`px-2 py-1 ${stockStatus.color} text-white text-xs rounded`}>
                            {stockStatus.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">SKU: {product.sku}</p>
                        {product.category && (
                          <p className="text-sm text-gray-400">Category: {product.category}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">
                          Price: AED {parseFloat(product.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-2xl font-bold ${
                          product.stock_quantity === 0 ? 'text-red-400' :
                          product.stock_quantity <= 5 ? 'text-red-300' :
                          'text-yellow-400'
                        }`}>
                          {product.stock_quantity || 0}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">in stock</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && products.length > 0 && (
          <div className="p-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center">
              {products.length} product{products.length !== 1 ? 's' : ''} with low stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LowStockAlert;



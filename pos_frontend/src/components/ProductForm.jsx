/**
 * Product Form Component
 * Form for creating and editing products
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

function ProductForm({ product, onClose, onSuccess }) {
  const isEditing = !!product;
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    unit_price: '',
    cost: '',
    category: '',
    stock_quantity: 0
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        unit_price: product.unit_price || '',
        cost: product.cost || '',
        category: product.category || '',
        stock_quantity: product.stock_quantity || 0
      });
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      newErrors.unit_price = 'Unit price must be greater than zero';
    }

    if (!formData.cost || parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        unit_price: parseFloat(formData.unit_price),
        cost: parseFloat(formData.cost),
        category: formData.category.trim() || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0
      };

      let response, data;

      if (isEditing) {
        // Update existing product
        ({ response, data } = await apiRequest(`/products/${product.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }));
      } else {
        // Create new product
        ({ response, data } = await apiRequest('/products/create', {
          method: 'POST',
          body: JSON.stringify(payload),
        }));
      }

      if (!response.ok || !data.success) {
        // Handle validation errors from backend
        if (data.errors) {
          setErrors(data.errors);
        } else {
          throw new Error(data.message || 'Failed to save product');
        }
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }
      onClose(true);
    } catch (error) {
      console.error('Error saving product:', error);
      setErrors({ submit: error.message || 'Failed to save product. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {errors.submit && (
            <div className="mb-4 p-4 bg-red-600 text-white rounded-lg">
              {errors.submit}
            </div>
          )}

          <div className="space-y-4">
            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                SKU <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                disabled={isEditing}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.sku ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white ${
                  isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder="Enter SKU (e.g., ABC123)"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-400">{errors.sku}</p>
              )}
              {isEditing && (
                <p className="mt-1 text-xs text-gray-400">SKU cannot be changed after creation</p>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white`}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Price and Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unit Price (AED) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-gray-700 border ${
                    errors.unit_price ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg text-white`}
                  placeholder="0.00"
                />
                {errors.unit_price && (
                  <p className="mt-1 text-sm text-red-400">{errors.unit_price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cost Price (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-gray-700 border ${
                    errors.cost ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg text-white`}
                  placeholder="0.00"
                />
                {errors.cost && (
                  <p className="mt-1 text-sm text-red-400">{errors.cost}</p>
                )}
              </div>
            </div>

            {/* Category and Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter category (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-gray-700 border ${
                    errors.stock_quantity ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg text-white`}
                  placeholder="0"
                />
                {errors.stock_quantity && (
                  <p className="mt-1 text-sm text-red-400">{errors.stock_quantity}</p>
                )}
              </div>
            </div>

            {/* Profit Margin Display */}
            {formData.unit_price && formData.cost && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Profit Margin:</span>
                  <span className="text-green-400 font-semibold">
                    {((parseFloat(formData.unit_price) - parseFloat(formData.cost)) / parseFloat(formData.unit_price) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-300">Profit per Unit:</span>
                  <span className="text-green-400 font-semibold">
                    AED {(parseFloat(formData.unit_price) - parseFloat(formData.cost)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={() => onClose(false)}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductForm;



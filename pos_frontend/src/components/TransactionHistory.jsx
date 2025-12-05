/**
 * Transaction History Component
 * Displays list of past transactions with filtering options
 */

import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Receipt from './Receipt';
import { apiRequest, getReceipt } from '../services/api';

function TransactionHistory({ onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    payment_method: '',
    page: 1,
    limit: 50
  });
  const [totalCount, setTotalCount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.payment_method) queryParams.append('payment_method', filters.payment_method);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);

      const { response, data } = await apiRequest(`/transactions/?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `AED ${parseFloat(amount).toFixed(2)}`;
  };

  const handleViewReceipt = async (transactionId) => {
    setLoadingReceipt(true);
    try {
      const receipt = await getReceipt(transactionId);
      setReceiptData(receipt);
      setShowReceipt(true);
    } catch (err) {
      alert('Failed to load receipt: ' + err.message);
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Transaction History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-700 bg-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Payment Method</label>
              <select
                value={filters.payment_method}
                onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                <option value="">All</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ ...filters, start_date: '', end_date: '', payment_method: '', page: 1 })}
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
            <LoadingSpinner text="Loading transactions..." />
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchTransactions}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Retry
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-semibold text-lg text-white">
                          Transaction #{transaction.id}
                        </span>
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          {transaction.payment_method}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">
                        {formatDate(transaction.timestamp)}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Cashier: {transaction.cashier_username} | 
                        Items: {transaction.items?.length || 0}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-xl font-bold text-green-400">
                        {formatCurrency(transaction.total_amount)}
                      </p>
                      <button
                        onClick={() => handleViewReceipt(transaction.id)}
                        disabled={loadingReceipt}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50"
                      >
                        {loadingReceipt ? 'Loading...' : 'View Receipt'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {!isLoading && !error && transactions.length > 0 && (
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

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <Receipt
          receiptData={receiptData}
          onClose={() => {
            setShowReceipt(false);
            setReceiptData(null);
          }}
          autoPrint={false}
        />
      )}
    </div>
  );
}

export default TransactionHistory;


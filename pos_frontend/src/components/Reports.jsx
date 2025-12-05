import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { 
  getSalesReport, 
  getTopProductsReport, 
  getCashierPerformanceReport,
  exportSalesReport 
} from '../services/api';

function Reports({ onClose }) {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'products', 'cashiers'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Report data state
  const [salesReport, setSalesReport] = useState(null);
  const [topProductsReport, setTopProductsReport] = useState(null);
  const [cashierReport, setCashierReport] = useState(null);
  
  // Period and group by options
  const [period, setPeriod] = useState('daily');
  const [groupBy, setGroupBy] = useState('date');

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Load reports when dates change
  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [startDate, endDate, period, groupBy, activeTab]);

  const loadReports = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError('');

    try {
      if (activeTab === 'sales') {
        const data = await getSalesReport(startDate, endDate, period, groupBy);
        setSalesReport(data.report);
      } else if (activeTab === 'products') {
        const data = await getTopProductsReport(startDate, endDate, 20);
        setTopProductsReport(data.report);
      } else if (activeTab === 'cashiers') {
        const data = await getCashierPerformanceReport(startDate, endDate);
        setCashierReport(data.report);
      }
    } catch (err) {
      setError(err.message || 'Failed to load report');
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError('Please select date range');
      return;
    }

    try {
      setLoading(true);
      await exportSalesReport(startDate, endDate);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `AED ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl"
          >
            ×
          </button>
        </div>

        {/* Date Range and Filters */}
        <div className="p-4 border-b border-gray-700 bg-gray-750">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            {activeTab === 'sales' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Group By</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="date">Date</option>
                    <option value="cashier">Cashier</option>
                    <option value="payment_method">Payment Method</option>
                  </select>
                </div>
              </>
            )}
            <div className="ml-auto">
              <button
                onClick={handleExport}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:bg-gray-600"
              >
                {loading ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Top Products
          </button>
          <button
            onClick={() => setActiveTab('cashiers')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'cashiers'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Cashier Performance
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900 bg-opacity-50 border border-red-600 text-red-300">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner text="Loading report..." />
            </div>
          ) : (
            <>
              {/* Sales Report */}
              {activeTab === 'sales' && salesReport && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Total Sales</div>
                      <div className="text-2xl font-bold text-green-400">{formatCurrency(salesReport.summary.total_sales)}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Total Transactions</div>
                      <div className="text-2xl font-bold text-white">{salesReport.summary.total_transactions}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Avg Transaction</div>
                      <div className="text-2xl font-bold text-blue-400">{formatCurrency(salesReport.summary.average_transaction)}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Cash Sales</div>
                      <div className="text-2xl font-bold text-yellow-400">{formatCurrency(salesReport.summary.cash_sales)}</div>
                    </div>
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Payment Method Breakdown</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">Cash</div>
                        <div className="text-xl font-bold text-yellow-400">{formatCurrency(salesReport.summary.cash_sales)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Card</div>
                        <div className="text-xl font-bold text-blue-400">{formatCurrency(salesReport.summary.card_sales)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Credit</div>
                        <div className="text-xl font-bold text-purple-400">{formatCurrency(salesReport.summary.credit_sales)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Period Data Table */}
                  {salesReport.period_data && salesReport.period_data.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">Sales by {period.charAt(0).toUpperCase() + period.slice(1)}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="pb-2 text-gray-300">Period</th>
                              <th className="pb-2 text-gray-300">Total Sales</th>
                              <th className="pb-2 text-gray-300">Transactions</th>
                              <th className="pb-2 text-gray-300">Avg Transaction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesReport.period_data.map((item, index) => (
                              <tr key={index} className="border-b border-gray-600">
                                <td className="py-2 text-white">{item.period}</td>
                                <td className="py-2 text-green-400 font-semibold">{formatCurrency(item.total_sales)}</td>
                                <td className="py-2 text-white">{item.transaction_count}</td>
                                <td className="py-2 text-blue-400">{formatCurrency(item.avg_transaction)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Group By Data */}
                  {salesReport.group_by_data && Object.keys(salesReport.group_by_data).length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        Sales by {groupBy === 'cashier' ? 'Cashier' : 'Payment Method'}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-600">
                              {groupBy === 'cashier' ? (
                                <>
                                  <th className="pb-2 text-gray-300">Cashier</th>
                                  <th className="pb-2 text-gray-300">Total Sales</th>
                                  <th className="pb-2 text-gray-300">Transactions</th>
                                  <th className="pb-2 text-gray-300">Avg Transaction</th>
                                </>
                              ) : (
                                <>
                                  <th className="pb-2 text-gray-300">Payment Method</th>
                                  <th className="pb-2 text-gray-300">Total Sales</th>
                                  <th className="pb-2 text-gray-300">Transactions</th>
                                  <th className="pb-2 text-gray-300">Avg Transaction</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {salesReport.group_by_data[groupBy]?.map((item, index) => (
                              <tr key={index} className="border-b border-gray-600">
                                <td className="py-2 text-white">
                                  {groupBy === 'cashier' ? item.cashier_name : item.payment_method}
                                </td>
                                <td className="py-2 text-green-400 font-semibold">{formatCurrency(item.total_sales)}</td>
                                <td className="py-2 text-white">{item.transaction_count}</td>
                                <td className="py-2 text-blue-400">{formatCurrency(item.avg_transaction)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top Products Report */}
              {activeTab === 'products' && topProductsReport && (
                <div className="space-y-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="pb-2 text-gray-300">Rank</th>
                            <th className="pb-2 text-gray-300">Product</th>
                            <th className="pb-2 text-gray-300">SKU</th>
                            <th className="pb-2 text-gray-300">Quantity Sold</th>
                            <th className="pb-2 text-gray-300">Total Revenue</th>
                            <th className="pb-2 text-gray-300">Unit Price</th>
                            <th className="pb-2 text-gray-300">Transactions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProductsReport.top_products.map((product, index) => (
                            <tr key={product.product_id} className="border-b border-gray-600">
                              <td className="py-2 text-white font-bold">#{index + 1}</td>
                              <td className="py-2 text-white">{product.product_name}</td>
                              <td className="py-2 text-gray-400">{product.product_sku}</td>
                              <td className="py-2 text-blue-400 font-semibold">{product.total_quantity_sold}</td>
                              <td className="py-2 text-green-400 font-semibold">{formatCurrency(product.total_revenue)}</td>
                              <td className="py-2 text-gray-300">{formatCurrency(product.unit_price)}</td>
                              <td className="py-2 text-white">{product.transaction_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Cashier Performance Report */}
              {activeTab === 'cashiers' && cashierReport && (
                <div className="space-y-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Cashier Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="pb-2 text-gray-300">Cashier</th>
                            <th className="pb-2 text-gray-300">Total Sales</th>
                            <th className="pb-2 text-gray-300">Transactions</th>
                            <th className="pb-2 text-gray-300">Avg Transaction</th>
                            <th className="pb-2 text-gray-300">Cash</th>
                            <th className="pb-2 text-gray-300">Card</th>
                            <th className="pb-2 text-gray-300">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashierReport.performance.map((cashier, index) => (
                            <tr key={cashier.cashier_id} className="border-b border-gray-600">
                              <td className="py-2 text-white">{cashier.cashier_name}</td>
                              <td className="py-2 text-green-400 font-semibold">{formatCurrency(cashier.total_sales)}</td>
                              <td className="py-2 text-white">{cashier.transaction_count}</td>
                              <td className="py-2 text-blue-400">{formatCurrency(cashier.avg_transaction)}</td>
                              <td className="py-2 text-yellow-400">{cashier.cash_transactions}</td>
                              <td className="py-2 text-blue-400">{cashier.card_transactions}</td>
                              <td className="py-2 text-purple-400">{cashier.credit_transactions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {!loading && (
                (activeTab === 'sales' && !salesReport) ||
                (activeTab === 'products' && !topProductsReport) ||
                (activeTab === 'cashiers' && !cashierReport)
              ) && (
                <div className="text-center text-gray-400 py-12">
                  No data available for the selected date range
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;


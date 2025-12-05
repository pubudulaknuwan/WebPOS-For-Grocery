/**
 * Main POS Cashier Interface Component
 * High-performance, touchscreen-optimized Point of Sale application
 * Built with React functional components, hooks, and Tailwind CSS
 */

import React, { useState, useReducer, useCallback, useEffect } from 'react';
import Login from './components/Login';
import TransactionHistory from './components/TransactionHistory';
import LowStockAlert from './components/LowStockAlert';
import ProductManagement from './components/ProductManagement';
import Receipt from './components/Receipt';
import Reports from './components/Reports';
import LoadingSpinner from './components/LoadingSpinner';
import { searchProduct, createTransaction, getAuthToken, logout as apiLogout, getReceipt } from './services/api';

/**
 * Cart Item Structure:
 * {
 *   id: number (product id),
 *   sku: string,
 *   name: string,
 *   unit_price: number,
 *   quantity: number,
 *   subtotal: number
 * }
 */

// Cart Reducer for managing cart state
const cartReducer = (state, action) => {
  const calculateItemSubtotal = (item) => {
    const baseSubtotal = item.quantity * item.unit_price;
    const discountPct = item.discount_percentage || 0;
    const discountAmt = item.discount_amount || 0;
    const percentageDiscount = baseSubtotal * (discountPct / 100);
    const itemDiscount = percentageDiscount + discountAmt;
    return Math.max(0, baseSubtotal - itemDiscount);
  };

  const calculateTotals = (items, transactionDiscountPct = 0, transactionDiscountAmt = 0) => {
    const subtotalBeforeDiscount = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    
    const totalItemDiscounts = items.reduce((sum, item) => {
      const baseSubtotal = item.quantity * item.unit_price;
      const discountPct = item.discount_percentage || 0;
      const discountAmt = item.discount_amount || 0;
      const percentageDiscount = baseSubtotal * (discountPct / 100);
      return sum + percentageDiscount + discountAmt;
    }, 0);
    
    const subtotalAfterItemDiscounts = subtotalBeforeDiscount - totalItemDiscounts;
    const transactionPercentageDiscount = subtotalAfterItemDiscounts * (transactionDiscountPct / 100);
    const totalDiscount = totalItemDiscounts + transactionPercentageDiscount + transactionDiscountAmt;
    const subtotal = Math.max(0.01, subtotalAfterItemDiscounts - transactionPercentageDiscount - transactionDiscountAmt);
    
    return {
      subtotalBeforeDiscount,
      totalItemDiscounts,
      transactionDiscount: transactionPercentageDiscount + transactionDiscountAmt,
      totalDiscount,
      subtotal
    };
  };

  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? {
                ...item,
                quantity: item.quantity + action.payload.quantity,
                subtotal: calculateItemSubtotal({
                  ...item,
                  quantity: item.quantity + action.payload.quantity
                })
              }
            : item
        );
        const totals = calculateTotals(updatedItems, state.transactionDiscountPercentage || 0, state.transactionDiscountAmount || 0);
        return {
          ...state,
          items: updatedItems,
          ...totals
        };
      } else {
        // Add new item
        const newItem = {
          ...action.payload,
          discount_percentage: 0,
          discount_amount: 0,
          subtotal: calculateItemSubtotal(action.payload)
        };
        const newItems = [...state.items, newItem];
        const totals = calculateTotals(newItems, state.transactionDiscountPercentage || 0, state.transactionDiscountAmount || 0);
        return {
          ...state,
          items: newItems,
          ...totals
        };
      }
    
    case 'UPDATE_QUANTITY':
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? {
              ...item,
              quantity: action.payload.quantity,
              subtotal: calculateItemSubtotal({
                ...item,
                quantity: action.payload.quantity
              })
            }
          : item
      ).filter(item => item.quantity > 0); // Remove items with 0 quantity
      
      const totals = calculateTotals(updatedItems, state.transactionDiscountPercentage || 0, state.transactionDiscountAmount || 0);
      return {
        ...state,
        items: updatedItems,
        ...totals
      };
    
    case 'UPDATE_ITEM_DISCOUNT':
      const itemsWithDiscount = state.items.map(item =>
        item.id === action.payload.id
          ? {
              ...item,
              discount_percentage: action.payload.discount_percentage || 0,
              discount_amount: action.payload.discount_amount || 0,
              subtotal: calculateItemSubtotal({
                ...item,
                discount_percentage: action.payload.discount_percentage || 0,
                discount_amount: action.payload.discount_amount || 0
              })
            }
          : item
      );
      const totalsWithItemDiscount = calculateTotals(
        itemsWithDiscount, 
        state.transactionDiscountPercentage || 0, 
        state.transactionDiscountAmount || 0
      );
      return {
        ...state,
        items: itemsWithDiscount,
        ...totalsWithItemDiscount
      };
    
    case 'UPDATE_TRANSACTION_DISCOUNT':
      const totalsWithTransactionDiscount = calculateTotals(
        state.items,
        action.payload.discount_percentage || 0,
        action.payload.discount_amount || 0
      );
      return {
        ...state,
        transactionDiscountPercentage: action.payload.discount_percentage || 0,
        transactionDiscountAmount: action.payload.discount_amount || 0,
        ...totalsWithTransactionDiscount
      };
    
    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(item => item.id !== action.payload.id);
      const totalsFiltered = calculateTotals(filteredItems, state.transactionDiscountPercentage || 0, state.transactionDiscountAmount || 0);
      return {
        ...state,
        items: filteredItems,
        ...totalsFiltered
      };
    
    case 'CLEAR_CART':
      return {
        items: [],
        subtotal: 0,
        subtotalBeforeDiscount: 0,
        totalItemDiscounts: 0,
        transactionDiscount: 0,
        totalDiscount: 0,
        transactionDiscountPercentage: 0,
        transactionDiscountAmount: 0
      };
    
    default:
      return state;
  }
};

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // State management
  const [skuInput, setSkuInput] = useState('');
  const [cartState, dispatchCart] = useReducer(cartReducer, { 
    items: [], 
    subtotal: 0,
    subtotalBeforeDiscount: 0,
    totalItemDiscounts: 0,
    transactionDiscount: 0,
    totalDiscount: 0,
    transactionDiscountPercentage: 0,
    transactionDiscountAmount: 0
  });
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [lastTransactionId, setLastTransactionId] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Tax rate (configurable - 5% VAT for Dubai)
  const TAX_RATE = 0.05;
  const tax = (cartState.subtotal || 0) * TAX_RATE;
  const grandTotal = (cartState.subtotal || 0) + tax;

  // Calculate change when cash received changes
  useEffect(() => {
    if (paymentMethod === 'Cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      const change = received - grandTotal;
      // Round to 2 decimal places to match backend validation
      setChangeAmount(change >= 0 ? Math.round(change * 100) / 100 : 0);
    } else {
      setChangeAmount(0);
    }
  }, [cashReceived, grandTotal, paymentMethod]);

  /**
   * Handle successful login
   */
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    apiLogout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    dispatchCart({ type: 'CLEAR_CART' });
    setPaymentMethod(null);
  };

  /**
   * Search product by SKU and add to cart
   */
  const handleSkuSearch = useCallback(async () => {
    if (!skuInput.trim()) {
      setErrorMessage('Please enter a SKU');
      return;
    }

    setIsSearching(true);
    setErrorMessage('');

    try {
      const product = await searchProduct(skuInput.trim());
      
      // Add product to cart with quantity 1
      dispatchCart({
        type: 'ADD_ITEM',
        payload: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit_price: parseFloat(product.unit_price),
          quantity: 1
        }
      });

      setSkuInput('');
      setErrorMessage('');
      setShowPaymentPanel(true);
      
      // Auto-focus back to SKU input for rapid scanning
      setTimeout(() => {
        document.getElementById('sku-input')?.focus();
      }, 100);

    } catch (error) {
      setErrorMessage(error.message || 'Product not found. Please try again.');
      setSkuInput('');
      console.error('Error searching product:', error);
    } finally {
      setIsSearching(false);
    }
  }, [skuInput]);

  /**
   * Handle Enter key in SKU input
   */
  const handleSkuKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSkuSearch();
    }
  };

  /**
   * Update item quantity in cart
   */
  const handleQuantityChange = (productId, newQuantity) => {
    const quantity = parseInt(newQuantity) || 0;
    dispatchCart({
      type: 'UPDATE_QUANTITY',
      payload: { id: productId, quantity }
    });
  };

  /**
   * Remove item from cart
   */
  const handleRemoveItem = (productId) => {
    dispatchCart({
      type: 'REMOVE_ITEM',
      payload: { id: productId }
    });
  };

  /**
   * Complete sale transaction
   */
  const handleCompleteSale = async () => {
    if (cartState.items.length === 0) {
      setErrorMessage('Cart is empty');
      return;
    }

    if (!paymentMethod) {
      setErrorMessage('Please select a payment method');
      return;
    }

    // Validate cash received for Cash payments
    if (paymentMethod === 'Cash') {
      const received = parseFloat(cashReceived) || 0;
      if (!cashReceived || received <= 0) {
        setErrorMessage('Please enter cash received amount');
        return;
      }
      if (received < grandTotal) {
        setErrorMessage(`Insufficient cash. Total is AED ${grandTotal.toFixed(2)}, but only AED ${received.toFixed(2)} received.`);
        return;
      }
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare transaction data
      const transactionData = {
        items: cartState.items,
        payment_method: paymentMethod
      };

      // Add cash received and change for Cash payments
      if (paymentMethod === 'Cash') {
        // Round to 2 decimal places to match backend validation (max 2 decimal places)
        transactionData.cash_received = Math.round(parseFloat(cashReceived) * 100) / 100;
        transactionData.change_amount = Math.round(changeAmount * 100) / 100;
      }

      const data = await createTransaction(
        transactionData.items,
        transactionData.payment_method,
        transactionData.cash_received,
        transactionData.change_amount,
        transactionData.discount_percentage,
        transactionData.discount_amount
      );

      // Store transaction ID and fetch receipt
      setLastTransactionId(data.transaction_id);
      
      // Fetch receipt data
      try {
        const receipt = await getReceipt(data.transaction_id);
        console.log('Receipt data received:', receipt); // Debug log
        setReceiptData(receipt);
        setShowReceipt(true);
      } catch (err) {
        console.error('Error fetching receipt:', err);
        // Show error but still allow viewing receipt from history
        setErrorMessage('Transaction saved but receipt could not be loaded. You can view it from History.');
      }
      
      // Success - clear cart and show success message
      setSuccessMessage(`Transaction #${data.transaction_id} completed successfully!`);
      dispatchCart({ type: 'CLEAR_CART' });
      setPaymentMethod(null);
      setCashReceived('');
      setChangeAmount(0);
      setShowPaymentPanel(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

    } catch (error) {
      setErrorMessage(error.message || 'Transaction failed. Please try again.');
      console.error('Error completing transaction:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-focus SKU input on mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      document.getElementById('sku-input')?.focus();
    }
  }, [isAuthenticated]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            DilmaSuperPOS
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {currentUser && (
            <span className="text-sm text-gray-300">
              {currentUser.username} ({currentUser.role})
            </span>
          )}
          <button
            onClick={() => setShowTransactionHistory(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
          >
            History
          </button>
          {currentUser?.role === 'Admin' && (
            <>
              <button
                onClick={() => setShowReports(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
              >
                Reports
              </button>
              <button
                onClick={() => setShowProductManagement(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
              >
                Products
              </button>
              <button
                onClick={() => setShowLowStockAlert(true)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold"
              >
                Low Stock
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        
        {/* Left Side - Product/Cart Management (70% on desktop, full width mobile) */}
        <div className="flex-1 lg:w-[70%] p-4 md:p-6 overflow-y-auto">
          
          {/* SKU Input Section */}
          <div className="mb-6">
            <label htmlFor="sku-input" className="block text-lg font-semibold mb-2">
              Scan or Enter SKU/Barcode
            </label>
            <div className="flex gap-2">
              <input
                id="sku-input"
                type="text"
                value={skuInput}
                onChange={(e) => {
                  setSkuInput(e.target.value);
                  setErrorMessage('');
                }}
                onKeyPress={handleSkuKeyPress}
                placeholder="Enter SKU and press Enter or click Search"
                className="flex-1 px-4 py-4 text-lg bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                autoFocus
              />
              <button
                onClick={handleSkuSearch}
                disabled={isSearching}
                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSearching ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-600 text-white rounded-lg">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-600 text-white rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Cart Items List */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Current Cart</h2>
            
            {cartState.items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-lg">Cart is empty</p>
                <p className="text-sm mt-2">Scan or enter SKU to add items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartState.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-gray-300">SKU: {item.sku}</p>
                      <p className="text-sm text-gray-300">
                        Price: AED {item.unit_price.toFixed(2)} each
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-center text-white"
                          />
                        </div>
                        
                        <div className="text-right min-w-[100px]">
                          <p className="font-semibold text-lg">
                            AED {item.subtotal.toFixed(2)}
                          </p>
                          {(item.discount_percentage > 0 || item.discount_amount > 0) && (
                            <p className="text-xs text-green-400">
                              Discount: AED {((item.quantity * item.unit_price) - item.subtotal).toFixed(2)}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      
                      {/* Item Discount Input */}
                      <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-300">Discount:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={item.discount_percentage || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            dispatchCart({
                              type: 'UPDATE_ITEM_DISCOUNT',
                              payload: {
                                id: item.id,
                                discount_percentage: Math.min(100, Math.max(0, val)),
                                discount_amount: item.discount_amount || 0
                              }
                            });
                          }}
                          className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-center text-white text-xs"
                        />
                        <span className="text-gray-400">%</span>
                        <span className="text-gray-400">or</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="AED"
                          value={item.discount_amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            dispatchCart({
                              type: 'UPDATE_ITEM_DISCOUNT',
                              payload: {
                                id: item.id,
                                discount_percentage: item.discount_percentage || 0,
                                discount_amount: Math.max(0, val)
                              }
                            });
                          }}
                          className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-center text-white text-xs"
                        />
                        <span className="text-gray-400">AED</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Payment/Summary Panel (30% on desktop, modal on mobile) */}
        <div className={`lg:w-[30%] bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-700 p-4 md:p-6 ${
          showPaymentPanel || cartState.items.length > 0 ? 'block' : 'hidden lg:block'
        }`}>
          
          {/* Mobile: Close button */}
          <button
            onClick={() => setShowPaymentPanel(false)}
            className="lg:hidden mb-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            Close Panel
          </button>

          <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
          
          {/* Summary Details */}
          <div className="bg-gray-700 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-semibold">AED {cartState.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Tax (5%):</span>
              <span className="font-semibold">AED {tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-600 pt-3 flex justify-between text-2xl font-bold">
              <span>Total:</span>
              <span className="text-green-400">AED {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
            <div className="grid grid-cols-1 gap-3">
              {['Cash', 'Card', 'Credit'].map((method) => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    setCashReceived('');
                    setChangeAmount(0);
                    setErrorMessage('');
                  }}
                  className={`px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
                    paymentMethod === method
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Received Input (only for Cash payments) */}
          {paymentMethod === 'Cash' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cash Received (AED)
              </label>
              <input
                type="number"
                step="0.01"
                min={grandTotal}
                value={cashReceived}
                onChange={(e) => {
                  setCashReceived(e.target.value);
                  setErrorMessage('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && cashReceived && parseFloat(cashReceived) >= grandTotal) {
                    handleCompleteSale();
                  }
                }}
                placeholder={`Enter amount (min: ${grandTotal.toFixed(2)})`}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {cashReceived && parseFloat(cashReceived) >= grandTotal && changeAmount > 0 && (
                <div className="mt-3 p-3 bg-green-900 bg-opacity-50 border border-green-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Change to Give:</span>
                    <span className="text-green-400 font-bold text-xl">
                      AED {changeAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {cashReceived && parseFloat(cashReceived) < grandTotal && (
                <div className="mt-2 text-red-400 text-sm">
                  Insufficient amount. Need at least AED {grandTotal.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Complete Sale Button */}
          <button
            onClick={handleCompleteSale}
            disabled={
              isProcessing || 
              cartState.items.length === 0 || 
              !paymentMethod ||
              (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < grandTotal))
            }
            className={`w-full py-5 rounded-lg font-bold text-xl transition-colors ${
              isProcessing || 
              cartState.items.length === 0 || 
              !paymentMethod ||
              (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < grandTotal))
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isProcessing ? 'Processing...' : 'COMPLETE SALE'}
          </button>

          {/* Clear Cart Button */}
          {cartState.items.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear entire cart?')) {
                  dispatchCart({ type: 'CLEAR_CART' });
                  setPaymentMethod(null);
                  setShowPaymentPanel(false);
                }
              }}
              className="w-full mt-3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Transaction History Modal */}
      {showTransactionHistory && (
        <TransactionHistory onClose={() => setShowTransactionHistory(false)} />
      )}

      {/* Low Stock Alert Modal */}
      {showLowStockAlert && (
        <LowStockAlert onClose={() => setShowLowStockAlert(false)} />
      )}

      {/* Product Management Modal */}
      {showProductManagement && (
        <ProductManagement onClose={() => setShowProductManagement(false)} />
      )}

      {/* Reports Modal */}
      {showReports && (
        <Reports onClose={() => setShowReports(false)} />
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <Receipt
          receiptData={receiptData}
          onClose={() => {
            setShowReceipt(false);
            setReceiptData(null);
          }}
          autoPrint={false} // Set to true if you want auto-print on open
        />
      )}
    </div>
  );
}

export default App;


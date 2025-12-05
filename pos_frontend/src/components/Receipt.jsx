/**
 * Receipt Component
 * Professional receipt template for printing
 */

import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

function Receipt({ receiptData, companyInfo, onClose, autoPrint = false }) {
  const receiptRef = useRef(null);

  useEffect(() => {
    if (autoPrint && receiptData) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  }, [autoPrint, receiptData]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const receiptContent = receiptRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Transaction #${receiptData?.receipt?.id || ''}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 10mm;
                font-family: 'Courier New', monospace;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10mm;
              background: white;
              color: black;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .company-info {
              font-size: 10px;
              margin: 2px 0;
            }
            .receipt-body {
              margin: 15px 0;
            }
            .transaction-info {
              margin-bottom: 15px;
              font-size: 11px;
            }
            .transaction-info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items-section {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 10px 0;
              margin: 15px 0;
            }
            .item-row {
              margin: 8px 0;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .item-details {
              font-size: 10px;
              color: #333;
              margin-left: 10px;
            }
            .item-total {
              text-align: right;
              font-weight: bold;
            }
            .totals-section {
              margin: 15px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .total-row.final {
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 10px;
              font-size: 14px;
              font-weight: bold;
            }
            .payment-info {
              margin: 15px 0;
              text-align: center;
              font-size: 11px;
            }
            .payment-method {
              display: inline-block;
              padding: 5px 15px;
              border: 1px solid #000;
              border-radius: 3px;
              font-weight: bold;
            }
            .receipt-footer {
              text-align: center;
              border-top: 1px dashed #000;
              padding-top: 10px;
              margin-top: 15px;
              font-size: 10px;
            }
            .thank-you {
              font-size: 12px;
              font-weight: bold;
              margin: 10px 0;
            }
            .no-print {
              display: none;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      // Optionally close after printing
      // printWindow.close();
    }, 250);
  };

  if (!receiptData) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner text="Loading receipt..." />
      </div>
    );
  }

  // Handle both data structures: receiptData.receipt or receiptData directly
  const receipt = receiptData.receipt || receiptData;
  
  if (!receipt || !receipt.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-xl font-bold text-white mb-4">Receipt Error</h2>
          <p className="text-gray-300 mb-4">Receipt data is invalid or missing.</p>
          <pre className="text-xs text-gray-400 bg-gray-900 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(receiptData, null, 2)}
          </pre>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const company = companyInfo || receiptData.company || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-300">
          <h2 className="text-xl font-bold text-gray-800">Receipt</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Receipt Content - Print Optimized */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <div ref={receiptRef} className="receipt-content bg-white text-black">
            {/* Company Header */}
            <div className="receipt-header">
              <div className="company-name">{company.name || 'DilmaSuperPOS'}</div>
              {company.address && (
                <div className="company-info">{company.address}</div>
              )}
              {company.phone && (
                <div className="company-info">Tel: {company.phone}</div>
              )}
              {company.email && (
                <div className="company-info">{company.email}</div>
              )}
              {company.tax_id && (
                <div className="company-info">{company.tax_id}</div>
              )}
            </div>

            {/* Transaction Info */}
            <div className="transaction-info">
              <div className="transaction-info-row">
                <span>Transaction #:</span>
                <span className="font-bold">{receipt.id}</span>
              </div>
              <div className="transaction-info-row">
                <span>Date:</span>
                <span>{receipt.formatted_date || new Date(receipt.timestamp || receipt.formatted_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="transaction-info-row">
                <span>Time:</span>
                <span>{receipt.formatted_time || new Date(receipt.timestamp || receipt.formatted_timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="transaction-info-row">
                <span>Cashier:</span>
                <span>{receipt.cashier_username || 'N/A'}</span>
              </div>
            </div>

            {/* Items Section */}
            <div className="items-section">
              <div style={{ marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                ITEMS
              </div>
              {receipt.items && receipt.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-header">
                    <span>{item.product_name}</span>
                    <span className="item-total">AED {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="item-details">
                    SKU: {item.product_sku} | Qty: {item.quantity} × AED {parseFloat(item.unit_price_at_sale).toFixed(2)}
                    {(item.item_discount > 0 || item.discount_percentage > 0 || item.discount_amount > 0) && (
                      <div style={{ fontSize: '10px', color: '#22c55e', marginTop: '2px' }}>
                        Discount: - AED {parseFloat(item.item_discount || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="totals-section">
              {receipt.subtotal_before_discount && parseFloat(receipt.subtotal_before_discount) > parseFloat(receipt.subtotal) && (
                <>
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>AED {parseFloat(receipt.subtotal_before_discount).toFixed(2)}</span>
                  </div>
                  {receipt.total_discount && parseFloat(receipt.total_discount) > 0 && (
                    <div className="total-row" style={{ color: '#22c55e' }}>
                      <span>Discount:</span>
                      <span>- AED {parseFloat(receipt.total_discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="total-row" style={{ borderTop: '1px dashed #000', paddingTop: '5px', marginTop: '5px' }}>
                    <span>Subtotal After Discount:</span>
                    <span>AED {parseFloat(receipt.subtotal).toFixed(2)}</span>
                  </div>
                </>
              )}
              {(!receipt.subtotal_before_discount || parseFloat(receipt.subtotal_before_discount) === parseFloat(receipt.subtotal)) && (
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>AED {parseFloat(receipt.subtotal).toFixed(2)}</span>
                </div>
              )}
              <div className="total-row">
                <span>Tax ({receipt.tax_rate}% VAT):</span>
                <span>AED {parseFloat(receipt.tax_amount).toFixed(2)}</span>
              </div>
              <div className="total-row final">
                <span>TOTAL:</span>
                <span>AED {parseFloat(receipt.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="payment-info">
              <div>Payment Method:</div>
              <div className="payment-method">{receipt.payment_method || 'N/A'}</div>
              {receipt.payment_method === 'Cash' && receipt.cash_received && (
                <div style={{ marginTop: '10px', fontSize: '11px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    Cash Received: AED {parseFloat(receipt.cash_received || 0).toFixed(2)}
                  </div>
                  {receipt.change_amount && parseFloat(receipt.change_amount) > 0 && (
                    <div style={{ fontWeight: 'bold', color: '#22c55e', marginTop: '5px' }}>
                      Change: AED {parseFloat(receipt.change_amount).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="receipt-footer">
              <div className="thank-you">Thank You for Your Purchase!</div>
              <div>Please keep this receipt for your records</div>
              <div style={{ marginTop: '10px', fontSize: '9px' }}>
                Transaction ID: {receipt.id}
              </div>
              <div style={{ fontSize: '9px', marginTop: '5px' }}>
                {receipt.formatted_timestamp}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Not printed) */}
        <div className="p-4 border-t border-gray-300 bg-gray-50 no-print">
          <div className="flex gap-2 justify-center">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
            >
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Receipt;


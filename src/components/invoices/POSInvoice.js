import React from 'react';

// Optimized component for thermal POS printers
const POSInvoice = ({ invoiceData }) => {
  // Format currency
  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toFixed(2);
  };
  
  const totalPaid = (invoiceData.paymentMethods || []).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  // NOTE: For POS printers, we use a mix of tailwind and inline styles
  // Some specific width settings need to be inline for the POS printer to render correctly
  return (
    <div className="font-mono" style={{ width: '76mm', padding: '2mm', fontSize: '10pt' }}>
      {/* Restaurant Info - Center Aligned */}
      <div className="text-center mb-2">
        <div className="font-bold text-base">{invoiceData.restaurantDetails?.name || 'Restaurant Name'}</div>
        <div>{invoiceData.restaurantDetails?.address || ''}</div>
        <div>Phone: {invoiceData.restaurantDetails?.phone || ''}</div>
        {invoiceData.restaurantDetails?.email && <div>Email: {invoiceData.restaurantDetails.email}</div>}
        {invoiceData.restaurantDetails?.gstNumber && <div>GST: {invoiceData.restaurantDetails.gstNumber}</div>}
      </div>
      
      {/* Separator - using border instead of hr for better printer compatibility */}
      <div className="border-t border-dashed border-black my-1"></div>
      
      {/* Invoice Details */}
      <div className="mb-2">
        <div><span className="font-bold">Invoice #:</span> {invoiceData.invoiceNumber || ''}</div>
        <div><span className="font-bold">Date:</span> {invoiceData.invoiceDate || ''}</div>
        <div><span className="font-bold">Order #:</span> {invoiceData.salesOrder?.invoiceNumber || ''}</div>
        <div><span className="font-bold">Customer:</span> {invoiceData.customerDetails?.name || 'Customer'}</div>
        <div><span className="font-bold">Type:</span> {invoiceData.salesOrder?.orderMode || ''}</div>
        {invoiceData.additionalInfo?.tableNumber && (
          <div><span className="font-bold">Table:</span> {invoiceData.additionalInfo.tableNumber}</div>
        )}
      </div>
      
      {/* Separator */}
      <div className="border-t border-dashed border-black my-1"></div>
      
      {/* Items - we need flex layout for columns */}
      <div className="mb-2">
        {/* Header */}
        <div className="flex mb-1">
          <div className="flex-grow-6 font-bold">Item</div>
          <div className="w-8 text-center font-bold">Qty</div>
          <div className="w-16 text-right font-bold">Price</div>
          <div className="w-16 text-right font-bold">Total</div>
        </div>
        
        {/* Items */}
        {(invoiceData.items || []).map((item, index) => (
          <div key={index} className="flex mb-1">
            <div className="flex-grow-6 pr-1 break-words">{item.name || ''}</div>
            <div className="w-8 text-center">{item.quantity || 0}</div>
            <div className="w-16 text-right">{formatCurrency(item.price || 0)}</div>
            <div className="w-16 text-right">{formatCurrency(item.amount || 0)}</div>
          </div>
        ))}
      </div>
      
      {/* Separator */}
      <div className="border-t border-dashed border-black my-1"></div>
      
      {/* Summary */}
      <div className="mb-2">
        <div className="flex justify-between">
          <div>Subtotal:</div>
          <div>{formatCurrency(invoiceData.paymentDetails?.subtotal || 0)}</div>
        </div>
        
        {(invoiceData.paymentDetails?.discount || 0) > 0 && (
          <div className="flex justify-between">
            <div>Discount:</div>
            <div>-{formatCurrency(invoiceData.paymentDetails.discount)}</div>
          </div>
        )}
        
        {/* Taxes */}
        {(invoiceData.taxBreakup || []).map((tax, index) => (
          (tax.taxAmount || 0) > 0 && (
            <div key={index} className="flex justify-between">
              <div>{tax.taxName || 'Tax'}:</div>
              <div>{formatCurrency(tax.taxAmount || 0)}</div>
            </div>
          )
        ))}
        
        {/* Service Charge */}
        {(invoiceData.paymentDetails?.serviceCharge || 0) > 0 && (
          <div className="flex justify-between">
            <div>Service Charge:</div>
            <div>{formatCurrency(invoiceData.paymentDetails.serviceCharge)}</div>
          </div>
        )}
        
        {/* Round Off */}
        {(invoiceData.paymentDetails?.roundOff || 0) !== 0 && (
          <div className="flex justify-between">
            <div>Round Off:</div>
            <div>{formatCurrency(invoiceData.paymentDetails.roundOff)}</div>
          </div>
        )}
        
        {/* Grand Total */}
        <div className="flex justify-between font-bold mt-1">
          <div>Grand Total:</div>
          <div>{formatCurrency(invoiceData.paymentDetails?.grandTotal || 0)}</div>
        </div>
      </div>
      
      {/* Separator */}
      <div className="border-t border-dashed border-black my-1"></div>
      
      {/* Payment Info */}
      <div className="mb-2">
        <div className="font-bold mb-1">Payment Information</div>
        
        {/* Payment Methods */}
        {(invoiceData.paymentMethods || []).map((payment, index) => (
          <div key={index} className="flex justify-between">
            <div>{payment.method || 'Payment'}:</div>
            <div>{formatCurrency(payment.amount || 0)}</div>
          </div>
        ))}
        
        {/* Total Amount Paid */}
        <div className="flex justify-between font-bold">
          <div>Amount Paid:</div>
          <div>{formatCurrency(totalPaid)}</div>
        </div>
        
        {/* Due Amount */}
        {(invoiceData.dueAmount || 0) > 0 && (
          <div className="flex justify-between">
            <div>Due:</div>
            <div>{formatCurrency(invoiceData.dueAmount)}</div>
          </div>
        )}
        
        {/* Advances */}
        {(invoiceData.advances || 0) > 0 && (
          <div className="flex justify-between">
            <div>Advances:</div>
            <div>{formatCurrency(invoiceData.advances)}</div>
          </div>
        )}
      </div>
      
      {/* Separator */}
      <div className="border-t border-dashed border-black my-1"></div>
      
      {/* Footer */}
      <div className="text-center mt-2">
        <div>Thank you for choosing {invoiceData.restaurantDetails?.name || 'our restaurant'}!</div>
        <div className="mt-1">Please visit again</div>
      </div>
    </div>
  );
};

export default POSInvoice;
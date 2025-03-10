import React from 'react';
import { Printer, Share2, QrCode } from 'lucide-react';

const RestaurantInvoice = ({ 
  invoiceData,
  onPrint,
  onShare
}) => {
  
  // Format currency
  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toFixed(2);
  };
  
  const totalPaid = invoiceData.paymentMethods?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      {/* Actions */}
      <div className="flex justify-end mb-4 gap-2">
        {onPrint && (
          <button onClick={onPrint} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        )}
        {onShare && (
          <button onClick={onShare} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        )}
      </div>
      
      {/* Restaurant Info Section */}
      <div className="text-center mb-6">
        {/* Logo would go here */}
        <h1 className="text-2xl font-bold">{invoiceData.restaurantDetails?.name || 'Restaurant Name'}</h1>
        <p className="text-gray-700">{invoiceData.restaurantDetails?.address || ''}</p>
        <p className="text-gray-700">Phone: {invoiceData.restaurantDetails?.phone || ''}</p>
        {invoiceData.restaurantDetails?.email && (
          <p className="text-gray-700">Email: {invoiceData.restaurantDetails.email}</p>
        )}
        {invoiceData.restaurantDetails?.website && (
          <p className="text-gray-700">Website: {invoiceData.restaurantDetails.website}</p>
        )}
        {invoiceData.restaurantDetails?.vatNumber && (
          <p className="text-gray-700">VAT Number: {invoiceData.restaurantDetails.vatNumber}</p>
        )}
        {invoiceData.restaurantDetails?.gstNumber && (
          <p className="text-gray-700">GST Number: {invoiceData.restaurantDetails.gstNumber}</p>
        )}
      </div>
      
      {/* Divider */}
      <div className="border-b border-gray-300 my-4"></div>
      
      {/* Invoice Details Section */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-700"><strong>Invoice Number:</strong> #{invoiceData.invoiceNumber || ''}</p>
          <p className="text-gray-700"><strong>Invoice Date:</strong> {invoiceData.invoiceDate || ''}</p>
          <p className="text-gray-700"><strong>Order Number:</strong> #{invoiceData.salesOrder?.invoiceNumber || ''}</p>
        </div>
        <div>
          <p className="text-gray-700"><strong>Customer Name:</strong> {invoiceData.customerDetails?.name || 'Customer'}</p>
          {invoiceData.customerDetails?.address && (
            <p className="text-gray-700"><strong>Delivery Address:</strong> {invoiceData.customerDetails.address}</p>
          )}
          <p className="text-gray-700"><strong>Order Type:</strong> {invoiceData.salesOrder?.orderMode || ''}</p>
          {invoiceData.additionalInfo?.serverName && (
            <p className="text-gray-700"><strong>Server Name:</strong> {invoiceData.additionalInfo.serverName}</p>
          )}
          {invoiceData.additionalInfo?.bartenderName && (
            <p className="text-gray-700"><strong>Bartender Name:</strong> {invoiceData.additionalInfo.bartenderName}</p>
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div className="border-b border-gray-300 my-4"></div>
      
      {/* Items Table */}
      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left pb-2">Item Name</th>
            <th className="text-center pb-2">Qty</th>
            <th className="text-right pb-2">Unit Price</th>
            <th className="text-right pb-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {(invoiceData.items || []).map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2">{item.name || ''}</td>
              <td className="py-2 text-center">{item.quantity || 0}</td>
              <td className="py-2 text-right">{formatCurrency(item.price || 0)}</td>
              <td className="py-2 text-right">{formatCurrency(item.amount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Divider */}
      <div className="border-b border-gray-300 my-4"></div>
      
      {/* Summary Table */}
      <div className="w-1/2 ml-auto">
        <div className="flex justify-between mb-2">
          <span className="text-gray-700">Subtotal:</span>
          <span>{formatCurrency(invoiceData.paymentDetails?.subtotal || 0)}</span>
        </div>
        
        {/* Discount */}
        {(invoiceData.paymentDetails?.discount || 0) > 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Discount:</span>
            <span>-{formatCurrency(invoiceData.paymentDetails.discount)}</span>
          </div>
        )}
        
        {/* Divider */}
        <div className="border-b border-gray-300 my-2"></div>
        
        {/* Taxes */}
        {(invoiceData.taxBreakup || []).map((tax, index) => (
          (tax.taxAmount || 0) > 0 && (
            <div key={index} className="flex justify-between mb-2">
              <span className="text-gray-700">{tax.taxName || 'Tax'}:</span>
              <span>{formatCurrency(tax.taxAmount || 0)}</span>
            </div>
          )
        ))}
        
        {/* Service Charge */}
        {(invoiceData.paymentDetails?.serviceCharge || 0) > 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Service Charge:</span>
            <span>{formatCurrency(invoiceData.paymentDetails.serviceCharge)}</span>
          </div>
        )}
        
        {/* Round Off */}
        {(invoiceData.paymentDetails?.roundOff || 0) !== 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Round Off:</span>
            <span>{formatCurrency(invoiceData.paymentDetails.roundOff)}</span>
          </div>
        )}
        
        {/* Divider */}
        <div className="border-b border-gray-300 my-2"></div>
        
        {/* Grand Total */}
        <div className="flex justify-between mb-2 font-bold">
          <span>Grand Total:</span>
          <span>{formatCurrency(invoiceData.paymentDetails?.grandTotal || 0)}</span>
        </div>
      </div>
      
      {/* Divider */}
      <div className="border-b border-gray-300 my-4"></div>
      
      {/* Payment Info */}
      <div className="mb-4">
        <h3 className="font-bold mb-2">Payment Information</h3>
        
        {/* Payment Methods */}
        {(invoiceData.paymentMethods || []).map((payment, index) => (
          <div key={index} className="flex justify-between mb-1">
            <span className="text-gray-700">{payment.method || 'Payment'}:</span>
            <span>{formatCurrency(payment.amount || 0)}</span>
          </div>
        ))}
        
        {/* Total Amount Paid */}
        <div className="flex justify-between mb-1 font-semibold">
          <span>Total Amount Paid:</span>
          <span>{formatCurrency(totalPaid)}</span>
        </div>
        
        {/* Due Amount */}
        {(invoiceData.dueAmount || 0) > 0 && (
          <div className="flex justify-between mb-1 text-red-600">
            <span>Due:</span>
            <span>{formatCurrency(invoiceData.dueAmount)}</span>
          </div>
        )}
        
        {/* Advances */}
        {(invoiceData.advances || 0) > 0 && (
          <div className="flex justify-between mb-1 text-green-600">
            <span>Advances:</span>
            <span>{formatCurrency(invoiceData.advances)}</span>
          </div>
        )}
      </div>
      
      {/* Divider */}
      <div className="border-b border-gray-300 my-4"></div>
      
      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-gray-700 mb-4">Thank you for choosing {invoiceData.restaurantDetails?.name || 'our restaurant'}!</p>
        
        {/* QR Code placeholder */}
        <div className="flex justify-center mb-4">
          <div className="border border-gray-300 p-4 inline-block">
            <QrCode size={80} />
            <p className="text-xs mt-2">Scan to reorder</p>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm">Follow us on our Social Media</p>
      </div>
    </div>
  );
};

export default RestaurantInvoice;
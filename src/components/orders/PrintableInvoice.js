import React, { useEffect } from 'react';

const PrintableInvoice = ({ invoice, order }) => {
  useEffect(() => {
    // Auto-print when component mounts
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  if (!invoice || !order) {
    return <div>No invoice data available.</div>;
  }

  return (
    <div className="printable-invoice">
      <style jsx global>{`
        @media print {
          body { 
            width: 80mm;
            margin: 0;
            padding: 0;
            font-size: 10pt;
          }
          .printable-invoice {
            width: 72mm;
            padding: 4mm;
          }
          .print-button {
            display: none;
          }
        }
      `}</style>

      <div className="invoice-header">
        <h1>{invoice.restaurantDetails?.name || 'Restaurant'}</h1>
        <p>{invoice.restaurantDetails?.address || ''}</p>
        <p>Phone: {invoice.restaurantDetails?.phone || ''}</p>
        {invoice.restaurantDetails?.email && <p>Email: {invoice.restaurantDetails.email}</p>}
        {invoice.restaurantDetails?.gstin && <p>GSTIN: {invoice.restaurantDetails.gstin}</p>}
      </div>

      <div className="invoice-details">
        <h2>INVOICE #{invoice.invoiceNumber}</h2>
        <p>Date: {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : ''}</p>
        <p>Order #: {order.invoiceNumber}</p>
        <p>Type: {order.orderMode}</p>
      </div>

      <div className="customer-details">
        <h3>Customer</h3>
        <p>{invoice.customerDetails?.name || 'Customer'}</p>
        <p>Phone: {invoice.customerDetails?.phone || ''}</p>
      </div>

      <div className="invoice-items">
        <h3>Items</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.map((item, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left' }}>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>₹{item.price?.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>₹{item.amount?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-summary">
        <table style={{ width: '100%', marginTop: '1rem' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left' }}>Subtotal:</td>
              <td style={{ textAlign: 'right' }}>₹{invoice.paymentDetails?.subtotal?.toFixed(2) || '0.00'}</td>
            </tr>
            {invoice.taxBreakup && invoice.taxBreakup.map((tax, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left' }}>{tax.taxName} ({tax.taxRate}%):</td>
                <td style={{ textAlign: 'right' }}>₹{tax.taxAmount?.toFixed(2) || '0.00'}</td>
              </tr>
            ))}
            {invoice.paymentDetails?.discount > 0 && (
              <tr>
                <td style={{ textAlign: 'left' }}>Discount:</td>
                <td style={{ textAlign: 'right' }}>-₹{invoice.paymentDetails.discount?.toFixed(2) || '0.00'}</td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ textAlign: 'left' }}>Total:</td>
              <td style={{ textAlign: 'right' }}>₹{invoice.paymentDetails?.grandTotal?.toFixed(2) || '0.00'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="payment-methods">
        <h3>Payment</h3>
        {invoice.paymentMethods && invoice.paymentMethods.map((payment, index) => (
          <p key={index}>
            {payment.method}: ₹{payment.amount?.toFixed(2)}
            {payment.transactionId && ` (${payment.transactionId})`}
          </p>
        ))}
      </div>

      <div className="invoice-footer" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p>Thank you for your business!</p>
        <p>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <button 
        className="print-button" 
        onClick={() => window.print()} 
        style={{ display: 'block', margin: '2rem auto' }}
      >
        Print Invoice
      </button>
    </div>
  );
};

export default PrintableInvoice;
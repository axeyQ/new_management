import React, { forwardRef, useEffect, useState } from 'react';
import POSInvoice from '@/components/invoices/POSInvoice';

// Using forwardRef is critical for react-to-print to work properly
const InvoicePrint = forwardRef(({ invoice, order }, ref) => {
  const [ready, setReady] = useState(false);
  
  // Make sure the component signals it's ready after mounting
  useEffect(() => {
    // Small delay to ensure everything renders
    const timer = setTimeout(() => {
      setReady(true);
      console.log('InvoicePrint component ready for printing');
    }, 300); // Increased delay for more reliable rendering
    
    return () => clearTimeout(timer);
  }, [invoice, order]);
  
  if (!invoice || !order) {
    console.warn('InvoicePrint: Missing invoice or order data');
    return <div ref={ref}>No invoice data available.</div>;
  }
  
  // Map your existing data structure to the invoice component props
  const mappedInvoiceData = {
    // Restaurant Info from the invoice.restaurantDetails
    restaurantDetails: {
      name: invoice.restaurantDetails?.name || 'Restaurant Name',
      address: invoice.restaurantDetails?.address || '',
      phone: invoice.restaurantDetails?.phone || '',
      email: invoice.restaurantDetails?.email || '',
      website: invoice.restaurantDetails?.website || '',
      vatNumber: invoice.restaurantDetails?.vatNumber || '',
      gstNumber: invoice.restaurantDetails?.gstin || ''
    },
    // Invoice Details
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '',
    // Order Details
    salesOrder: {
      invoiceNumber: order.invoiceNumber || '',
      orderMode: order.orderMode || 'Dine-in'
    },
    // Customer Information
    customerDetails: {
      name: invoice.customerDetails?.name || 'Customer',
      phone: invoice.customerDetails?.phone || '',
      email: invoice.customerDetails?.email || '',
      address: invoice.customerDetails?.address || ''
    },
    // Staff Information from additionalInfo
    additionalInfo: {
      serverName: invoice.additionalInfo?.serverName || '',
      bartenderName: '', // Add if you track this
      orderType: invoice.additionalInfo?.orderType || order.orderMode,
      tableNumber: invoice.additionalInfo?.tableNumber ||
        (order.table?.tableName || '')
    },
    // Invoice Items
    items: (invoice.items || []).map(item => ({
      name: item.name || 'Unknown Item',
      quantity: item.quantity || 0,
      price: item.price || 0,
      amount: item.amount || 0
    })),
    // Payment Details
    paymentDetails: {
      subtotal: invoice.paymentDetails?.subtotal || 0,
      discount: invoice.paymentDetails?.discount || 0,
      taxTotal: invoice.paymentDetails?.taxTotal || 0,
      serviceCharge: 0, // Add if you track this
      roundOff: 0, // Add if you track this
      grandTotal: invoice.paymentDetails?.grandTotal || 0,
      amountPaid: invoice.paymentDetails?.amountPaid || 0
    },
    // Tax Breakdown
    taxBreakup: (invoice.taxBreakup || []).map(tax => ({
      taxName: tax.taxName || 'Tax',
      taxRate: tax.taxRate || 0,
      taxableAmount: tax.taxableAmount || 0,
      taxAmount: tax.taxAmount || 0
    })),
    // Payment Methods
    paymentMethods: (invoice.paymentMethods || []).map(payment => ({
      method: payment.method || 'Cash',
      amount: payment.amount || 0,
      transactionId: payment.transactionId || ''
    })),
    // Payment Status
    isPaid: invoice.isPaid || false,
    dueAmount: (invoice.paymentDetails?.grandTotal || 0) - (invoice.paymentDetails?.amountPaid || 0),
    advances: 0 // Add if you track this
  };
  
  // IMPORTANT: Return a div with the ref directly applied to it
  // The width style is critical for POS receipt-style printing
  return (
    <div 
      ref={ref} 
      className="print-container" 
      style={{ 
        width: '80mm', 
        padding: '5mm',
        backgroundColor: '#ffffff'
      }}
      data-ready={ready} // Add a data attribute to help with debugging
    >
      {ready && <POSInvoice invoiceData={mappedInvoiceData} />}
    </div>
  );
});

// Add display name for better debugging
InvoicePrint.displayName = 'InvoicePrint';

export default InvoicePrint;
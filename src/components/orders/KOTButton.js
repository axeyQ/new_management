import React from 'react';
import POSInvoice from '@/components/invoices/POSInvoice';

// This component acts as a wrapper that maps your system data to the invoice format
const InvoicePrint = ({ invoice, order }) => {
  if (!invoice || !order) return null;
  
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
      bartenderName: '',  // Add if you track this
      orderType: invoice.additionalInfo?.orderType || order.orderMode,
      tableNumber: invoice.additionalInfo?.tableNumber || (order.table?.tableName || '')
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
      serviceCharge: 0,  // Add if you track this
      roundOff: 0,  // Add if you track this
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
    advances: 0  // Add if you track this
  };
  
  return <POSInvoice invoiceData={mappedInvoiceData} />;
};

export default InvoicePrint;
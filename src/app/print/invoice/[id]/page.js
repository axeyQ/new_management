// src/app/print/invoice/[id]/page.js
'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Divider,
  Button,
  CircularProgress,
  Container
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';

export default function ThermalInvoicePrintPage() {
  const params = useParams();
  const { id } = params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch invoice data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch invoice data
        const invoiceResponse = await axiosWithAuth.get(`/api/orders/invoice/${id}`);
        
        if (!invoiceResponse.data.success) {
          setError('Failed to load invoice data');
          setLoading(false);
          return;
        }
        
        const invoiceData = invoiceResponse.data.data;
        
        // Fetch outlet data (assuming the first outlet for simplicity)
        // In a multi-outlet setup, you can use a specific outlet ID from the order/invoice
        const outletResponse = await axiosWithAuth.get('/api/outlets');
        
        if (outletResponse.data.success && outletResponse.data.data.length > 0) {
          // Get the first outlet
          const outletData = outletResponse.data.data[0];
          
          // Merge restaurant details from outlet with invoice data
          const updatedInvoice = {
            ...invoiceData,
            restaurantDetails: {
              name: outletData.name,
              address: outletData.address,
              city: outletData.city,
              state: outletData.state,
              postalCode: outletData.postalCode,
              phone: outletData.phone,
              email: outletData.email,
              gstin: outletData.gstNumber,
              fssaiLicense: '', // Add if available in your outlet model
              // Combine address components if address field is not comprehensive
              fullAddress: `${outletData.address}${outletData.city ? `, ${outletData.city}` : ''}${outletData.state ? `, ${outletData.state}` : ''}${outletData.postalCode ? ` - ${outletData.postalCode}` : ''}`
            }
          };
          
          setInvoice(updatedInvoice);
        } else {
          // Fall back to invoice data if outlet info isn't available
          setInvoice(invoiceData);
        }
        
        // Auto-print if this is the first load
        if (invoiceData && !invoiceData.isPrinted) {
          // Short delay to ensure content is loaded
          setTimeout(() => {
            window.print();
            // Mark as printed after printing
            axiosWithAuth.put(`/api/orders/invoice/${id}`, {
              isPrinted: true,
              printedAt: new Date()
            }).catch(err => console.error('Error marking invoice as printed:', err));
          }, 1000);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Error: ${error.message || 'Could not load data'}`);
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      fetchData();
    }
  }, [id]);

  // Handle print function
  const handlePrint = () => {
    window.print();
  };

  // Go back function
  const handleBack = () => {
    window.history.back();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading invoice...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" my={5}>
        <Typography variant="h4" color="error" gutterBottom>Error</Typography>
        <Typography variant="body1">{error}</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 3 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box textAlign="center" my={5}>
        <Typography variant="h4" gutterBottom>Invoice Not Found</Typography>
        <Typography variant="body1">The requested invoice could not be found.</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 3 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* Print Controls - Hidden during print */}
      <Box className="no-print" sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Back
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PrintIcon />} 
          onClick={handlePrint}
        >
          Print
        </Button>
      </Box>

      {/* Invoice Content - Thermal Receipt Style */}
      <Container maxWidth="xs" className="thermal-receipt">
      <Box textAlign="center" mb={2}>
  <Typography variant="h5" fontWeight="bold">
    {invoice.restaurantDetails?.name || 'Restaurant Name'}
  </Typography>
  <Typography variant="body2">
    {invoice.restaurantDetails?.fullAddress || invoice.restaurantDetails?.address || 'Restaurant Address'}
  </Typography>
  <Typography variant="body2">
    Phone: {invoice.restaurantDetails?.phone || 'Restaurant Phone'}
  </Typography>
  {invoice.restaurantDetails?.email && (
    <Typography variant="body2">
      Email: {invoice.restaurantDetails.email}
    </Typography>
  )}
  {invoice.restaurantDetails?.gstin && (
    <Typography variant="body2">
      GSTIN: {invoice.restaurantDetails.gstin}
    </Typography>
  )}
  {invoice.restaurantDetails?.fssaiLicense && (
    <Typography variant="body2">
      FSSAI: {invoice.restaurantDetails.fssaiLicense}
    </Typography>
  )}
</Box>

        <Divider style={{ borderStyle: 'dashed' }} />
        
        <Box textAlign="center" my={1}>
          <Typography variant="h6" fontWeight="bold">INVOICE</Typography>
          <Typography variant="body2">{invoice.invoiceNumber}</Typography>
          <Typography variant="body2">Date: {formatDate(invoice.invoiceDate)}</Typography>
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />
        
        {/* Order Info */}
        <Box my={1}>
          <Typography variant="body2">
            <strong>Order Type:</strong> {invoice.additionalInfo?.orderType || 'Dine-in'}
          </Typography>
          {invoice.additionalInfo?.tableNumber && (
            <Typography variant="body2">
              <strong>Table:</strong> {invoice.additionalInfo.tableNumber}
            </Typography>
          )}
          <Typography variant="body2">
            <strong>Customer:</strong> {invoice.customerDetails?.name || 'Guest'}
          </Typography>
          {invoice.customerDetails?.phone && (
            <Typography variant="body2">
              <strong>Phone:</strong> {invoice.customerDetails.phone}
            </Typography>
          )}
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />
        
        {/* Items Section */}
        <Box my={1}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" fontWeight="bold" style={{ width: '40%' }}>
              Item
            </Typography>
            <Typography variant="body2" fontWeight="bold" style={{ width: '15%', textAlign: 'center' }}>
              Qty
            </Typography>
            <Typography variant="body2" fontWeight="bold" style={{ width: '20%', textAlign: 'right' }}>
              Rate
            </Typography>
            <Typography variant="body2" fontWeight="bold" style={{ width: '25%', textAlign: 'right' }}>
              Amount
            </Typography>
          </Box>
          
          {invoice.items && invoice.items.map((item, index) => (
            <Box key={index} display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" style={{ width: '40%' }}>
                {item.name}
              </Typography>
              <Typography variant="body2" style={{ width: '15%', textAlign: 'center' }}>
                {item.quantity}
              </Typography>
              <Typography variant="body2" style={{ width: '20%', textAlign: 'right' }}>
                ₹{item.price.toFixed(2)}
              </Typography>
              <Typography variant="body2" style={{ width: '25%', textAlign: 'right' }}>
                ₹{item.amount.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />

        {/* Summary */}
        <Box my={1}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">Subtotal:</Typography>
            <Typography variant="body2">₹{invoice.paymentDetails?.subtotal.toFixed(2) || '0.00'}</Typography>
          </Box>
          
          {/* Tax Breakdown */}
          {invoice.taxBreakup && invoice.taxBreakup.map((tax, index) => (
            <Box key={index} display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">{tax.taxName} ({tax.taxRate}%):</Typography>
              <Typography variant="body2">₹{tax.taxAmount.toFixed(2)}</Typography>
            </Box>
          ))}
          
          {/* Other charges */}
          {invoice.paymentDetails?.discount > 0 && (
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Discount:</Typography>
              <Typography variant="body2">-₹{invoice.paymentDetails.discount.toFixed(2)}</Typography>
            </Box>
          )}
          
          {invoice.paymentDetails?.deliveryCharge > 0 && (
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Delivery:</Typography>
              <Typography variant="body2">₹{invoice.paymentDetails.deliveryCharge.toFixed(2)}</Typography>
            </Box>
          )}
          
          {invoice.paymentDetails?.packagingCharge > 0 && (
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Packaging:</Typography>
              <Typography variant="body2">₹{invoice.paymentDetails.packagingCharge.toFixed(2)}</Typography>
            </Box>
          )}
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />
        
        {/* Total */}
        <Box my={1}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body1" fontWeight="bold">TOTAL:</Typography>
            <Typography variant="body1" fontWeight="bold">₹{invoice.paymentDetails?.grandTotal.toFixed(2) || '0.00'}</Typography>
          </Box>
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />
        
        {/* Payment Method */}
        <Box my={1}>
          <Typography variant="body2" fontWeight="bold">Payment Method:</Typography>
          {invoice.paymentMethods && invoice.paymentMethods.map((payment, index) => (
            <Box key={index} display="flex" justifyContent="space-between">
              <Typography variant="body2">{payment.method}:</Typography>
              <Typography variant="body2">₹{payment.amount.toFixed(2)}</Typography>
            </Box>
          ))}
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />
        
        {/* Footer */}
        <Box textAlign="center" mt={2} mb={3}>
          <Typography variant="body2" fontWeight="bold">Thank you for your business!</Typography>
          {invoice.additionalInfo?.notes && (
            <Typography variant="body2" fontStyle="italic">
              {invoice.additionalInfo.notes}
            </Typography>
          )}
          <Typography variant="body2" mt={1}>
            {formatDate(new Date())}
          </Typography>
        </Box>
      </Container>

      {/* Add print-specific styles optimized for thermal printers */}
      <style jsx global>{`
        @media screen {
          .thermal-receipt {
            border: 1px dashed #ccc;
            padding: 8px;
            background-color: white;
          }
        }
        
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background-color: white;
            font-size: 12px;
            width: 80mm; /* Standard thermal receipt width */
          }
          
          .thermal-receipt {
            width: 72mm; /* Allow for margins */
            padding: 0;
            margin: 0;
          }
          
          @page {
            size: 80mm auto; /* Width of thermal paper */
            margin: 3mm;
          }
        }
      `}</style>
    </>
  );
}
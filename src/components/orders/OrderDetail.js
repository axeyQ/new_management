// src/components/orders/OrderDetail.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import KotList from './KotList';
import ZomatoOrderStatus from './ZomatoOrderStatus';
import ZomatoOrderTimeline from './ZomatoOrderTimeline';
import GenerateInvoiceButton from './GenerateInvoiceButton';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`order-tabpanel-${index}`}
      aria-labelledby={`order-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OrderDetail = ({ orderId, onClose, inDialog = false }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [kotsForOrder, setKotsForOrder] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const router = useRouter();
  const [outletInfo, setOutletInfo] = useState(null);

  // Helper function to safely access order status
  const safelyAccessOrderStatus = (order) => {
    if (!order || !order.orderStatus) return 'Unknown';
    return order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1);
  };

  const fetchOutletInfo = async () => {
    try {
      const res = await axiosWithAuth.get('/api/outlets');
      if (res.data.success && res.data.data.length > 0) {
        console.log('Outlet info fetched:', res.data.data[0]);
        setOutletInfo(res.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching outlet information:', error);
    }
  };
  

  // Helper function to safely fetch KOTs
  const safelyFetchKotsForOrder = async (orderId) => {
    try {
      if (!orderId) {
        console.error('Invalid order ID for KOT fetch');
        return [];
      }
      const res = await axiosWithAuth.get(`/api/orders/kot?orderId=${orderId}`);
      if (res.data && res.data.success) {
        return res.data.data || [];
      } else {
        console.warn('KOT fetch returned unsuccessful status:', res.data?.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching KOTs:', error);
      return [];
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchKotsForOrder();
      fetchInvoice();
      fetchOutletInfo();
    }
  }, [orderId]);

  useEffect(() => {
    // If this is a Zomato order, switch to the Zomato tab (index 3)
    if (order && order.orderMode === 'Zomato') {
      console.log('This is a Zomato order, switching to Zomato tab');
      // Check if the Zomato tab exists (index 3)
      if (tabValue !== 3) {
        // Add a slight delay to allow the component to fully render
        setTimeout(() => {
          setTabValue(3);
        }, 100);
      }
    }
  }, [order]); // This will run when the order data is loaded/changed

  // Re-fetch invoice data when switching to invoice tab
  useEffect(() => {
    if (tabValue === 2) { // 2 is the index for the invoice tab
      fetchInvoice();
    }
  }, [tabValue]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      if (!orderId) {
        toast.error('No order ID provided');
        setLoading(false);
        return;
      }
      console.log(`Fetching order details for ID: ${orderId}`);
      const res = await axiosWithAuth.get(`/api/orders/${orderId}`);
      // Log the entire response for debugging
      console.log('API Response:', res);

      if (res.data && res.data.success) {
        if (!res.data.data) {
          console.error('API returned success but no data object');
          toast.error('Order data is empty');
          setLoading(false);
          return;
        }
        // Log the order data structure to debug
        console.log('Order data structure:', res.data.data);
        // Check if important fields exist
        if (!res.data.data.orderMode || !res.data.data.customer) {
          console.error('Order data is missing critical fields:', res.data.data);
          toast.error('Order data is incomplete');
        }
        setOrder(res.data.data);
        setNewStatus(res.data.data?.orderStatus || 'pending');
      } else {
        console.error('Failed response:', res.data);
        toast.error(res.data?.message || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Error loading order details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchKotsForOrder = async () => {
    try {
      if (!orderId) {
        console.error('Invalid order ID for KOT fetch');
        setKotsForOrder([]);
        return;
      }
      const kots = await safelyFetchKotsForOrder(orderId);
      setKotsForOrder(kots);
    } catch (error) {
      console.error('Error in KOT fetch wrapper:', error);
      setKotsForOrder([]);
      // Show a more specific error message for schema errors
      if (error.message && error.message.includes('Schema')) {
        toast.error('Database configuration error: Missing AddOn schema. Please contact support.');
      }
    }
  };

  const fetchInvoice = async () => {
    try {
      if (!orderId) {
        console.error('[OrderDetail] Invalid order ID for invoice fetch');
        return;
      }
      setInvoiceLoading(true);
      console.log(`[OrderDetail] Fetching invoice for order: ${orderId}`);
      const res = await axiosWithAuth.get(`/api/orders/invoice?orderId=${orderId}`);
      console.log('[OrderDetail] Invoice fetch response:', res.data);
      if (res.data && res.data.success) {
        if (res.data.data && res.data.data.length > 0) {
          console.log('[OrderDetail] Invoice found:', res.data.data[0]._id);
          setInvoice(res.data.data[0]);
        } else {
          console.log('[OrderDetail] No invoice found for this order');
          setInvoice(null);
        }
      } else {
        console.warn('[OrderDetail] Invoice fetch returned unsuccessful status:', res.data?.message);
        setInvoice(null);
      }
    } catch (error) {
      console.error('[OrderDetail] Error fetching invoice:', error);
      setInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    router.push('/dashboard/orders');
  };

  const handleEditOrder = () => {
    if (orderId) {
      router.push(`/dashboard/orders/edit/${orderId}`);
    } else {
      toast.error('Cannot edit: Missing order ID');
    }
  };

  const openStatus = () => {
    setOpenStatusDialog(true);
  };

  const closeStatus = () => {
    setOpenStatusDialog(false);
  };

  const updateOrderStatus = async () => {
    try {
      if (!orderId) {
        toast.error('Missing order ID');
        return;
      }
      const res = await axiosWithAuth.put(`/api/orders/${orderId}/status`, {
        status: newStatus
      });
      if (res.data && res.data.success) {
        toast.success('Order status updated successfully');
        fetchOrderDetails();
      } else {
        toast.error(res.data?.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating order status');
    } finally {
      closeStatus();
    }
  };

  // NEW INVOICE PRINTING METHOD
  const openInvoiceInNewWindow = useCallback(() => {
    if (!invoice || !invoice._id) {
      toast.error('No invoice available to print');
      return;
    }
  
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        toast.error('Pop-up blocked! Please allow pop-ups for this site.');
        return;
      }
  
      // Mark invoice as printed in database
      axiosWithAuth.put(`/api/orders/invoice/${invoice._id}`, {
        isPrinted: true
      }).then(res => {
        if (res.data.success) {
          toast.success('Invoice marked as printed');
        }
      }).catch(err => {
        console.error('Error marking invoice as printed:', err);
      });
  
      // Get outlet info (either from state or fallback to invoice data)
      const outlet = outletInfo || {
        name: invoice.restaurantDetails?.name || 'Restaurant Name',
        address: invoice.restaurantDetails?.address || '',
        phone: invoice.restaurantDetails?.phone || '',
        email: invoice.restaurantDetails?.email || '',
        website: invoice.restaurantDetails?.website || '',
        vatNumber: invoice.restaurantDetails?.vatNumber || '',
        gstNumber: invoice.restaurantDetails?.gstin || ''
      };
  
      // Write content to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice #${invoice.invoiceNumber || 'Unknown'}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background: #f5f5f5;
              }
              @media print {
                body {
                  width: 80mm;
                  background: white;
                  font-size: 10pt;
                }
                .print-container {
                  width: 72mm;
                  margin: 0;
                  padding: 4mm;
                  box-shadow: none;
                  background: white;
                }
                .no-print {
                  display: none !important;
                }
              }
              .print-container {
                width: 80mm;
                margin: 20px auto;
                padding: 10mm;
                background: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              .logo-container {
                text-align: center;
                margin-bottom: 10px;
              }
              .logo {
                max-width: 100%;
                max-height: 60px;
                display: inline-block;
              }
              h1 {
                font-size: 14pt;
                text-align: center;
                margin: 0 0 5mm 0;
              }
              h2 {
                font-size: 12pt;
                margin: 3mm 0;
                text-align: center;
              }
              h3 {
                font-size: 11pt;
                margin: 2mm 0;
                border-bottom: 1px solid #eee;
                padding-bottom: 1mm;
              }
              p {
                margin: 1mm 0;
                line-height: 1.4;
              }
              .outlet-info {
                text-align: center;
                font-size: 9pt;
                margin-bottom: 5mm;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 2mm 0;
              }
              th, td {
                padding: 1mm 2mm;
                text-align: left;
              }
              th {
                border-bottom: 1px solid #ddd;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
              .footer {
                margin-top: 5mm;
                text-align: center;
                font-size: 9pt;
                color: #666;
              }
              .print-button {
                display: block;
                margin: 10mm auto;
                padding: 10px 15px;
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
              }
              .bold {
                font-weight: bold;
              }
              hr {
                border: none;
                border-top: 1px dashed #ccc;
                margin: 5mm 0;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <!-- Logo and Restaurant Details -->
              <div class="logo-container">
                ${outlet.logoUrl ? `<img src="${outlet.logoUrl}" alt="${outlet.name}" class="logo" />` : ''}
              </div>
              
              <h1>${outlet.name || 'Restaurant'}</h1>
              
              <div class="outlet-info">
                ${outlet.address ? `<p>${outlet.address}</p>` : ''}
                ${outlet.phone ? `<p>Phone: ${outlet.phone}</p>` : ''}
                ${outlet.email ? `<p>Email: ${outlet.email}</p>` : ''}
                ${outlet.website ? `<p>Website: ${outlet.website}</p>` : ''}
                ${outlet.vatNumber ? `<p>VAT Number: ${outlet.vatNumber}</p>` : ''}
                ${outlet.gstNumber ? `<p>GST Number: ${outlet.gstNumber}</p>` : ''}
              </div>
              
              <hr>
              
              <!-- Invoice Details -->
              <h2>INVOICE #${invoice.invoiceNumber || ''}</h2>
              <table>
                <tbody>
                  <tr>
                    <td>Date:</td>
                    <td>${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : ''}</td>
                  </tr>
                  <tr>
                    <td>Order #:</td>
                    <td>${order.invoiceNumber || ''}</td>
                  </tr>
                  <tr>
                    <td>Type:</td>
                    <td>${order.orderMode || ''}</td>
                  </tr>
                  ${(order.orderMode === 'Dine-in' || order.orderMode === 'Direct Order-TableQR') && order.table ? `
                  <tr>
                    <td>Table:</td>
                    <td>${order.table?.tableName || (typeof order.table === 'string' ? order.table : '')}</td>
                  </tr>
                  ` : ''}
                  ${invoice.additionalInfo?.serverName ? `
                  <tr>
                    <td>Server:</td>
                    <td>${invoice.additionalInfo.serverName}</td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
              
              <!-- Customer Details -->
              <h3>Customer</h3>
              <p>${invoice.customerDetails?.name || 'Customer'}</p>
              <p>Phone: ${invoice.customerDetails?.phone || ''}</p>
              ${invoice.customerDetails?.email ? `<p>Email: ${invoice.customerDetails.email}</p>` : ''}
              ${invoice.customerDetails?.address ? `<p>Address: ${invoice.customerDetails.address}</p>` : ''}
              
              <hr>
              
              <!-- Items Table -->
              <h3>Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(invoice.items || []).map(item => `
                    <tr>
                      <td>${item.name || 'Unknown Item'}</td>
                      <td class="text-center">${item.quantity || 0}</td>
                      <td class="text-right">₹${(item.price || 0).toFixed(2)}</td>
                      <td class="text-right">₹${(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <hr>
              
              <!-- Summary Table -->
              <table>
                <tbody>
                  <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">₹${(invoice.paymentDetails?.subtotal || 0).toFixed(2)}</td>
                  </tr>
                  ${(invoice.taxBreakup || []).map(tax => `
                    <tr>
                      <td>${tax.taxName || 'Tax'} (${tax.taxRate || 0}%):</td>
                      <td class="text-right">₹${(tax.taxAmount || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  ${(invoice.paymentDetails?.discount > 0) ? `
                    <tr>
                      <td>Discount:</td>
                      <td class="text-right">-₹${(invoice.paymentDetails.discount || 0).toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  ${(invoice.paymentDetails?.deliveryCharge > 0) ? `
                    <tr>
                      <td>Delivery Charge:</td>
                      <td class="text-right">₹${(invoice.paymentDetails.deliveryCharge || 0).toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  ${(invoice.paymentDetails?.packagingCharge > 0) ? `
                    <tr>
                      <td>Packaging Charge:</td>
                      <td class="text-right">₹${(invoice.paymentDetails.packagingCharge || 0).toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td class="bold">Total:</td>
                    <td class="text-right bold">₹${(invoice.paymentDetails?.grandTotal || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              
              <hr>
              
              <!-- Payment Methods -->
              <h3>Payment</h3>
              ${(invoice.paymentMethods || []).map(payment => `
                <p>${payment.method || 'Cash'}: ₹${(payment.amount || 0).toFixed(2)}
                ${payment.transactionId ? ` (${payment.transactionId})` : ''}</p>
              `).join('')}
              
              <!-- Footer -->
              <div class="footer">
                <p>Thank you for your business!</p>
                <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
              </div>
              
              <button class="print-button no-print" onclick="window.print()">Print Invoice</button>
            </div>
            
            <script>
              // Auto-print when loaded
              window.onload = function() {
                // Check if image is loaded before printing
                var logo = document.querySelector('.logo');
                if (logo) {
                  // If there's a logo, wait for it to load
                  if (logo.complete) {
                    setTimeout(function() { window.print(); }, 1000);
                  } else {
                    logo.onload = function() {
                      setTimeout(function() { window.print(); }, 1000);
                    };
                    // Fallback in case image fails to load
                    logo.onerror = function() {
                      setTimeout(function() { window.print(); }, 1000);
                    };
                  }
                } else {
                  // No logo, print immediately
                  setTimeout(function() { window.print(); }, 1000);
                }
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error opening print window:', error);
      toast.error('Error preparing invoice for print: ' + error.message);
    }
  }, [invoice, order, outletInfo]); // Add outletInfo to dependencies

  const sendInvoiceEmail = async () => {
    if (!invoice || !invoice._id) {
      toast.error('No invoice available to send');
      return;
    }
    try {
      const res = await axiosWithAuth.put(`/api/orders/invoice/${invoice._id}`, {
        isEmailSent: true
      });
      if (res.data.success) {
        toast.success('Invoice email sent successfully');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Error sending invoice email');
    }
  };

  const getOrderStatusColor = (status) => {
    if (!status) return 'default';
    switch (status) {
      case 'pending': return 'default';
      case 'preparing': return 'warning';
      case 'ready': return 'info';
      case 'served': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'out-for-delivery': return 'primary';
      case 'scheduled': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="error">Order not found</Typography>
        <Button variant="outlined" startIcon={<BackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Orders
        </Button>
      </Box>
    );
  }

  // Determine if this is a Zomato order
  const isZomatoOrder = order.orderMode === 'Zomato';

  return (
    <Box>
      {!inDialog && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={handleBack}>
            Back to Orders
          </Button>
          <Box>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditOrder} sx={{ mr: 1 }}>
              Edit Order
            </Button>
            <Button variant="contained" color="primary" onClick={openStatus}>
              Update Status
            </Button>
          </Box>
        </Box>
      )}

      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="order details tabs">
            <Tab label="Order Details" />
            <Tab label="KOT" />
            <Tab label="Invoice" />
            {isZomatoOrder && <Tab label="Zomato Tracking" />}
          </Tabs>
        </Box>

        {/* Order Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Order #{order.invoiceNumber || 'Unknown'}
                  </Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Chip
                      label={safelyAccessOrderStatus(order)}
                      color={getOrderStatusColor(order?.orderStatus)}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {order.orderDateTime
                        ? new Date(order.orderDateTime).toLocaleString()
                        : 'Unknown date'}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Order Type
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {order.orderMode || 'Unknown'}
                    {order.table && ` - Table: ${order.table?.tableName || 'Unknown'}`}
                    {order.numOfPeople && ` - ${order.numOfPeople} people`}
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Customer Information
                  </Typography>
                  <Typography variant="body2">
                    {order.customer?.name || 'Unknown'}
                    <br />
                    {order.customer?.phone || 'No phone'}
                    <br />
                    {order.customer?.email && `${order.customer.email}`}
                    {order.customer?.address && (
                      <>
                        <br />
                        Address: {order.customer.address}
                      </>
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payment Details
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="primary">
                      Total: ₹{(order.totalAmount || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Methods
                  </Typography>
                  {order.payment && order.payment.length > 0 ? (
                    order.payment.map((payment, index) => (
                      <Box key={index} mb={1}>
                        <Typography variant="body2">
                          {payment.method}: ₹{payment.amount.toFixed(2)}
                          {payment.transactionId && ` (ID: ${payment.transactionId})`}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2">No payment information</Typography>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Summary
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2">₹{(order.subtotalAmount || 0).toFixed(2)}</Typography>
                  </Box>
                  {order.taxDetails && order.taxDetails.map((tax, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{tax.taxName || 'Tax'}:</Typography>
                      <Typography variant="body2">₹{(tax.taxAmount || 0).toFixed(2)}</Typography>
                    </Box>
                  ))}
                  {order.discount && (order.discount.discountPercentage > 0 || order.discount.discountValue > 0) && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Discount:</Typography>
                      <Typography variant="body2" color="error">
                        -₹{(order.discount.discountType === 'percentage'
                          ? (order.subtotalAmount || 0) * (order.discount.discountPercentage || 0) / 100
                          : order.discount.discountValue || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                  {(order.deliveryCharge || 0) > 0 && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Delivery Charge:</Typography>
                      <Typography variant="body2">₹{(order.deliveryCharge || 0).toFixed(2)}</Typography>
                    </Box>
                  )}
                  {(order.packagingCharge || 0) > 0 && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Packaging Charge:</Typography>
                      <Typography variant="body2">₹{(order.packagingCharge || 0).toFixed(2)}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Order Items
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {order.itemsSold && order.itemsSold.length > 0 ? (
                          order.itemsSold.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.dish ? item.dish.dishName || item.dishName : item.dishName || 'Unknown Item'}
                                </Typography>
                                {item.variant && (
                                  <Typography variant="caption" color="text.secondary">
                                    Variant: {item.variant.variantName || item.variantName || 'Unknown Variant'}
                                  </Typography>
                                )}
                                {item.notes && (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Note: {item.notes}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>₹{(item.price || 0).toFixed(2)}</TableCell>
                              <TableCell>{item.quantity || 0}</TableCell>
                              <TableCell>₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center">No items in this order</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* KOT Tab */}
        <TabPanel value={tabValue} index={1}>
          {kotsForOrder ? (
            <KotList
              orderId={orderId}
              kots={kotsForOrder || []}
              onKotCreated={fetchKotsForOrder}
            />
          ) : (
            <Box textAlign="center" p={3}>
              <Typography variant="body1" color="error" gutterBottom>
                Unable to load Kitchen Order Tickets due to a database configuration error.
              </Typography>
              <Typography variant="body2" gutterBottom>
                The system is missing the AddOn model schema. This requires administrator attention.
              </Typography>
              <Button variant="outlined" color="primary" onClick={() => tabValue !== 0 && setTabValue(0)} sx={{ mt: 2 }}>
                View Order Details
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Invoice Tab */}
        <TabPanel value={tabValue} index={2}>
          {invoiceLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={5}>
              <CircularProgress />
            </Box>
          ) : invoice ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={openInvoiceInNewWindow}
                    disabled={invoice.isPrinted}
                  >
                    {invoice.isPrinted ? 'Already Printed' : 'Print Invoice'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    onClick={sendInvoiceEmail}
                    disabled={invoice.isEmailSent || !order.customer?.email}
                  >
                    {invoice.isEmailSent ? 'Email Sent' : 'Email Invoice'}
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Typography variant="h6">Invoice #{invoice.invoiceNumber || 'Unknown'}</Typography>
                      <Chip label={invoice.isPaid ? 'Paid' : 'Unpaid'} color={invoice.isPaid ? 'success' : 'error'} />
                    </Box>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>Restaurant Details</Typography>
                        <Typography variant="body2">
                          {invoice.restaurantDetails?.name || 'Restaurant'}
                          <br />
                          {invoice.restaurantDetails?.address || 'Address not available'}
                          <br />
                          Phone: {invoice.restaurantDetails?.phone || 'N/A'}
                          <br />
                          {invoice.restaurantDetails?.email && `Email: ${invoice.restaurantDetails.email}`}
                          <br />
                          {invoice.restaurantDetails?.gstin && `GSTIN: ${invoice.restaurantDetails.gstin}`}
                          <br />
                          {invoice.restaurantDetails?.fssaiLicense && `FSSAI: ${invoice.restaurantDetails.fssaiLicense}`}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>Customer Details</Typography>
                        <Typography variant="body2">
                          {invoice.customerDetails?.name || 'Customer'}
                          <br />
                          Phone: {invoice.customerDetails?.phone || 'N/A'}
                          <br />
                          {invoice.customerDetails?.email && `Email: ${invoice.customerDetails.email}`}
                          <br />
                          {invoice.customerDetails?.address && `Address: ${invoice.customerDetails.address}`}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle2" gutterBottom>Invoice Items</Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoice.items && invoice.items.length > 0 ? (
                            invoice.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.name || 'Unknown Item'}</TableCell>
                                <TableCell align="right">₹{(item.price || 0).toFixed(2)}</TableCell>
                                <TableCell align="right">{item.quantity || 0}</TableCell>
                                <TableCell align="right">₹{(item.amount || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} align="center">No items in this invoice</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box mt={3} display="flex" justifyContent="flex-end">
                      <Box width="300px">
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Subtotal:</Typography>
                          <Typography variant="body2">₹{(invoice.paymentDetails?.subtotal || 0).toFixed(2)}</Typography>
                        </Box>
                        {invoice.taxBreakup && invoice.taxBreakup.map((tax, index) => (
                          <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">{tax.taxName} ({tax.taxRate}%):</Typography>
                            <Typography variant="body2">₹{(tax.taxAmount || 0).toFixed(2)}</Typography>
                          </Box>
                        ))}
                        {(invoice.paymentDetails?.discount || 0) > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Discount:</Typography>
                            <Typography variant="body2" color="error">-₹{(invoice.paymentDetails.discount || 0).toFixed(2)}</Typography>
                          </Box>
                        )}
                        {(invoice.paymentDetails?.deliveryCharge || 0) > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Delivery Charge:</Typography>
                            <Typography variant="body2">₹{(invoice.paymentDetails.deliveryCharge || 0).toFixed(2)}</Typography>
                          </Box>
                        )}
                        {(invoice.paymentDetails?.packagingCharge || 0) > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Packaging Charge:</Typography>
                            <Typography variant="body2">₹{(invoice.paymentDetails.packagingCharge || 0).toFixed(2)}</Typography>
                          </Box>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle2" fontWeight="bold">Grand Total:</Typography>
                          <Typography variant="subtitle2" fontWeight="bold">₹{(invoice.paymentDetails?.grandTotal || 0).toFixed(2)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Amount Paid:</Typography>
                          <Typography variant="body2">₹{(invoice.paymentDetails?.amountPaid || 0).toFixed(2)}</Typography>
                        </Box>
                        {(invoice.paymentDetails?.changeReturned || 0) > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Change Returned:</Typography>
                            <Typography variant="body2">₹{(invoice.paymentDetails.changeReturned || 0).toFixed(2)}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Invoice Date: {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleString() : 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.additionalInfo?.notes && `Note: ${invoice.additionalInfo.notes}`}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box textAlign="center" p={5}>
              <Typography variant="body1" gutterBottom>
                {tabValue === 2 ? 'Checking for invoice...' : 'No invoice found for this order.'}
              </Typography>
              <Box sx={{ maxWidth: 300, mx: 'auto', mt: 3 }}>
                <GenerateInvoiceButton
                  orderId={orderId}
                  onSuccess={(newInvoice) => {
                    console.log('[OrderDetail] Invoice received from button:', newInvoice);
                    if (newInvoice) {
                      setInvoice(newInvoice);
                      toast.success('Invoice loaded successfully');
                    }
                  }}
                />
              </Box>
            </Box>
          )}
        </TabPanel>

        {/* Zomato Tracking Tab - only shown for Zomato orders */}
        {isZomatoOrder && (
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ZomatoOrderStatus
                  order={order}
                  onStatusUpdate={(updatedOrder) => {
                    setOrder(updatedOrder);
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <ZomatoOrderTimeline order={order} />
              </Grid>
            </Grid>
          </TabPanel>
        )}
      </Paper>

      {/* Status Update Dialog */}
      <Dialog open={openStatusDialog} onClose={closeStatus}>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="status-update-label">Status</InputLabel>
            <Select
              labelId="status-update-label"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="served">Served</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              {isZomatoOrder && (
                <>
                  <MenuItem value="out-for-delivery">Out for Delivery</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                </>
              )}
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStatus}>Cancel</Button>
          <Button onClick={updateOrderStatus} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetail;
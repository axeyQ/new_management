// src/components/orders/OrderDetail.js
'use client';
import { useState, useEffect } from 'react';
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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const OrderDetail = ({ orderId, onClose, inDialog = false }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [kotsForOrder, setKotsForOrder] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchKotsForOrder();
      fetchInvoice();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await axiosWithAuth.get(`/api/orders/${orderId}`);
      if (res.data.success) {
        setOrder(res.data.data);
        setNewStatus(res.data.data.orderStatus);
      } else {
        toast.error('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Error loading order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchKotsForOrder = async () => {
    try {
      const res = await axiosWithAuth.get(`/api/orders/kot?order=${orderId}`);
      if (res.data.success) {
        setKotsForOrder(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching KOTs:', error);
    }
  };

  const fetchInvoice = async () => {
    try {
      const res = await axiosWithAuth.get(`/api/orders/invoice?order=${orderId}`);
      if (res.data.success && res.data.data.length > 0) {
        setInvoice(res.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    router.push('/dashboard/orders');
  };

  const handleEditOrder = () => {
    router.push(`/dashboard/orders/edit/${orderId}`);
  };

  const openStatus = () => {
    setOpenStatusDialog(true);
  };

  const closeStatus = () => {
    setOpenStatusDialog(false);
  };

  const updateOrderStatus = async () => {
    try {
      const res = await axiosWithAuth.put(`/api/orders/${orderId}`, {
        orderStatus: newStatus
      });

      if (res.data.success) {
        toast.success('Order status updated successfully');
        fetchOrderDetails();
      } else {
        toast.error(res.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating order status');
    } finally {
      closeStatus();
    }
  };

  const createInvoice = async () => {
    try {
      const res = await axiosWithAuth.post('/api/orders/invoice', {
        salesOrder: orderId
      });

      if (res.data.success) {
        toast.success('Invoice created successfully');
        fetchInvoice();
      } else {
        toast.error(res.data.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error.response?.data?.message || 'Error creating invoice');
    }
  };

  const printInvoice = async () => {
    if (!invoice) {
      toast.error('No invoice available to print');
      return;
    }

    try {
      const res = await axiosWithAuth.put(`/api/orders/invoice/${invoice._id}`, {
        isPrinted: true
      });

      if (res.data.success) {
        toast.success('Invoice marked as printed');
        // In a real app, this would open a print dialog or redirect to a print-friendly page
        window.open(`/print/invoice/${invoice._id}`, '_blank');
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Error printing invoice');
    }
  };

  const sendInvoiceEmail = async () => {
    if (!invoice) {
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
    switch (status) {
      case 'pending': return 'default';
      case 'preparing': return 'warning';
      case 'ready': return 'info';
      case 'served': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
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
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {!inDialog && (
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
        >
          Back to Orders
        </Button>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEditOrder}
            sx={{ mr: 1 }}
          >
            Edit Order
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={openStatus}
          >
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
          </Tabs>
        </Box>

        {/* Order Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Order #{order.invoiceNumber}
                  </Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Chip 
                      label={order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)} 
                      color={getOrderStatusColor(order.orderStatus)}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {new Date(order.orderDateTime).toLocaleString()}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>Order Type</Typography>
                  <Typography variant="body2" paragraph>
                    {order.orderMode}
                    {order.table && ` - Table: ${order.table.tableName}`}
                    {order.numOfPeople && ` - ${order.numOfPeople} people`}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>Customer Information</Typography>
                  <Typography variant="body2">
                    {order.customer.name}<br />
                    {order.customer.phone}<br />
                    {order.customer.email && `${order.customer.email}`}
                    {order.customer.address && (
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
                      Total: ₹{order.totalAmount.toFixed(2)}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>Payment Methods</Typography>
                  {order.payment.map((payment, index) => (
                    <Box key={index} mb={1}>
                      <Typography variant="body2">
                        {payment.method}: ₹{payment.amount.toFixed(2)}
                        {payment.transactionId && ` (ID: ${payment.transactionId})`}
                      </Typography>
                      </Box>
                  ))}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>Payment Summary</Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2">₹{order.subtotalAmount.toFixed(2)}</Typography>
                  </Box>
                  
                  {order.taxDetails.map((tax, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{tax.taxName}:</Typography>
                      <Typography variant="body2">₹{tax.taxAmount.toFixed(2)}</Typography>
                    </Box>
                  ))}
                  
                  {order.discount && (order.discount.discountPercentage > 0 || order.discount.discountValue > 0) && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Discount:</Typography>
                      <Typography variant="body2" color="error">
                        -₹{(order.discount.discountType === 'percentage' 
                          ? (order.subtotalAmount * order.discount.discountPercentage / 100) 
                          : order.discount.discountValue).toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                  
                  {order.deliveryCharge > 0 && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Delivery Charge:</Typography>
                      <Typography variant="body2">₹{order.deliveryCharge.toFixed(2)}</Typography>
                    </Box>
                  )}
                  
                  {order.packagingCharge > 0 && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Packaging Charge:</Typography>
                      <Typography variant="body2">₹{order.packagingCharge.toFixed(2)}</Typography>
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
                        {order.itemsSold.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.dish ? item.dish.dishName : item.dishName}
                              </Typography>
                              {item.variant && (
                                <Typography variant="caption" color="text.secondary">
                                  Variant: {item.variant.variantName || item.variantName}
                                </Typography>
                              )}
                              {item.notes && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Note: {item.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>₹{item.price.toFixed(2)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
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
          <KotList orderId={orderId} kots={kotsForOrder} onKotCreated={fetchKotsForOrder} />
        </TabPanel>

        {/* Invoice Tab */}
        <TabPanel value={tabValue} index={2}>
          {invoice ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={printInvoice}
                    disabled={invoice.isPrinted}
                  >
                    {invoice.isPrinted ? 'Already Printed' : 'Print Invoice'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    onClick={sendInvoiceEmail}
                    disabled={invoice.isEmailSent || !order.customer.email}
                  >
                    {invoice.isEmailSent ? 'Email Sent' : 'Email Invoice'}
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6">Invoice #{invoice.invoiceNumber}</Typography>
                      <Chip 
                        label={invoice.isPaid ? 'Paid' : 'Unpaid'} 
                        color={invoice.isPaid ? 'success' : 'error'} 
                      />
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Restaurant Details
                        </Typography>
                        <Typography variant="body2">
                          {invoice.restaurantDetails.name}<br />
                          {invoice.restaurantDetails.address}<br />
                          Phone: {invoice.restaurantDetails.phone}<br />
                          {invoice.restaurantDetails.email && `Email: ${invoice.restaurantDetails.email}`}<br />
                          {invoice.restaurantDetails.gstin && `GSTIN: ${invoice.restaurantDetails.gstin}`}<br />
                          {invoice.restaurantDetails.fssaiLicense && `FSSAI: ${invoice.restaurantDetails.fssaiLicense}`}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Customer Details
                        </Typography>
                        <Typography variant="body2">
                          {invoice.customerDetails.name}<br />
                          Phone: {invoice.customerDetails.phone}<br />
                          {invoice.customerDetails.email && `Email: ${invoice.customerDetails.email}`}<br />
                          {invoice.customerDetails.address && `Address: ${invoice.customerDetails.address}`}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Invoice Items
                    </Typography>
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
                          {invoice.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">₹{item.price.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">₹{item.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    <Box mt={3} display="flex" justifyContent="flex-end">
                      <Box width="300px">
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Subtotal:</Typography>
                          <Typography variant="body2">₹{invoice.paymentDetails.subtotal.toFixed(2)}</Typography>
                        </Box>
                        
                        {invoice.taxBreakup.map((tax, index) => (
                          <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                              {tax.taxName} ({tax.taxRate}%):
                            </Typography>
                            <Typography variant="body2">₹{tax.taxAmount.toFixed(2)}</Typography>
                          </Box>
                        ))}
                        
                        {invoice.paymentDetails.discount > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Discount:</Typography>
                            <Typography variant="body2" color="error">-₹{invoice.paymentDetails.discount.toFixed(2)}</Typography>
                          </Box>
                        )}
                        
                        {invoice.paymentDetails.deliveryCharge > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Delivery Charge:</Typography>
                            <Typography variant="body2">₹{invoice.paymentDetails.deliveryCharge.toFixed(2)}</Typography>
                          </Box>
                        )}
                        
                        {invoice.paymentDetails.packagingCharge > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Packaging Charge:</Typography>
                            <Typography variant="body2">₹{invoice.paymentDetails.packagingCharge.toFixed(2)}</Typography>
                          </Box>
                        )}
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle2" fontWeight="bold">Grand Total:</Typography>
                          <Typography variant="subtitle2" fontWeight="bold">₹{invoice.paymentDetails.grandTotal.toFixed(2)}</Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Amount Paid:</Typography>
                          <Typography variant="body2">₹{invoice.paymentDetails.amountPaid.toFixed(2)}</Typography>
                        </Box>
                        
                        {invoice.paymentDetails.changeReturned > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Change Returned:</Typography>
                            <Typography variant="body2">₹{invoice.paymentDetails.changeReturned.toFixed(2)}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Invoice Date: {new Date(invoice.invoiceDate).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.additionalInfo.notes && `Note: ${invoice.additionalInfo.notes}`}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box textAlign="center" p={3}>
              <Typography variant="body1" gutterBottom>No invoice has been generated for this order yet.</Typography>
              <Button
                variant="contained"
                startIcon={<ReceiptIcon />}
                onClick={createInvoice}
                sx={{ mt: 2 }}
              >
                Generate Invoice
              </Button>
            </Box>
          )}
        </TabPanel>
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
'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Grid,
  IconButton,
  Paper,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CreditCard as CardIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

// Define payment methods
const paymentMethods = [
  { id: 'Cash', label: 'Cash', icon: <PaymentIcon /> },
  { id: 'Credit Card', label: 'Credit Card', icon: <CardIcon /> },
  { id: 'Debit Card', label: 'Debit Card', icon: <CardIcon /> },
  { id: 'UPI', label: 'UPI', icon: <PaymentIcon /> },
  { id: 'ZomatoPay', label: 'Zomato Pay', icon: <PaymentIcon /> },
];

const PaymentDialog = ({ open, onClose, order, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState([
    { method: 'Cash', amount: 0, transactionId: '' }
  ]);
  const [total, setTotal] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [change, setChange] = useState(0);

  // Initialize values when dialog opens or order changes
  useEffect(() => {
    if (order && open) {
      const orderTotal = order.totalAmount || 0;
      setTotal(orderTotal);
      
      // Initialize with order's payment info or default to Cash
      if (order.payment && order.payment.length > 0) {
        setPaymentDetails([...order.payment]);
      } else {
        setPaymentDetails([{ method: 'Cash', amount: orderTotal, transactionId: '' }]);
      }
      
      // Calculate initial amount paid and change
      updateAmounts();
    }
  }, [order, open]);

  // Update totals whenever payment details change
  useEffect(() => {
    updateAmounts();
  }, [paymentDetails]);

  const updateAmounts = () => {
    const paid = paymentDetails.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    setAmountPaid(paid);
    setChange(paid - total > 0 ? paid - total : 0);
  };

  const handleMethodChange = (index, value) => {
    const updated = [...paymentDetails];
    updated[index].method = value;
    setPaymentDetails(updated);
  };

  const handleAmountChange = (index, value) => {
    const updated = [...paymentDetails];
    updated[index].amount = parseFloat(value) || 0;
    setPaymentDetails(updated);
  };

  const handleTransactionIdChange = (index, value) => {
    const updated = [...paymentDetails];
    updated[index].transactionId = value;
    setPaymentDetails(updated);
  };

  const addPaymentMethod = () => {
    setPaymentDetails([...paymentDetails, { method: 'Cash', amount: 0, transactionId: '' }]);
  };

  const removePaymentMethod = (index) => {
    const updated = [...paymentDetails];
    updated.splice(index, 1);
    setPaymentDetails(updated);
  };

  const handleProcessPayment = async () => {
    // Validate payment total matches or exceeds order total
    if (Math.abs(amountPaid - total) < 0.01 || amountPaid > total) {
      setLoading(true);
      try {
        // Ensure payment details are properly formatted
        const formattedPaymentDetails = paymentDetails.map(payment => ({
          method: payment.method,
          amount: parseFloat(payment.amount) || 0,
          transactionId: payment.transactionId || undefined,
          paymentDate: new Date()
        }));

        // Update order with payment information and mark as completed
        const updatedOrderData = {
          payment: formattedPaymentDetails,
          orderStatus: 'completed'
        };

        // For a new order, we'll process it directly
        // For an existing order, we would call the API to update it
        if (order._id) {
          const orderResponse = await axiosWithAuth.put(`/api/orders/${order._id}`, updatedOrderData);
          
          if (orderResponse.data.success) {
            toast.success('Payment processed successfully');
            if (order.orderMode === 'Dine-in' && order.table) {
                try {
                  await axiosWithAuth.put(`/api/tables/${order.table}/status`, {
                    status: 'available'
                  });
                  console.log(`Table ${order.table} released after payment`);
                } catch (tableError) {
                  console.error('Error releasing table:', tableError);
                  toast.error('Payment processed but table could not be released');
                }
              }
            // Try creating or updating invoice
            try {
              // Check if invoice already exists
              const invoiceCheckResponse = await axiosWithAuth.get(`/api/orders/invoice?orderId=${order._id}`);
              
              if (invoiceCheckResponse.data.data && invoiceCheckResponse.data.data.length > 0) {
                // Update existing invoice
                await axiosWithAuth.put(`/api/orders/invoice/${invoiceCheckResponse.data.data[0]._id}`, {
                  paymentMethods: formattedPaymentDetails,
                  isPaid: true,
                  paymentDetails: {
                    amountPaid: amountPaid,
                    changeReturned: change
                  }
                });
              } else {
                // Create new invoice
                await axiosWithAuth.post('/api/orders/invoice', {
                  salesOrder: order._id
                });
              }
            } catch (error) {
              console.error('Error with invoice:', error);
              toast.error('Payment complete but invoice creation failed');
            }
            
            if (onSuccess) onSuccess(orderResponse.data.data);
            onClose();
          } else {
            toast.error(orderResponse.data.message || 'Failed to process payment');
          }
        } else {
          // For a new order, just pass back the payment details
          const updatedOrder = {
            ...order,
            payment: formattedPaymentDetails,
            orderStatus: 'completed'
          };
          
          if (onSuccess) onSuccess(updatedOrder);
          onClose();
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        toast.error(error.response?.data?.message || 'Error processing payment');
      } finally {
        setLoading(false);
      }
    } else {
      toast.error('Payment amount must equal order total');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Process Payment
        <IconButton
          onClick={onClose}
          disabled={loading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Order Details */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Order Details</Typography>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Order Mode:</Typography>
                <Typography variant="body2">{order?.orderMode || '-'}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Customer:</Typography>
                <Typography variant="body2">{order?.customer?.name || '-'}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Items:</Typography>
                <Typography variant="body2">{order?.itemsSold?.length || 0} items</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">₹{(order?.subtotalAmount || 0).toFixed(2)}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Tax:</Typography>
                <Typography variant="body2">₹{(order?.totalTaxAmount || 0).toFixed(2)}</Typography>
              </Box>
              
              {(order?.discount?.discountValue || 0) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Discount:</Typography>
                  <Typography variant="body2" color="error">-₹{(order?.discount?.discountValue || 0).toFixed(2)}</Typography>
                </Box>
              )}
              
              {(order?.deliveryCharge || 0) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Delivery:</Typography>
                  <Typography variant="body2">₹{(order?.deliveryCharge || 0).toFixed(2)}</Typography>
                </Box>
              )}
              
              {(order?.packagingCharge || 0) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Packaging:</Typography>
                  <Typography variant="body2">₹{(order?.packagingCharge || 0).toFixed(2)}</Typography>
                </Box>
              )}
              
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Typography variant="subtitle2">Total:</Typography>
                <Typography variant="subtitle2">₹{(order?.totalAmount || 0).toFixed(2)}</Typography>
              </Box>
            </Paper>
          </Grid>
          
          {/* Payment Methods */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.light' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>Payment Methods</Typography>
              
              {/* UPI, Credit Card, Debit Card options */}
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ mb: 2, bgcolor: 'grey.700' }}
                onClick={() => handleMethodChange(0, 'UPI')}
              >
                UPI
              </Button>
              
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ mb: 2, bgcolor: 'grey.700' }}
                onClick={() => handleMethodChange(0, 'Credit Card')}
              >
                CREDIT CARD
              </Button>
              
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ mb: 2, bgcolor: 'grey.700' }}
                onClick={() => handleMethodChange(0, 'Debit Card')}
              >
                DEBIT CARD
              </Button>
              
              {/* Cash option with amount fields */}
              <Box display="flex" alignItems="center" mb={2}>
                <Button 
                  variant="contained" 
                  sx={{ flexGrow: 1, bgcolor: 'grey.700' }}
                  onClick={() => handleMethodChange(0, 'Cash')}
                >
                  CASH
                </Button>
                
                <TextField
                  label="RECEIVED AMT."
                  variant="outlined"
                  size="small"
                  type="number"
                  value={paymentDetails[0]?.amount || 0}
                  onChange={(e) => handleAmountChange(0, e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  sx={{ 
                    ml: 1, 
                    width: 150,
                    bgcolor: 'white',
                    borderRadius: 1
                  }}
                />
                
                <TextField
                  label="BALANCE AMT."
                  variant="outlined"
                  size="small"
                  type="number"
                  value={change}
                  InputProps={{
                    readOnly: true,
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  sx={{ 
                    ml: 1, 
                    width: 150,
                    bgcolor: 'white',
                    borderRadius: 1
                  }}
                />
              </Box>
              
              {/* Part-pay option with multiple payment methods */}
              <Box display="flex" alignItems="center" mb={3}>
                <Button 
                  variant="contained" 
                  sx={{ flexGrow: 1, bgcolor: 'grey.700' }}
                >
                  PART-PAY
                </Button>
                
                <Button
                  variant="outlined"
                  sx={{ 
                    ml: 1, 
                    bgcolor: 'white',
                    borderRadius: 1
                  }}
                  onClick={() => handleMethodChange(0, 'Credit Card')}
                >
                  PAYMENT METHOD 1
                </Button>
                
                <Button
                  variant="outlined"
                  sx={{ 
                    ml: 1, 
                    bgcolor: 'white',
                    borderRadius: 1
                  }}
                  onClick={() => handleMethodChange(1, 'Cash')}
                >
                  PAYMENT METHOD 2
                </Button>
              </Box>
            </Paper>
            
            {/* Payment summary */}
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body1">Total to Pay:</Typography>
                <Typography variant="body1" fontWeight="bold">₹{total.toFixed(2)}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body1">Amount Received:</Typography>
                <Typography variant="body1">₹{amountPaid.toFixed(2)}</Typography>
              </Box>
              
              {change > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" fontWeight="bold">Change to Return:</Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.main">₹{change.toFixed(2)}</Typography>
                </Box>
              )}
              
              {Math.abs(amountPaid - total) > 0.01 && amountPaid < total && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  Amount received is less than total amount
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        <Button
          variant="contained"
          color="success"
          onClick={handleProcessPayment}
          disabled={loading || (Math.abs(amountPaid - total) > 0.01 && amountPaid < total)}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ minWidth: 150 }}
        >
          {loading ? 'Processing...' : 'Complete Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
// src/components/orders/PaymentButton.js
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Grid,
  Paper,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

// Define payment methods - this is important!
const paymentMethods = [
  { id: 'Cash', label: 'Cash' },
  { id: 'Credit Card', label: 'Credit Card' },
  { id: 'Debit Card', label: 'Debit Card' },
  { id: 'UPI', label: 'UPI' },
  { id: 'ZomatoPay', label: 'Zomato Pay' }
];

const PaymentButton = ({ order, onSuccess }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [change, setChange] = useState(0);

  const handleOpenDialog = () => {
    // Initialize with a single payment method for the full amount
    const initialPayment = [{ 
      method: 'Cash', 
      amount: order?.totalAmount || 0,
      transactionId: ''
    }];
    
    setPaymentDetails(initialPayment);
    updateAmounts(initialPayment);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (!loading) {
      setOpenDialog(false);
    }
  };

  const updateAmounts = (payments = paymentDetails) => {
    const paid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    setAmountPaid(paid);
    
    const orderTotal = order?.totalAmount || 0;
    setChange(paid > orderTotal ? paid - orderTotal : 0);
  };

  const handlePaymentMethodChange = (index, method) => {
    const updated = [...paymentDetails];
    updated[index].method = method;
    setPaymentDetails(updated);
  };

  const handleAmountChange = (index, value) => {
    const updated = [...paymentDetails];
    updated[index].amount = parseFloat(value) || 0;
    setPaymentDetails(updated);
    updateAmounts(updated);
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
    updateAmounts(updated);
  };

  const handleProcessPayment = async () => {
    const orderTotal = order?.totalAmount || 0;
    
    // Validate payment total matches or exceeds order total
    if (Math.abs(amountPaid - orderTotal) > 0.01 && amountPaid < orderTotal) {
      toast.error('Payment amount must at least equal order total');
      return;
    }
    
    setLoading(true);
    
    try {
      // Format payment data properly
      const formattedPayments = paymentDetails.map(payment => ({
        method: payment.method || 'Cash',
        amount: parseFloat(payment.amount) || 0,
        transactionId: payment.transactionId || undefined,
        paymentDate: new Date()
      }));
      
      console.log('Processing payment with details:', {
        orderId: order?._id,
        payment: formattedPayments,
        orderStatus: 'completed'
      });
      
      // Update order with payment information and mark as completed
      const updatedOrderData = {
        payment: formattedPayments,
        orderStatus: 'completed'
      };
      
      const orderResponse = await axiosWithAuth.put(`/api/orders/${order._id}`, updatedOrderData);
      
      console.log('Payment response:', orderResponse.data);
      
      if (orderResponse.data && orderResponse.data.success) {
        toast.success('Payment processed successfully');
        
        // Try creating or updating invoice
        try {
          const invoiceData = {
            salesOrder: order._id
          };
          
          await axiosWithAuth.post('/api/orders/invoice', invoiceData);
        } catch (error) {
          console.error('Error with invoice:', error);
          console.error('Invoice error details:', error.response?.data);
          // Don't fail the whole operation if invoice creation fails
          toast.error('Payment complete but invoice creation failed');
        }
        
        setOpenDialog(false);
        if (onSuccess) {
          onSuccess(orderResponse.data.data);
        }
      } else {
        toast.error(orderResponse.data?.message || 'Failed to process payment');
        console.error('Payment failed:', orderResponse.data);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      console.error('Error details:', error.response?.data);
      
      toast.error(
        error.response?.data?.message || 
        'Error processing payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isPaymentEnabled = () => {
    return order?.orderStatus === 'served' || 
           order?.orderStatus === 'ready' || 
           order?.orderStatus === 'pending' || 
           order?.orderStatus === 'preparing';
  };

  const orderTotal = order?.totalAmount || 0;

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<PaymentIcon />}
        onClick={handleOpenDialog}
        disabled={!isPaymentEnabled() || order?.orderStatus === 'completed' || order?.orderStatus === 'cancelled'}
      >
        Process Payment
      </Button>
      
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Process Payment
          <IconButton
            onClick={handleCloseDialog}
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
                  <Typography variant="body2">Order #:</Typography>
                  <Typography variant="body2">{order?.invoiceNumber || '-'}</Typography>
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
                
                {order?.discount && order.discount.discountValue > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Discount:</Typography>
                    <Typography variant="body2" color="error">-₹{order.discount.discountValue.toFixed(2)}</Typography>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Typography variant="subtitle2">Total:</Typography>
                  <Typography variant="subtitle2">₹{orderTotal.toFixed(2)}</Typography>
                </Box>
              </Paper>
            </Grid>
            
            {/* Payment Methods */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Payment Methods</Typography>
                
                {paymentDetails.map((payment, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={5}>
                        <FormControl fullWidth size="small">
                          <InputLabel id={`payment-method-${index}-label`}>Method</InputLabel>
                          <Select
                            labelId={`payment-method-${index}-label`}
                            value={payment.method}
                            onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
                            label="Method"
                          >
                            {paymentMethods.map((method) => (
                              <MenuItem key={method.id} value={method.id}>
                                {method.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Amount"
                          type="number"
                          value={payment.amount}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={3}>
                        {paymentDetails.length > 1 && (
                          <IconButton 
                            color="error" 
                            onClick={() => removePaymentMethod(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Grid>
                      
                      {payment.method !== 'Cash' && (
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Transaction ID"
                            value={payment.transactionId || ''}
                            onChange={(e) => handleTransactionIdChange(index, e.target.value)}
                            placeholder="For card/UPI payments"
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ))}
                
                <Button
                  startIcon={<AddIcon />}
                  onClick={addPaymentMethod}
                  disabled={paymentDetails.length >= 3 || loading}
                  sx={{ mt: 1 }}
                >
                  Add Payment Method
                </Button>
                
                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1">Total to Pay:</Typography>
                  <Typography variant="body1" fontWeight="bold">₹{orderTotal.toFixed(2)}</Typography>
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
                
                {Math.abs(amountPaid - orderTotal) > 0.01 && amountPaid < orderTotal && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    Amount received is less than total amount
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleProcessPayment}
            disabled={loading || (Math.abs(amountPaid - orderTotal) > 0.01 && amountPaid < orderTotal)}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ minWidth: 150 }}
          >
            {loading ? 'Processing...' : 'Complete Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentButton;
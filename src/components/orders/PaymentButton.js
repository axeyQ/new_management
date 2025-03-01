'use client';
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
  InputAdornment,
  Paper
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const paymentMethods = [
  { id: 'Cash', label: 'Cash', icon: <PaymentIcon /> },
  { id: 'Credit Card', label: 'Credit Card', icon: <CardIcon /> },
  { id: 'Debit Card', label: 'Debit Card', icon: <CardIcon /> },
  { id: 'UPI', label: 'UPI', icon: <PaymentIcon /> },
  { id: 'ZomatoPay', label: 'Zomato Pay', icon: <PaymentIcon /> },
];

const PaymentButton = ({ order, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(order.payment || [
    { method: 'Cash', amount: order?.totalAmount || 0 }
  ]);
  const [change, setChange] = useState(0);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handleOpenDialog = () => {
    // Initialize with existing payment data or default to cash for full amount
    setPaymentMethods(order.payment?.length > 0
      ? [...order.payment]
      : [{ method: 'Cash', amount: order.totalAmount }]
    );
    setPaymentComplete(false);
    setOpenDialog(true);
    calculateChange();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handlePaymentMethodChange = (index, method) => {
    const updatedPayments = [...paymentMethods];
    updatedPayments[index].method = method;
    setPaymentMethods(updatedPayments);
  };

  const handlePaymentAmountChange = (index, amount) => {
    const updatedPayments = [...paymentMethods];
    updatedPayments[index].amount = parseFloat(amount) || 0;
    setPaymentMethods(updatedPayments);
    calculateChange();
  };

  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { method: 'Cash', amount: 0 }]);
  };

  const removePaymentMethod = (index) => {
    const updatedPayments = [...paymentMethods];
    updatedPayments.splice(index, 1);
    setPaymentMethods(updatedPayments);
    calculateChange();
  };

  const calculateChange = () => {
    const totalPaid = paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const changeAmount = totalPaid - order.totalAmount;
    setChange(changeAmount > 0 ? changeAmount : 0);
  };

  const handleProcessPayment = async () => {
    setLoading(true);
    try {
      // Validate payment amount matches order total
      const totalPaid = paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      if (Math.abs(totalPaid - order.totalAmount) > 0.01 && totalPaid < order.totalAmount) {
        toast.error('Payment amount must be at least equal to order total');
        return;
      }

      // Update order with payment information and mark as completed
      const updatedOrderData = {
        payment: paymentMethods,
        orderStatus: 'completed'
      };

      const orderResponse = await axiosWithAuth.put(`/api/orders/${order._id}`, updatedOrderData);
      
      if (orderResponse.data.success) {
        // Generate or update invoice
        const invoiceData = {
          salesOrder: order._id
        };

        // Check if invoice already exists
        try {
          // This endpoint doesn't exist yet, but conceptually it would check for existing invoice
          const invoiceCheckResponse = await axiosWithAuth.get(`/api/orders/invoice?orderId=${order._id}`);
          
          if (invoiceCheckResponse.data.count > 0) {
            // Update existing invoice
            await axiosWithAuth.put(`/api/orders/invoice/${invoiceCheckResponse.data.data[0]._id}`, {
              paymentMethods: paymentMethods,
              isPaid: true,
              paymentDetails: {
                amountPaid: totalPaid,
                changeReturned: change
              }
            });
          } else {
            // Create new invoice
            await axiosWithAuth.post('/api/orders/invoice', invoiceData);
          }
        } catch (error) {
          // If error checking for invoice, just create a new one
          await axiosWithAuth.post('/api/orders/invoice', invoiceData);
        }

        setPaymentComplete(true);
        toast.success('Payment processed successfully');
        if (onSuccess) onSuccess(orderResponse.data.data);
      } else {
        toast.error(orderResponse.data.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    // In a real application, this would print the receipt
    toast.success('Receipt sent to printer');
    handleCloseDialog();
  };

  const isPaymentEnabled = () => {
    // Check if order is in a state where payment can be taken
    return order.orderStatus === 'served' ||
           order.orderStatus === 'ready' ||
           order.orderStatus === 'pending' ||
           order.orderStatus === 'preparing';
  };

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<PaymentIcon />}
        onClick={handleOpenDialog}
        disabled={!isPaymentEnabled() || order.orderStatus === 'completed' || order.orderStatus === 'cancelled'}
      >
        Process Payment
      </Button>

      {/* Payment Dialog */}
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
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {paymentComplete ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Payment Successful!
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total Amount: ₹{order.totalAmount.toFixed(2)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Payment Method(s):
              </Typography>
              {paymentMethods.map((payment, index) => (
                <Typography key={index} variant="body2">
                  {payment.method}: ₹{payment.amount.toFixed(2)}
                </Typography>
              ))}
              {change > 0 && (
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
                  Change to be returned: ₹{change.toFixed(2)}
                </Typography>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={<ReceiptIcon />}
                onClick={printReceipt}
                sx={{ mt: 3 }}
              >
                Print Receipt
              </Button>
            </Box>
          ) : (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Order Details
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Order #:</Typography>
                      <Typography variant="body2">{order.invoiceNumber}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Customer:</Typography>
                      <Typography variant="body2">{order.customer.name}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Items:</Typography>
                      <Typography variant="body2">{order.itemsSold.length} items</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Subtotal:</Typography>
                      <Typography variant="body2">₹{order.subtotalAmount.toFixed(2)}</Typography>
                    </Box>
                    {order.discount && order.discount.discountValue > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Discount:</Typography>
                        <Typography variant="body2" color="error">
                          -₹{order.discount.discountValue.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Tax:</Typography>
                      <Typography variant="body2">₹{order.totalTaxAmount.toFixed(2)}</Typography>
                    </Box>
                    {order.deliveryCharge > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Delivery:</Typography>
                        <Typography variant="body2">₹{order.deliveryCharge.toFixed(2)}</Typography>
                      </Box>
                    )}
                    {order.packagingCharge > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Packaging:</Typography>
                        <Typography variant="body2">₹{order.packagingCharge.toFixed(2)}</Typography>
                      </Box>
                    )}
                    <Box display="flex" justifyContent="space-between" mt={2}>
                      <Typography variant="subtitle2">Total:</Typography>
                      <Typography variant="subtitle2">₹{order.totalAmount.toFixed(2)}</Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Payment Methods
                    </Typography>
                    {paymentMethods.map((payment, index) => (
                      <Box
                        key={index}
                        sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                      >
                        <FormControl sx={{ flexGrow: 1, mr: 1 }}>
                          <InputLabel id={`payment-method-${index}-label`}>Method</InputLabel>
                          <Select
                            labelId={`payment-method-${index}-label`}
                            value={payment.method}
                            onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
                            label="Method"
                            size="small"
                          >
                            {paymentMethods.map((method) => (
                              <MenuItem key={method.id} value={method.id}>
                                {method.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          label="Amount"
                          type="number"
                          size="small"
                          value={payment.amount}
                          onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          sx={{ width: 120 }}
                        />
                        {paymentMethods.length > 1 && (
                          <IconButton
                            color="error"
                            onClick={() => removePaymentMethod(index)}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addPaymentMethod}
                      size="small"
                      sx={{ mb: 3 }}
                    >
                      Add Payment Method
                    </Button>
                    <Divider sx={{ my: 2 }} />
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Total to Pay:</Typography>
                      <Typography variant="body2">₹{order.totalAmount.toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Amount Paid:</Typography>
                      <Typography variant="body2">
                        ₹{paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                      </Typography>
                    </Box>
                    {change > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2">Change:</Typography>
                        <Typography variant="subtitle2" color="success.main">
                          ₹{change.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      onClick={handleProcessPayment}
                      disabled={loading}
                      sx={{ mt: 3 }}
                    >
                      {loading ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentButton;
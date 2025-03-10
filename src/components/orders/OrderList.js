'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Add as AddIcon,
  DateRange as DateRangeIcon,
  FilterList as FilterIcon,
  Pageview as PageviewIcon,
} from '@mui/icons-material';
import OrderForm from './OrderForm';
import KOTButton from './KOTButton';
import StatusUpdateButton from './StatusUpdateButton';
import PaymentButton from './PaymentButton';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';
import axiosWithAuth from '@/lib/axiosWithAuth';

const OrderList = () => {
  const router = useRouter();
  
  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openOrderForm, setOpenOrderForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    mode: '',
    status: '',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch orders on component mount or filter change
  useEffect(() => {
    fetchOrders();
  }, [page, rowsPerPage, filters,refreshKey]);

  const handleNavigateToDetails = (orderId) => {
    router.push(`/dashboard/orders/${orderId}`);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/orders?page=${page + 1}&limit=${rowsPerPage}`;
      
      if (filters.mode) {
        url += `&mode=${filters.mode}`;
      }
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      // if (filters.startDate) {
      //   url += `&startDate=${filters.startDate}`;
      // }
      // if (filters.endDate) {
      //   url += `&endDate=${filters.endDate}`;
      // }
      if (filters.search) {
        url += `&search=${filters.search}`;
      }
      
      console.log('Fetching orders from URL:', url);
      const res = await axiosWithAuth.get(url);
      console.log('Orders API response:', res.data);
      console.log('Raw orders received:', res.data.data);
      
      console.log('Orders API response:', res.data);
      if (res.data.success) {
  console.log('Orders being set:', res.data.data);

        setOrders(res.data.data);
        setTotal(res.data.total);
        
        // Log order types to debug
        if (res.data.data.length > 0) {
          console.log('Order modes in response:', res.data.data.map(o => o.orderMode));
          console.log('Most recent order:', res.data.data[0]);
        } else {
          console.log('No orders returned from API');
        }
      } else {
        toast.error(res.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter handlers
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  // Action handlers
  const handleCancelClick = (order) => {
    setSelectedOrder(order);
    setOpenCancelDialog(true);
  };

  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setOpenViewDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
    setSelectedOrder(null);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedOrder(null);
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setOpenOrderForm(true);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setOpenOrderForm(true);
  };
  const handleFormSuccess = () => {
    // Step 1: Reset all filters that might hide the order
    setFilters({
      mode: '',
      status: '',
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      search: ''
    });
    
    // Step 2: Go to the first page
    setPage(0);
    
    // Step 3: Force a complete refresh of orders
    setRefreshKey(prev => prev + 1);
    
    // Step 4: Close the form
    setOpenOrderForm(false);
    
    // Step 5: Set a delay before fetching orders again (ensures DB has time to update)
    setTimeout(() => {
      fetchOrders();
      console.log('Fetching orders after form success');
    }, 500);
  };
  const handleCancelConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/orders/${selectedOrder._id}`);
      
      if (res.data.success) {
        toast.success('Order cancelled successfully');
        fetchOrders();
      } else {
        toast.error(res.data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error cancelling order');
    } finally {
      handleCloseCancelDialog();
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'preparing':
        return 'info';
      case 'ready':
        return 'secondary';
      case 'served':
        return 'success';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getOrderModeLabel = (mode) => {
    switch (mode) {
      case 'Dine-in':
        return 'Dine-in';
      case 'Takeaway':
        return 'Takeaway';
      case 'Delivery':
        return 'Delivery';
      case 'Direct Order-TableQR':
        return 'QR Order';
      case 'Direct Order-Takeaway':
        return 'Direct Takeaway';
      case 'Direct Order-Delivery':
        return 'Direct Delivery';
      case 'Zomato':
        return 'Zomato';
      default:
        return mode;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Orders</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateOrder}
        >
          New Order
        </Button>
      </Box>

      {/* Filters section */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <TextField
            placeholder="Search by invoice or customer"
            variant="outlined"
            size="small"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            sx={{ width: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          
        </Box>

        {showFilters && (
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="order-mode-label">Order Mode</InputLabel>
                <Select
                  labelId="order-mode-label"
                  name="mode"
                  value={filters.mode}
                  onChange={handleFilterChange}
                  label="Order Mode"
                >
                  <MenuItem value="">All Modes</MenuItem>
                  <MenuItem value="Dine-in">Dine-in</MenuItem>
                  <MenuItem value="Takeaway">Takeaway</MenuItem>
                  <MenuItem value="Delivery">Delivery</MenuItem>
                  <MenuItem value="Direct Order-TableQR">QR Order</MenuItem>
                  <MenuItem value="Direct Order-Takeaway">Direct Takeaway</MenuItem>
                  <MenuItem value="Direct Order-Delivery">Direct Delivery</MenuItem>
                  <MenuItem value="Zomato">Zomato</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="order-status-label">Status</InputLabel>
                <Select
                  labelId="order-status-label"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="served">Served</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Start Date"
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRangeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="End Date"
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRangeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Orders table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No orders found</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order.invoiceNumber}</TableCell>
                  <TableCell>
                    {new Date(order.orderDateTime).toLocaleDateString()}<br />
                    <Typography variant="caption" color="textSecondary">
                      {new Date(order.orderDateTime).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.customer.name}<br />
                    <Typography variant="caption" color="textSecondary">
                      {order.customer.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getOrderModeLabel(order.orderMode)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      color={getStatusColor(order.orderStatus)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {order.itemsSold.length} items
                  </TableCell>
                  <TableCell>
                    ₹{order.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleViewClick(order)}
                      size="small"
                      title="View Order"
                    >
                      <ViewIcon />
                    </IconButton>

                    <IconButton
    color="info"
    onClick={() => handleNavigateToDetails(order._id)}
    size="small"
    title="View Full Details"
  >
    <PageviewIcon />
  </IconButton>
                    
                    {/* Edit button for pending orders */}
                    {order.orderStatus === 'pending' && (
                      <IconButton
                        color="secondary"
                        onClick={() => handleEditOrder(order)}
                        size="small"
                        title="Edit Order"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    
                    {/* Cancel button for pending/preparing orders */}
                    {['pending', 'preparing'].includes(order.orderStatus) && (
                      <IconButton
                        color="error"
                        onClick={() => handleCancelClick(order)}
                        size="small"
                        title="Cancel Order"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                    
                    {/* Invoice button */}
                    {order.orderStatus === 'completed' && (
                      <IconButton
                        color="info"
                        size="small"
                        title="View Invoice"
                      >
                        <ReceiptIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog
        open={openCancelDialog}
        onClose={handleCloseCancelDialog}
      >
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel order #{selectedOrder?.invoiceNumber}? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} color="primary">
            No, Keep It
          </Button>
          <Button onClick={handleCancelConfirm} color="error">
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Order Details - {selectedOrder?.invoiceNumber}
          <IconButton
            onClick={handleCloseViewDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CancelIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Customer Information</Typography>
                  <Typography variant="body2">Name: {selectedOrder.customer.name}</Typography>
                  <Typography variant="body2">Phone: {selectedOrder.customer.phone}</Typography>
                  {selectedOrder.orderMode === 'Dine-in' && selectedOrder.table && (
                    <Typography variant="body2">Table: {selectedOrder.table.tableName}</Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Order Information</Typography>
                  <Typography variant="body2">
                    Date: {new Date(selectedOrder.orderDateTime).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Time: {new Date(selectedOrder.orderDateTime).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">
                    Status:
                    <Chip
                      label={selectedOrder.orderStatus.charAt(0).toUpperCase() +
                        selectedOrder.orderStatus.slice(1)}
                      color={getStatusColor(selectedOrder.orderStatus)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body2">
                    Type: {getOrderModeLabel(selectedOrder.orderMode)}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" gutterBottom>Order Items</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Variant</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.itemsSold.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.dish ? (item.dish.dishName || item.dishName) : 
                          (item.dishName || 'Unknown Dish')}</TableCell>
                        <TableCell>{item.variant ? (item.variant.variantName || '-') : '-'}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box mt={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Payment Information</Typography>
                    {selectedOrder.payment && selectedOrder.payment.map((payment, index) => (
                      <Typography key={index} variant="body2">
                        {payment.method}: ₹{payment.amount.toFixed(2)}
                      </Typography>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" flexDirection="column" alignItems="flex-end">
                      <Typography variant="body2">
                        Subtotal: ₹{selectedOrder.subtotalAmount?.toFixed(2)}
                      </Typography>
                      {selectedOrder.discount && selectedOrder.discount.discountValue > 0 && (
                        <Typography variant="body2">
                          Discount: -₹{selectedOrder.discount.discountValue.toFixed(2)}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        Tax: ₹{selectedOrder.totalTaxAmount?.toFixed(2)}
                      </Typography>
                      {selectedOrder.deliveryCharge > 0 && (
                        <Typography variant="body2">
                          Delivery: ₹{selectedOrder.deliveryCharge.toFixed(2)}
                        </Typography>
                      )}
                      {selectedOrder.packagingCharge > 0 && (
                        <Typography variant="body2">
                          Packaging: ₹{selectedOrder.packagingCharge.toFixed(2)}
                        </Typography>
                      )}
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                        Total: ₹{selectedOrder.totalAmount.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog} color="primary">
            Close
          </Button>
          {selectedOrder && (
            <>
              {/* Edit Order - only for pending orders */}
              {selectedOrder.orderStatus === 'pending' && (
                <Button
                  color="secondary"
                  onClick={() => {
                    handleCloseViewDialog();
                    handleEditOrder(selectedOrder);
                  }}
                >
                  Edit Order
                </Button>
              )}
              
              {/* KOT Button - for pending orders that need to be sent to kitchen */}
              {selectedOrder.orderStatus === 'pending' && (
                <KOTButton
                  order={selectedOrder}
                  onSuccess={() => {
                    fetchOrders();
                    handleCloseViewDialog();
                  }}
                />
              )}
              
              {/* Status Update Button - for moving orders through the workflow */}
              {!['completed', 'cancelled'].includes(selectedOrder.orderStatus) && (
                <StatusUpdateButton
                  order={selectedOrder}
                  onSuccess={() => {
                    fetchOrders();
                    handleCloseViewDialog();
                  }}
                />
              )}
              
              {/* Payment Button - for orders that are ready to be paid */}
              {['served', 'ready'].includes(selectedOrder.orderStatus) && (
                <PaymentButton
                  order={selectedOrder}
                  onSuccess={() => {
                    fetchOrders();
                    handleCloseViewDialog();
                  }}
                />
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Order Form Dialog */}
      <Dialog
        open={openOrderForm}
        onClose={() => setOpenOrderForm(false)}
        maxWidth="xl"
        fullWidth
        key={`order-form-dialog-${refreshKey}`} // Add this key to force re-render
      >
        <DialogContent>
          <OrderForm 
            orderId={selectedOrder?._id} 
              onSuccess={handleFormSuccess}
            onCancel={() => setOpenOrderForm(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OrderList;
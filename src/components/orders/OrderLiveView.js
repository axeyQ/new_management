// src/components/orders/OrderLiveView.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  Alert,
  CircularProgress,
  InputAdornment,
  Stack
} from '@mui/material';

import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Restaurant as RestaurantIcon,
  LocalShipping as DeliveryIcon,
  TakeoutDining as TakeoutIcon,
  LocalDining as ZomatoIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';
import KOTButton from './KOTButton';
import StatusUpdateButton from './StatusUpdateButton';
import { format, formatDistance } from 'date-fns';

// Order mode icons
const orderModeIcons = {
  'Dine-in': <RestaurantIcon />,
  'Takeaway': <TakeoutIcon />,
  'Delivery': <DeliveryIcon />,
  'Direct Order-TableQR': <RestaurantIcon />,
  'Direct Order-Takeaway': <TakeoutIcon />,
  'Direct Order-Delivery': <DeliveryIcon />,
  'Zomato': <ZomatoIcon />
};

// Status colors
const statusColors = {
  'pending': 'warning',
  'preparing': 'info',
  'ready': 'secondary',
  'served': 'success',
  'completed': 'success',
  'cancelled': 'error',
  'out-for-delivery': 'primary',
  'scheduled': 'default'
};

// Format order modes
const formatOrderMode = (mode) => {
  switch (mode) {
    case 'Dine-in': return 'Dine-in';
    case 'Takeaway': return 'Takeaway';
    case 'Delivery': return 'Delivery';
    case 'Direct Order-TableQR': return 'QR Order';
    case 'Direct Order-Takeaway': return 'Direct Takeaway';
    case 'Direct Order-Delivery': return 'Direct Delivery';
    case 'Zomato': return 'Zomato';
    default: return mode;
  }
};

const OrderLiveView = () => {
  // State for orders and loading
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  
  // State for filters
  const [filters, setFilters] = useState({
    mode: '',
    status: '',
    searchTerm: '',
    // Only show active orders by default (not completed or cancelled)
    onlyActive: true
  });
  
  // Effect for auto-refresh
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchOrders(true);
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, filters]);
  
  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [filters]);
  
  // Fetch orders function
  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!refreshing) {
      setLoading(true);
    }
    
    try {
      // Build query parameters
      let queryParams = new URLSearchParams();
      
      if (filters.mode) {
        queryParams.append('mode', filters.mode);
      }
      
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      
      // Add search term if provided
      if (filters.searchTerm) {
        queryParams.append('search', filters.searchTerm);
      }
      
      // If only active is true, exclude completed and cancelled orders
      // We'll filter these out in the frontend since the API might not support this filter directly
      
      // Make API request
      const response = await axiosWithAuth.get(`/api/orders?${queryParams.toString()}`);
      
      if (response.data.success) {
        let filteredOrders = response.data.data;
        
        // Filter out completed and cancelled orders if onlyActive is true
        if (filters.onlyActive) {
          filteredOrders = filteredOrders.filter(
            order => !['completed', 'cancelled'].includes(order.orderStatus)
          );
        }
        
        // Sort orders by datetime
        filteredOrders.sort((a, b) => 
          new Date(b.orderDateTime) - new Date(a.orderDateTime)
        );
        
        setOrders(filteredOrders);
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle order click
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setOpenOrderDialog(true);
  };
  
  // Close order dialog
  const handleCloseOrderDialog = () => {
    setOpenOrderDialog(false);
  };
  
  // After status update or other actions
  const handleOrderUpdated = () => {
    fetchOrders();
    if (openOrderDialog) {
      handleCloseOrderDialog();
    }
  };
  
  // Get time elapsed since order was placed
  const getTimeElapsed = (orderDateTime) => {
    try {
      return formatDistance(new Date(orderDateTime), new Date(), { addSuffix: false });
    } catch (error) {
      return 'Unknown';
    }
  };
  
  // Filter controls section
  const renderFilterControls = () => (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            placeholder="Search by invoice or customer"
            size="small"
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Order Type</InputLabel>
            <Select
              value={filters.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
              label="Order Type"
            >
              <MenuItem value="">All Types</MenuItem>
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
        
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="served">Served</MenuItem>
              <MenuItem value="out-for-delivery">Out for Delivery</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Show</InputLabel>
            <Select
              value={filters.onlyActive}
              onChange={(e) => handleFilterChange('onlyActive', e.target.value)}
              label="Show"
            >
              <MenuItem value={true}>Active Orders</MenuItem>
              <MenuItem value={false}>All Orders</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={1}>
          <Tooltip title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}>
            <Button
              variant={autoRefresh ? "contained" : "outlined"}
              color="primary"
              fullWidth
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{ height: 40 }}
            >
              <RefreshIcon />
            </Button>
          </Tooltip>
        </Grid>
      </Grid>
    </Paper>
  );
  
  // Render order cards
  const renderOrderCards = () => {
    if (loading && !refreshing) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      );
    }
    
    if (orders.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 3 }}>
          No orders found matching your criteria.
        </Alert>
      );
    }
    
    return (
      <Grid container spacing={2}>
        {orders.map((order) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={order._id}>
            <Card 
              variant="outlined" 
              sx={{ 
                position: 'relative',
                borderLeft: `5px solid ${statusColors[order.orderStatus] ? 
                  `${statusColors[order.orderStatus]}.main` : 'grey.300'}`,
                '&:hover': {
                  boxShadow: 3,
                  cursor: 'pointer'
                }
              }}
              onClick={() => handleOrderClick(order)}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  right: 0, 
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Chip
                  size="small"
                  icon={<TimeIcon fontSize="small" />}
                  label={getTimeElapsed(order.orderDateTime)}
                  color={
                    getTimeElapsed(order.orderDateTime).includes('hour') ? 'error' : 
                    getTimeElapsed(order.orderDateTime).includes('min') && 
                    parseInt(getTimeElapsed(order.orderDateTime)) > 20 ? 'warning' : 
                    'default'
                  }
                />
              </Box>
              
              <CardContent sx={{ pt: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" component="div" noWrap>
                    #{order.invoiceNumber.split('-').pop()}
                  </Typography>
                  <Tooltip title={formatOrderMode(order.orderMode)}>
                    <Box>{orderModeIcons[order.orderMode]}</Box>
                  </Tooltip>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  {order.customer?.name || 'Unknown customer'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {order.customer?.phone || ''}
                </Typography>
                
                {order.table && (
                  <Typography variant="body2" color="text.secondary">
                    Table: {order.table.tableName || (typeof order.table === 'string' ? order.table : '')}
                  </Typography>
                )}
                
                <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    label={order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)} 
                    color={statusColors[order.orderStatus]}
                    size="small"
                  />
                  <Typography variant="subtitle1" fontWeight="bold">
                    ₹{order.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {order.itemsSold?.length || 0} items
                </Typography>
                
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {format(new Date(order.orderDateTime), 'MMM d, h:mm a')}
                </Typography>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                <Tooltip title="View Details">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleOrderClick(order);
                  }}>
                    <ViewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                {['pending', 'preparing'].includes(order.orderStatus) && (
                  <Tooltip title="Print KOT">
                    <IconButton 
                      size="small" 
                      color="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        // We'll implement KOT printing action
                      }}
                    >
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  // Order detail dialog
  const renderOrderDetailDialog = () => {
    if (!selectedOrder) return null;
    
    return (
      <Dialog
        open={openOrderDialog}
        onClose={handleCloseOrderDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Order #{selectedOrder.invoiceNumber}
          <IconButton
            aria-label="close"
            onClick={handleCloseOrderDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Order Information
              </Typography>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Order Type:</Typography>
                <Chip 
                  icon={orderModeIcons[selectedOrder.orderMode]} 
                  label={formatOrderMode(selectedOrder.orderMode)}
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Status:</Typography>
                <Chip 
                  label={selectedOrder.orderStatus.charAt(0).toUpperCase() + selectedOrder.orderStatus.slice(1)}
                  color={statusColors[selectedOrder.orderStatus]}
                  size="small"
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Date & Time:</Typography>
                <Typography variant="body2">
                  {format(new Date(selectedOrder.orderDateTime), 'PPpp')}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Time Elapsed:</Typography>
                <Typography variant="body2">
                  {getTimeElapsed(selectedOrder.orderDateTime)}
                </Typography>
              </Box>
              
              {selectedOrder.table && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Table:</Typography>
                  <Typography variant="body2">
                    {selectedOrder.table.tableName || (typeof selectedOrder.table === 'string' ? selectedOrder.table : '')}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Customer Information
              </Typography>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Name:</Typography>
                <Typography variant="body2">{selectedOrder.customer?.name || 'Unknown'}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Phone:</Typography>
                <Typography variant="body2">{selectedOrder.customer?.phone || 'N/A'}</Typography>
              </Box>
              
              {selectedOrder.customer?.email && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Email:</Typography>
                  <Typography variant="body2">{selectedOrder.customer.email}</Typography>
                </Box>
              )}
              
              {selectedOrder.customer?.address && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Address:</Typography>
                  <Typography variant="body2">{selectedOrder.customer.address}</Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Order Items
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 1 }}>
                {selectedOrder.itemsSold?.map((item, index) => (
                  <Box key={index} sx={{ mb: 1, pb: 1, borderBottom: index < selectedOrder.itemsSold.length - 1 ? '1px solid #eee' : 'none' }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        {item.dishName}
                        {item.variantName && <Typography component="span" variant="caption" color="text.secondary"> ({item.variantName})</Typography>}
                      </Typography>
                      <Typography variant="body2">{item.quantity} × ₹{item.price.toFixed(2)}</Typography>
                    </Box>
                    
                    {item.addOns && item.addOns.length > 0 && (
                      <Box ml={2}>
                        {item.addOns.map((addon, addonIndex) => (
                          <Typography key={addonIndex} variant="caption" color="text.secondary" display="block">
                            + {addon.name}: ₹{addon.price.toFixed(2)}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    
                    {item.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Note: {item.notes}
                      </Typography>
                    )}
                  </Box>
                ))}
                
                <Divider sx={{ my: 1 }} />
                
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">₹{selectedOrder.subtotalAmount.toFixed(2)}</Typography>
                </Box>
                
                {selectedOrder.taxDetails?.map((tax, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">{tax.taxName} ({tax.taxRate}%):</Typography>
                    <Typography variant="caption" color="text.secondary">₹{tax.taxAmount.toFixed(2)}</Typography>
                  </Box>
                ))}
                
                {selectedOrder.discount && selectedOrder.discount.discountValue > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Discount:</Typography>
                    <Typography variant="body2" color="error.main">-₹{selectedOrder.discount.discountValue.toFixed(2)}</Typography>
                  </Box>
                )}
                
                {selectedOrder.deliveryCharge > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Delivery Charge:</Typography>
                    <Typography variant="body2">₹{selectedOrder.deliveryCharge.toFixed(2)}</Typography>
                  </Box>
                )}
                
                {selectedOrder.packagingCharge > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Packaging:</Typography>
                    <Typography variant="body2">₹{selectedOrder.packagingCharge.toFixed(2)}</Typography>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="subtitle2">Total:</Typography>
                  <Typography variant="subtitle2">₹{selectedOrder.totalAmount.toFixed(2)}</Typography>
                </Box>
              </Paper>
              
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Actions
                </Typography>
                
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <KOTButton 
                    order={selectedOrder} 
                    onSuccess={handleOrderUpdated}
                  />
                  
                  <StatusUpdateButton 
                    order={selectedOrder}
                    onSuccess={handleOrderUpdated}
                  />
                </Stack>
                
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  fullWidth
                  sx={{ mt: 1 }}
                  disabled={selectedOrder.orderStatus !== 'completed'}
                >
                  Print Invoice
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Live Orders</Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => fetchOrders()}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Now'}
        </Button>
      </Box>
      
      {renderFilterControls()}
      
      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Typography variant="caption" color="text.secondary">
            Auto-refreshing every 30 seconds
            {refreshing && <CircularProgress size={10} sx={{ ml: 1 }} />}
          </Typography>
        </Box>
      )}
      
      {renderOrderCards()}
      {renderOrderDetailDialog()}
    </Box>
  );
};

export default OrderLiveView;
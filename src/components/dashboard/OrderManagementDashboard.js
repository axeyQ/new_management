// src/components/dashboard/OrderManagementDashboard.js
'use client';
import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Divider, Chip, Card, CardContent,
  CardHeader, Button, CircularProgress, Badge, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Kitchen as KitchenIcon,
  CheckCircle as ReadyIcon,
  LocalDining as ServedIcon,
  Receipt as PaymentIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const OrderManagementDashboard = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [kots, setKots] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch all active data on component mount and when refresh is triggered
  useEffect(() => {
    fetchAllData();
    
    // Set up polling for automatic refresh
    const intervalId = setInterval(() => {
      fetchAllData(false); // Silent refresh
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  const fetchAllData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      // Fetch tables
      const tablesResponse = await axiosWithAuth.get('/api/tables');
      if (tablesResponse.data.success) {
        setTables(tablesResponse.data.data);
      }
      
      // Fetch all active orders (pending, preparing, ready, served)
      const ordersResponse = await axiosWithAuth.get(
        '/api/orders?status=pending,preparing,ready,served'
      );
      if (ordersResponse.data.success) {
        setOrders(ordersResponse.data.data);
      }
      
      // Fetch all active KOTs
      const kotsResponse = await axiosWithAuth.get(
        '/api/orders/kot?status=pending,preparing,ready,served'
      );
      if (kotsResponse.data.success) {
        setKots(kotsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Helper functions for filtering and counting
  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.orderStatus === status);
  };
  
  const getKotsByStatus = (status) => {
    return kots.filter(kot => kot.kotStatus === status);
  };
  
  const getKotsForOrder = (orderId) => {
    return kots.filter(kot => {
      const kotOrderId = typeof kot.salesOrder === 'string' ? 
        kot.salesOrder : kot.salesOrder?._id;
      return kotOrderId === orderId;
    });
  };
  
  const getTableById = (tableId) => {
    if (!tableId) return null;
    return tables.find(table => table._id === tableId);
  };
  
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pending" color="default" size="small" />;
      case 'preparing':
        return <Chip label="Preparing" color="warning" size="small" />;
      case 'ready':
        return <Chip label="Ready" color="info" size="small" />;
      case 'served':
        return <Chip label="Served" color="success" size="small" />;
      case 'completed':
        return <Chip label="Completed" color="primary" size="small" />;
      case 'cancelled':
        return <Chip label="Cancelled" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h ago`;
  };
  
  // Handle actions
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };
  
  const handleEditOrder = (order) => {
    // Get the table name if this is a dine-in order
    let tableName = '';
    if (order.orderMode === 'Dine-in' && order.table) {
      const tableId = typeof order.table === 'string' ? order.table : order.table._id;
      const table = getTableById(tableId);
      if (table) tableName = table.tableName;
    }
    
    // Navigate to sales register with the order details
    if (order.orderMode === 'Dine-in' && order.table) {
      const tableId = typeof order.table === 'string' ? order.table : order.table._id;
      router.push(`/salesregister?tableId=${encodeURIComponent(tableId)}&mode=${encodeURIComponent(order.orderMode)}&tableName=Table+${encodeURIComponent(tableName)}&orderId=${encodeURIComponent(order._id)}`);
    } else {
      router.push(`/salesregister?mode=${encodeURIComponent(order.orderMode)}&orderId=${encodeURIComponent(order._id)}`);
    }
  };
  
  const handlePrintKot = async (kotId) => {
    try {
      const response = await axiosWithAuth.put(`/api/orders/kot/${kotId}`, {
        printed: true,
        printerId: 'main-kitchen'
      });
      
      if (response.data.success) {
        // Open print view in new window
        window.open(`/print/kot/${kotId}`, '_blank');
        toast.success('KOT sent to printer');
        // Refresh data
        fetchAllData();
      } else {
        toast.error('Failed to print KOT');
      }
    } catch (error) {
      console.error('Error printing KOT:', error);
      toast.error('Error printing KOT');
    }
  };
  
  const handleUpdateKotStatus = async (kotId, newStatus) => {
    try {
      const response = await axiosWithAuth.put(`/api/orders/kot/${kotId}`, {
        kotStatus: newStatus
      });
      
      if (response.data.success) {
        toast.success(`KOT status updated to ${newStatus}`);
        // Refresh data
        fetchAllData();
      } else {
        toast.error('Failed to update KOT status');
      }
    } catch (error) {
      console.error('Error updating KOT status:', error);
      toast.error('Error updating KOT status');
    }
  };
  
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axiosWithAuth.put(`/api/orders/${orderId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        // Refresh data
        fetchAllData();
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error updating order status');
    }
  };
  
  if (loading && orders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading dashboard data...</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Order Management Dashboard</Typography>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>
      
      {/* Status Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Badge badgeContent={getOrdersByStatus('pending').length} color="default">
                  <RestaurantIcon sx={{ mr: 1 }} />
                  Pending Orders
                </Badge>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orders waiting to be processed
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h4">{getOrdersByStatus('pending').length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Badge badgeContent={getOrdersByStatus('preparing').length} color="warning">
                  <KitchenIcon sx={{ mr: 1 }} />
                  In Kitchen
                </Badge>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orders being prepared
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h4">{getOrdersByStatus('preparing').length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Badge badgeContent={getOrdersByStatus('ready').length} color="info">
                  <ReadyIcon sx={{ mr: 1 }} />
                  Ready to Serve
                </Badge>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Food ready for service
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h4">{getOrdersByStatus('ready').length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Badge badgeContent={getOrdersByStatus('served').length} color="success">
                  <ServedIcon sx={{ mr: 1 }} />
                  Served
                </Badge>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Waiting for payment
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h4">{getOrdersByStatus('served').length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Active Orders Table */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Active Orders</Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Table/Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>KOTs</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.filter(order => 
                ['pending', 'preparing', 'ready', 'served'].includes(order.orderStatus)
              ).map(order => {
                const orderKots = getKotsForOrder(order._id);
                const tableName = order.table ? 
                  (typeof order.table === 'object' ? order.table.tableName : 
                  getTableById(order.table)?.tableName || 'Unknown') : 'N/A';
                
                return (
                  <TableRow key={order._id} hover>
                    <TableCell>{order.invoiceNumber}</TableCell>
                    <TableCell>{order.orderMode}</TableCell>
                    <TableCell>
                      {order.orderMode === 'Dine-in' ? 
                        `Table ${tableName}` : 
                        `${order.customer?.name || 'Guest'}`}
                    </TableCell>
                    <TableCell>{order.itemsSold?.length || 0}</TableCell>
                    <TableCell>{getStatusChip(order.orderStatus)}</TableCell>
                    <TableCell>{formatTimeAgo(order.orderDateTime)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${orderKots.length} KOT${orderKots.length !== 1 ? 's' : ''}`}
                        size="small"
                        color={orderKots.length > 0 ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell>₹{order.totalAmount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewOrder(order)}>
                          <RestaurantIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Order">
                        <IconButton size="small" onClick={() => handleEditOrder(order)}>
                          <KitchenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {order.orderStatus === 'ready' && (
                        <Tooltip title="Mark as Served">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleUpdateOrderStatus(order._id, 'served')}
                          >
                            <ServedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {order.orderStatus === 'served' && (
                        <Tooltip title="Process Payment">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditOrder(order)}
                          >
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {orders.filter(order => 
          ['pending', 'preparing', 'ready', 'served'].includes(order.orderStatus)
        ).length === 0 && (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body1">No active orders</Typography>
          </Box>
        )}
      </Paper>
      
      {/* Active KOTs Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Kitchen Orders</Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>KOT #</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Table/Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Printed</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kots.filter(kot => 
                ['pending', 'preparing', 'ready'].includes(kot.kotStatus)
              ).map(kot => {
                const kotOrderId = typeof kot.salesOrder === 'string' ? 
                  kot.salesOrder : kot.salesOrder?._id;
                
                const relatedOrder = orders.find(order => order._id === kotOrderId);
                const tableName = kot.table ? 
                  (typeof kot.table === 'object' ? kot.table.tableName : 
                  getTableById(kot.table)?.tableName || 'Unknown') : 'N/A';
                
                return (
                  <TableRow key={kot._id} hover>
                    <TableCell>{kot.kotTokenNum}</TableCell>
                    <TableCell>{kot.invoiceNum}</TableCell>
                    <TableCell>{kot.orderMode}</TableCell>
                    <TableCell>
                      {kot.orderMode === 'Dine-in' ? 
                        `Table ${tableName}` : 
                        `${kot.customer?.name || 'Guest'}`}
                    </TableCell>
                    <TableCell>{kot.items?.length || 0}</TableCell>
                    <TableCell>{getStatusChip(kot.kotStatus)}</TableCell>
                    <TableCell>{formatTimeAgo(kot.createdAt)}</TableCell>
                    <TableCell>
                      {kot.printed ? (
                        <Chip label="Printed" color="success" size="small" />
                      ) : (
                        <Chip label="Not Printed" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!kot.printed && (
                        <Tooltip title="Print KOT">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handlePrintKot(kot._id)}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {kot.kotStatus === 'pending' && (
                        <Tooltip title="Mark as Preparing">
                          <IconButton 
                            size="small" 
                            color="warning"
                            onClick={() => handleUpdateKotStatus(kot._id, 'preparing')}
                          >
                            <KitchenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {kot.kotStatus === 'preparing' && (
                        <Tooltip title="Mark as Ready">
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleUpdateKotStatus(kot._id, 'ready')}
                          >
                            <ReadyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {kot.kotStatus === 'ready' && relatedOrder && (
                        <Tooltip title="Mark as Completed">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleUpdateKotStatus(kot._id, 'completed')}
                          >
                            <ServedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {kots.filter(kot => 
          ['pending', 'preparing', 'ready'].includes(kot.kotStatus)
        ).length === 0 && (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body1">No active kitchen orders</Typography>
          </Box>
        )}
      </Paper>
      
      {/* Order Details Dialog */}
      <Dialog 
        open={orderDetailsOpen} 
        onClose={() => setOrderDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              Order Details: {selectedOrder.invoiceNumber}
              <IconButton
                onClick={() => setOrderDetailsOpen(false)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <RefreshIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">Order Information</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography><strong>Mode:</strong> {selectedOrder.orderMode}</Typography>
                    <Typography><strong>Status:</strong> {selectedOrder.orderStatus}</Typography>
                    <Typography><strong>Date:</strong> {formatDateTime(selectedOrder.orderDateTime)}</Typography>
                    <Typography><strong>Invoice:</strong> {selectedOrder.invoiceNumber}</Typography>
                    <Typography><strong>Reference:</strong> {selectedOrder.refNum}</Typography>
                    {selectedOrder.orderMode === 'Dine-in' && selectedOrder.table && (
                      <Typography>
                        <strong>Table:</strong> {
                          typeof selectedOrder.table === 'object' 
                            ? selectedOrder.table.tableName 
                            : getTableById(selectedOrder.table)?.tableName || 'Unknown'
                        }
                      </Typography>
                    )}
                    <Typography><strong>Guests:</strong> {selectedOrder.numOfPeople || 'N/A'}</Typography>
                  </Box>
                  
                  <Typography variant="h6" sx={{ mt: 3 }}>Customer</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography><strong>Name:</strong> {selectedOrder.customer?.name || 'N/A'}</Typography>
                    <Typography><strong>Phone:</strong> {selectedOrder.customer?.phone || 'N/A'}</Typography>
                    {selectedOrder.customer?.email && (
                      <Typography><strong>Email:</strong> {selectedOrder.customer.email}</Typography>
                    )}
                    {selectedOrder.customer?.address && (
                      <Typography><strong>Address:</strong> {selectedOrder.customer.address}</Typography>
                    )}
                  </Box>
                  
                  <Typography variant="h6" sx={{ mt: 3 }}>Financials</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography><strong>Subtotal:</strong> ₹{selectedOrder.subtotalAmount?.toFixed(2) || '0.00'}</Typography>
                    <Typography><strong>Tax:</strong> ₹{selectedOrder.totalTaxAmount?.toFixed(2) || '0.00'}</Typography>
                    {(selectedOrder.discount?.discountValue || 0) > 0 && (
                      <Typography><strong>Discount:</strong> ₹{selectedOrder.discount.discountValue.toFixed(2)}</Typography>
                    )}
                    {(selectedOrder.deliveryCharge || 0) > 0 && (
                      <Typography><strong>Delivery:</strong> ₹{selectedOrder.deliveryCharge.toFixed(2)}</Typography>
                    )}
                    {(selectedOrder.packagingCharge || 0) > 0 && (
                      <Typography><strong>Packaging:</strong> ₹{selectedOrder.packagingCharge.toFixed(2)}</Typography>
                    )}
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      <strong>Total:</strong> ₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">Order Items</Typography>
                  <TableContainer sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Variant</TableCell>
                          <TableCell align="center">Qty</TableCell>
                          <TableCell align="right">Price</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.itemsSold?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.dishName}</TableCell>
                            <TableCell>{item.variantName || '-'}</TableCell>
                            <TableCell align="center">{item.quantity}</TableCell>
                            <TableCell align="right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Typography variant="h6" sx={{ mt: 3 }}>KOT Status</Typography>
                  {getKotsForOrder(selectedOrder._id).length > 0 ? (
                    <TableContainer sx={{ mt: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>KOT #</TableCell>
                            <TableCell>Items</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Printed</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getKotsForOrder(selectedOrder._id).map((kot) => (
                            <TableRow key={kot._id}>
                              <TableCell>{kot.kotTokenNum}</TableCell>
                              <TableCell>{kot.items?.length || 0}</TableCell>
                              <TableCell>{getStatusChip(kot.kotStatus)}</TableCell>
                              <TableCell>{formatTimeAgo(kot.createdAt)}</TableCell>
                              <TableCell>
                                {kot.printed ? (
                                  <Chip label="Yes" color="success" size="small" />
                                ) : (
                                  <Chip label="No" color="error" size="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="body1">No KOTs found for this order</Typography>
                    </Box>
                  )}
                  
                  {selectedOrder.payment && selectedOrder.payment.length > 0 && (
                    <>
                      <Typography variant="h6" sx={{ mt: 3 }}>Payment</Typography>
                      <TableContainer sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Method</TableCell>
                              <TableCell align="right">Amount</TableCell>
                              <TableCell>Transaction ID</TableCell>
                              <TableCell>Date</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedOrder.payment.map((payment, index) => (
                              <TableRow key={index}>
                                <TableCell>{payment.method}</TableCell>
                                <TableCell align="right">₹{payment.amount?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>{payment.transactionId || '-'}</TableCell>
                                <TableCell>{formatDateTime(payment.paymentDate)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOrderDetailsOpen(false)}>Close</Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => {
                  setOrderDetailsOpen(false);
                  handleEditOrder(selectedOrder);
                }}
              >
                Edit Order
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default OrderManagementDashboard;
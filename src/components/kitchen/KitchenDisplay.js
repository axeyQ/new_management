'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Tabs,
  Tab,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import OrderCard from './OrderCard';
import axiosWithAuth from '@/lib/axiosWithAuth';
import NotificationManager from './NotificationManager';
import toast from 'react-hot-toast';
import { ORDER_TYPES, getOrderTypeDetails, getStatusColor, getOrderTypeEmoji } from '@/config/orderTypes';
import { useSocket } from '@/lib/socketClient';

const KitchenDisplay = () => {
  const [kotOrders, setKotOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderType, setSelectedOrderType] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);

  // Fetch KOT orders from the API
  const fetchKotOrders = async () => {
    setRefreshing(true);
    try {
      const statuses = ['pending', 'preparing']; 
      const res = await axiosWithAuth.get(`/api/orders/kot?status=${statuses.join(',')}`);
      
      if (res.data.success) {
        // Sort orders by status and creation time
        const sortedOrders = res.data.data.sort((a, b) => {
          // First sort by status priority (pending first, then preparing)
          const statusPriority = { 'pending': 0, 'preparing': 1 };
          const statusDiff = statusPriority[a.kotStatus] - statusPriority[b.kotStatus];
          
          if (statusDiff !== 0) return statusDiff;
          
          // Then by creation time (newest first)
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        setKotOrders(sortedOrders);
        setError(null);
      } else {
        toast.error(res.data.message || 'Failed to fetch orders');
        setError('Failed to load orders. Please try refreshing.');
      }
    } catch (error) {
      console.error('Error fetching KOT orders:', error);
      toast.error('Error loading orders');
      setError('Error connecting to the server. Please check your connection.');
    } finally {
      setRefreshing(false);
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  // Initial fetch and setup polling as fallback for WebSocket
  useEffect(() => {
    fetchKotOrders();
    
    // Set up polling for updates every 30 seconds as a fallback
    const intervalId = setInterval(fetchKotOrders, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle order type tab change
  const handleOrderTypeChange = (event, newValue) => {
    setSelectedOrderType(newValue);
  };

  // Filter orders by selected order type
  const filteredOrders = useMemo(() => {
    return selectedOrderType === 'all'
      ? kotOrders
      : kotOrders.filter(order => order.orderMode === selectedOrderType);
  }, [kotOrders, selectedOrderType]);

  // Count orders by type for tab badges
  const orderTypeCounts = useMemo(() => {
    return ORDER_TYPES.reduce((counts, type) => {
      counts[type.id] = type.id === 'all' 
        ? kotOrders.length
        : kotOrders.filter(order => order.orderMode === type.id).length;
      return counts;
    }, {});
  }, [kotOrders]);

  // Handle order status update
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await axiosWithAuth.put(`/api/orders/kot/${orderId}`, {
        kotStatus: newStatus
      });
      
      if (res.data.success) {
        // Update the order in local state
        setKotOrders(prev =>
          prev.map(order =>
            order._id === orderId
              ? { ...order, kotStatus: newStatus }
              : order
          )
        );
        
        toast.success(`Order status updated to ${newStatus}`);
        
        // Refresh the list if order is completed or ready
        if (newStatus === 'completed' || newStatus === 'cancelled') {
          setTimeout(fetchKotOrders, 2000);
        }
      } else {
        toast.error(res.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error updating order status');
    }
  };

  // Handle reconnection request
  const handleReconnect = () => {
    toast.info('Refreshing orders...');
    fetchKotOrders();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kitchen Display System
          </Typography>
          
          {/* Connection status */}
          <Chip
            label={isConnected ? 'Connected 🟢' : 'Offline 🔴'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
            size="small"
            onClick={isConnected ? null : handleReconnect}
            sx={{ mr: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            Updated: {lastRefreshed.toLocaleTimeString()}
          </Typography>
          
          {/* Notification Manager */}
          <NotificationManager />
          
          <IconButton
            color="primary"
            onClick={fetchKotOrders}
            disabled={refreshing}
            aria-label="refresh orders"
          >
            {refreshing ? <CircularProgress size={24} /> : <span style={{ fontSize: '20px' }}>🔄</span>}
          </IconButton>
        </Toolbar>
        
        {/* Order Type Tabs */}
        <Tabs
          value={selectedOrderType}
          onChange={handleOrderTypeChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="order types"
          sx={{ bgcolor: '#fff' }}
        >
          {ORDER_TYPES.map((type) => {
            const count = orderTypeCounts[type.id] || 0;
            
            return (
              <Tab
                key={type.id}
                value={type.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '6px', fontSize: '18px' }}>{type.emoji}</span>
                    {type.label}
                    <Badge
                      badgeContent={count}
                      color={type.color}
                      max={99}
                      showZero={false}
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                sx={{ minHeight: 48, py: 1.5 }}
              />
            );
          })}
        </Tabs>
      </AppBar>
      
      {/* Connection Alert */}
      {!isConnected && (
        <Alert 
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={handleReconnect}>
              Refresh Now
            </Button>
          }
        >
          Live updates unavailable. Using manual refresh mode.
        </Alert>
      )}
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : filteredOrders.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="80%">
            <Typography align="center" color="text.secondary">
              No active orders for {selectedOrderType === 'all' ? 'any type' : getOrderTypeDetails(selectedOrderType).label}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredOrders.map((order) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={order._id}>
                <OrderCard
                  order={order}
                  onStatusUpdate={handleOrderStatusUpdate}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default KitchenDisplay;
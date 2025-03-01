'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OrderCard from './OrderCard';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

// Order modes from the SalesOrder model
const ORDER_MODES = [
  { id: 'all', label: 'All Orders' },
  { id: 'Dine-in', label: 'Dine-in' },
  { id: 'Takeaway', label: 'Takeaway' },
  { id: 'Delivery', label: 'Delivery' },
  { id: 'Direct Order-TableQR', label: 'QR Order' },
  { id: 'Direct Order-Takeaway', label: 'Direct Takeaway' },
  { id: 'Direct Order-Delivery', label: 'Direct Delivery' },
  { id: 'Zomato', label: 'Zomato' }
];

const KitchenDisplay = () => {
  const [kotOrders, setKotOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderMode, setSelectedOrderMode] = useState('all');

  // Fetch initial KOT orders
  const fetchKotOrders = async () => {
    setLoading(true);
    try {
      // Explicitly define active statuses
      const activeStatuses = ['pending', 'preparing'].join(',');
      
      // Construct the API URL
      let url = `/api/orders/kot?status=${activeStatuses}`;
      
      // Add order mode filter if not 'all'
      if (selectedOrderMode !== 'all') {
        url += `&mode=${encodeURIComponent(selectedOrderMode)}`;
      }

      console.log('Fetching KOT orders from URL:', url); // Debugging log

      const res = await axiosWithAuth.get(url);
      
      console.log('KOT Orders Response:', res.data); // Debugging log

      if (res.data.success) {
        // Ensure we're setting the correct data
        setKotOrders(res.data.data || []);
        
        if (res.data.data.length === 0) {
          console.log('No orders found for the selected mode');
        }
      } else {
        console.error('Failed to fetch orders:', res.data.message);
        toast.error(res.data.message || 'Failed to fetch orders');
        setKotOrders([]); // Ensure empty array if fetch fails
      }
    } catch (error) {
      console.error('Error fetching KOT orders:', error);
      toast.error('Error loading orders');
      setKotOrders([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    // Fetch orders immediately
    fetchKotOrders();

    // Set up periodic refresh every 30 seconds
    const intervalId = setInterval(fetchKotOrders, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [selectedOrderMode]); // Re-fetch when order mode changes

  // Handle order mode change
  const handleOrderModeChange = (event, newValue) => {
    setSelectedOrderMode(newValue);
  };

  // Handle order status update
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await axiosWithAuth.put(`/api/orders/kot/${orderId}`, {
        kotStatus: newStatus
      });
      
      if (res.data.success) {
        // Update local state
        setKotOrders(prev =>
          prev.map(order =>
            order._id === orderId
              ? { ...order, kotStatus: newStatus }
              : order
          )
        );
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        toast.error(res.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error updating order status');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static" color="default">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kitchen Display System
          </Typography>
          <IconButton
            color="primary"
            onClick={fetchKotOrders}
            aria-label="refresh orders"
          >
            <RefreshIcon />
          </IconButton>
        </Toolbar>
        {/* Order Mode Tabs */}
        <Tabs
          value={selectedOrderMode}
          onChange={handleOrderModeChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="order modes"
        >
          {ORDER_MODES.map(mode => (
            <Tab
              key={mode.id}
              value={mode.id}
              label={mode.label}
              icon={
                <Chip
                  label={mode.id === 'all'
                    ? kotOrders.length
                    : kotOrders.filter(order => order.orderMode === mode.id).length
                  }
                  size="small"
                  color="primary"
                />
              }
              iconPosition="end"
            />
          ))}
        </Tabs>
      </AppBar>
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
        {loading ? (
          <Typography align="center">Loading orders...</Typography>
        ) : kotOrders.length === 0 ? (
          <Typography align="center">No active orders</Typography>
        ) : (
          <Grid container spacing={2}>
            {kotOrders.map(order => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={order._id}>
                <OrderCard
                  order={order}
                  selectedOrderMode={selectedOrderMode}
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
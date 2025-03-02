'use client';
import { useState, useEffect } from 'react';
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
  Alert,
  Snackbar
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import SignalWifiIcon from '@mui/icons-material/SignalWifi4Bar';
import OrderCard from './OrderCard';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import useKdsSocket from '@/hooks/useKdsSocket';

// Order modes
const ORDER_MODES = [
  { id: 'all', label: 'All Orders' },
  { id: 'Dine-in', label: 'Dine-in' },
  { id: 'Takeaway', label: 'Takeaway' },
  { id: 'Delivery', label: 'Delivery' },
  { id: 'Direct Order-TableQR', label: 'QR Order' },
  { id: 'Zomato', label: 'Zomato' }
];

const KitchenDisplay = () => {
  const [kotOrders, setKotOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState('all');
  const [notification, setNotification] = useState(null);
  
  // Initialize WebSocket connection
  const { 
    isConnected, 
    latestUpdate, 
    updateKotStatus, 
    changeOrderMode 
  } = useKdsSocket(selectedMode);

  // Fetch initial KOT orders
  const fetchKotOrders = async () => {
    setLoading(true);
    try {
      const statuses = ['pending', 'preparing']; // Only show active orders
      const url = selectedMode === 'all' 
        ? `/api/orders/kot?status=${statuses.join(',')}`
        : `/api/orders/kot?status=${statuses.join(',')}&mode=${selectedMode}`;
      
      const res = await axiosWithAuth.get(url);
      
      if (res.data.success) {
        // Map station to items based on dish name/properties
        const ordersWithStations = res.data.data.map(order => {
          // Assign stations to items
          const items = order.items.map(item => {
            let station = 'grill'; // Default
            const itemName = (item.dishName || '').toLowerCase();
            if (itemName.includes('salad') || itemName.includes('veg')) {
              station = 'salad';
            } else if (itemName.includes('dessert') || itemName.includes('sweet')) {
              station = 'dessert';
            } else if (itemName.includes('fry') || itemName.includes('fried')) {
              station = 'fry';
            } else if (itemName.includes('drink') || itemName.includes('beverage')) {
              station = 'bar';
            }
            return {
              ...item,
              station,
            };
          });
          
          // Calculate primary station for the order
          const stationCounts = items.reduce((acc, item) => {
            acc[item.station] = (acc[item.station] || 0) + 1;
            return acc;
          }, {});
          
          // Determine primary station by highest count
          const entries = Object.entries(stationCounts);
          const primaryStation = entries.length > 0 
            ? entries.sort((a, b) => b[1] - a[1])[0][0]
            : 'grill';
          
          return {
            ...order,
            items,
            primaryStation,
            stationCounts
          };
        });
        
        setKotOrders(ordersWithStations);
      } else {
        toast.error(res.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching KOT orders:', error);
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchKotOrders();
  }, [selectedMode]);
  
  // Process WebSocket updates
  useEffect(() => {
    if (!latestUpdate) return;
    
    // Handle different update types
    if (latestUpdate.type === 'new') {
      // New KOT added
      setNotification({
        type: 'info',
        message: `New order #${latestUpdate.data.kotTokenNum} received`,
        open: true
      });
      // Refresh orders to include the new one
      fetchKotOrders();
      
    } else if (latestUpdate.type === 'status') {
      // KOT status update
      const { kotId, status } = latestUpdate.data;
      
      // Update the existing order in our state
      setKotOrders(prev => 
        prev.map(order => 
          order._id === kotId 
            ? { ...order, kotStatus: status }
            : order
        ).filter(order => 
          // Remove completed orders from view
          order._id !== kotId || (order._id === kotId && status !== 'completed')
        )
      );
      
      // Show notification
      setNotification({
        type: 'success',
        message: `Order status updated to ${status}`,
        open: true
      });
    }
  }, [latestUpdate]);

  // Handle mode change
  const handleModeChange = (event, newValue) => {
    setSelectedMode(newValue);
    
    // Update WebSocket room
    changeOrderMode(newValue);
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
          ).filter(order => 
            // If new status is "completed", remove from view
            order._id !== orderId || (order._id === orderId && newStatus !== 'completed')
          )
        );
        
        toast.success(`Order status updated to ${newStatus}`);
        
        // Also update via WebSocket to notify other clients
        updateKotStatus(orderId, newStatus);
      } else {
        toast.error(res.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error updating order status');
    }
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static" color="default">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kitchen Display System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {isConnected ? (
              <SignalWifiIcon color="success" sx={{ mr: 1 }} />
            ) : (
              <SignalWifiOffIcon color="error" sx={{ mr: 1 }} />
            )}
            <Typography variant="body2" color={isConnected ? "success.main" : "error.main"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>
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
          value={selectedMode}
          onChange={handleModeChange}
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
                  label={kotOrders.filter(order =>
                    mode.id === 'all' || order.orderMode === mode.id
                  ).length}
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
          <Typography align="center">No active orders for this mode</Typography>
        ) : (
          <Grid container spacing={2}>
            {kotOrders.map(order => (
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
      
      {/* Notification */}
      <Snackbar
        open={notification?.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default KitchenDisplay;
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid, Card, Typography, Box, Button, Chip, CircularProgress,
  Paper, Tooltip, Alert, Badge
} from '@mui/material';
import {
  Circle, User, RefreshCw, Receipt, AlertCircle
} from 'lucide-react';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

const TableView = () => {
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState(null);
  const [loadingTable, setLoadingTable] = useState(null);

  // Fetch tables and their associated orders
  useEffect(() => {
    fetchTablesAndOrders();
    
    // Set up polling interval to refresh data
    const intervalId = setInterval(() => {
      fetchTablesAndOrders(false); // silent refresh
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  const fetchTablesAndOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      // Step 1: Fetch all tables
      const tablesResponse = await axiosWithAuth.get('/api/tables');
      if (!tablesResponse.data.success) {
        throw new Error('Failed to fetch tables');
      }
      const rawTables = tablesResponse.data.data;
      
      // Step 2: Fetch ALL active orders
      const ordersResponse = await axiosWithAuth.get('/api/orders?mode=Dine-in&status=pending,preparing,ready,served');
      if (!ordersResponse.data.success) {
        throw new Error('Failed to fetch orders');
      }
      const orders = ordersResponse.data.data;
      console.log(`Found ${orders.length} active orders for ${rawTables.length} tables`);
      
      // Step 3: Fetch KOTs for these orders
      let tableKots = {};
      let tableKotsCount = {};
      let tableOrders = {}; // Store order by table ID
      
      // Process orders to collect table IDs that have orders
      const processOrderPromises = orders.map(async (order) => {
        if (order.table) {
          const tableId = typeof order.table === 'string' ? order.table : order.table._id;
          
          // Store the order by table ID
          if (!tableOrders[tableId]) {
            tableOrders[tableId] = [];
          }
          tableOrders[tableId].push(order);
          
          // Fetch KOTs for this order
          try {
            const kotsResponse = await axiosWithAuth.get(`/api/orders/kot?orderId=${order._id}`);
            if (kotsResponse.data.success) {
              // Keep track of KOTs by tableId
              if (!tableKots[tableId]) {
                tableKots[tableId] = [];
              }
              tableKots[tableId] = [...tableKots[tableId], ...kotsResponse.data.data];
              tableKotsCount[tableId] = (tableKotsCount[tableId] || 0) + kotsResponse.data.data.length;
            }
          } catch (error) {
            console.error(`Error fetching KOTs for order ${order._id}:`, error);
          }
        }
      });
      
      // Wait for all API calls to complete
      await Promise.all(processOrderPromises);
      
      // Step 4: Map tables with orders and KOTs
      const processedTables = rawTables.map(table => {
        // Find active orders for this table
        const tableOrdersList = tableOrders[table._id] || [];
        
        // Take the most recent order if multiple exist
        const tableOrder = tableOrdersList.length > 0 ?
          tableOrdersList.sort((a, b) => new Date(b.orderDateTime) - new Date(a.orderDateTime))[0] : null;
        
        // Log for debugging
        if (tableOrder) {
          console.log(`Table ${table.tableName} (${table._id}) has active order: ${tableOrder._id}`);
        }
        
        // Determine table status based on order status
        let orderStatus = 'blank';
        if (tableOrder) {
          // If there's an order and KOTs exist, the table is at least KOT printed
          if (tableKotsCount[table._id] && tableKotsCount[table._id] > 0) {
            orderStatus = 'kot_printed';
          } else {
            orderStatus = 'occupied';
          }
          
          // If the order is served, it's invoice printed
          if (tableOrder.orderStatus === 'served') {
            orderStatus = 'invoice_printed';
          }
        }
        
        // Generate order references
        const orderRefs = tableOrder ? {
          eps: tableOrder.invoiceNumber || '--',
          kot: tableOrder.refNum || '--',
          orderId: tableOrder._id
        } : {
          eps: '--',
          kot: '--',
          orderId: null
        };
        
        // Get KOTs count for this table
        const kotsCount = tableKotsCount[table._id] || 0;
        
        return {
          _id: table._id,
          tableName: table.tableName,
          capacity: table.capacity || 2,
          status: table.status,
          orderStatus,
          orderRefs,
          kotsCount,
          totalAmount: tableOrder ? tableOrder.totalAmount || 0 : 0,
          hasOrder: !!tableOrder,
          orderId: tableOrder ? tableOrder._id : null // Store order ID directly
        };
      });
      
      setTables(processedTables);
    } catch (error) {
      console.error('Error fetching tables and orders:', error);
      setError('Failed to load tables data. ' + error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Get the appropriate indicator color based on status
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'blank': return '#CCCCCC'; // Gray for blank table
      case 'occupied': return '#1E88E5'; // Blue for occupied
      case 'kot_printed': return '#4CAF50'; // Green for KOT printed
      case 'invoice_printed': return '#E91E63'; // Pink for invoice printed
      default: return '#CCCCCC'; // Default gray
    }
  };

  // Handle table click to navigate to sales register
  const handleTableClick = (table) => {
    // Ensure we're in a client-side environment before using browser APIs
    if (typeof window === 'undefined') return;
    
    if (loadingTable === table._id) return; // Prevent multiple clicks
    
    setLoadingTable(table._id);
    const tableName = encodeURIComponent(table.tableName || '');
    
    // If we already have the order ID from our initial data loading, use it directly
    if (table.hasOrder && table.orderId) {
      console.log(`Table ${table.tableName} already has order ID: ${table.orderId}`);
      
      // Use nextjs router if we have it
      if (router) {
        router.push(`/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}&orderId=${encodeURIComponent(table.orderId)}`);
        setLoadingTable(null);
        return;
      } else if (typeof window !== 'undefined') {
        // Fall back to direct location change if router is not available
        window.location.href = `/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}&orderId=${encodeURIComponent(table.orderId)}`;
        return;
      }
    }
    
    // Otherwise, fetch the latest order for this table
    const fetchLatestOrderForTable = async () => {
      try {
        console.log(`Fetching latest order for table: ${table._id}`);
        
        // Fetch all active orders for this table with explicit statuses
        const response = await axiosWithAuth.get(
          `/api/orders?table=${encodeURIComponent(table._id)}&status=pending,preparing,ready,served`
        );
        
        console.log(`API response for table ${table._id}:`, response.data);
        
        if (response.data.success && response.data.data.length > 0) {
          // Sort orders to get the most recent
          const sortedOrders = response.data.data.sort((a, b) =>
            new Date(b.createdAt || b.orderDateTime) - new Date(a.createdAt || a.orderDateTime)
          );
          
          // Get the most recent order
          const latestOrder = sortedOrders[0];
          console.log(`Latest order found for table ${table.tableName}:`, latestOrder._id);
          
          // Navigate with the correct order ID
          if (router) {
            router.push(`/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}&orderId=${encodeURIComponent(latestOrder._id)}`);
          } else if (typeof window !== 'undefined') {
            window.location.href = `/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}&orderId=${encodeURIComponent(latestOrder._id)}`;
          }
        } else {
          console.log(`No orders found for table ${table.tableName}, creating new order`);
          
          // No orders found, just navigate to the table
          if (router) {
            router.push(`/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}`);
          } else if (typeof window !== 'undefined') {
            window.location.href = `/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}`;
          }
        }
      } catch (error) {
        console.error("Error fetching latest order:", error);
        toast.error("Error loading table data. Proceeding with new order.");
        
        // Navigate without order ID in case of error
        if (router) {
          router.push(`/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}`);
        } else if (typeof window !== 'undefined') {
          window.location.href = `/salesregister?tableId=${encodeURIComponent(table._id)}&mode=Dine-in&tableName=Table+${tableName}`;
        }
      } finally {
        setLoadingTable(null);
      }
    };
    
    // Execute the fetch function
    fetchLatestOrderForTable();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with refresh button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">Table View</Typography>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={20} /> : <RefreshCw size={16} />}
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Tables'}
        </Button>
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      {/* Legend */}
      <Paper sx={{ p: 2, mb: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Circle size={16} color="#CCCCCC" fill="#CCCCCC" />
          <Typography>Blank Table</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Circle size={16} color="#1E88E5" fill="#1E88E5" />
          <Typography>Occupied</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Circle size={16} color="#4CAF50" fill="#4CAF50" />
          <Typography>KOT Printed/Saved</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Circle size={16} color="#E91E63" fill="#E91E63" />
          <Typography>Invoice Printed</Typography>
        </Box>
      </Paper>
      
      {/* Table Grid */}
      {loading && tables.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {tables.map(table => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={table._id}>
              <Card
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  position: 'relative',
                  borderLeft: table.hasOrder ? `4px solid ${getStatusIndicator(table.orderStatus)}` : 'none',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  },
                  opacity: loadingTable === table._id ? 0.7 : 1
                }}
                onClick={() => handleTableClick(table)}
              >
                {loadingTable === table._id && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    zIndex: 2
                  }}>
                    <CircularProgress />
                  </Box>
                )}
                
                {/* Status indicator circle at top */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <Circle
                    size={16}
                    color={getStatusIndicator(table.orderStatus)}
                    fill={getStatusIndicator(table.orderStatus)}
                  />
                </Box>
                
                {/* Table header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Table {table.tableName}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <User size={16} style={{ marginRight: '4px' }} />
                    <Typography variant="body2">{table.capacity}</Typography>
                  </Box>
                </Box>
                
                {/* Order info */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Invoice: {table.orderRefs.eps}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Ref: {table.orderRefs.kot}
                </Typography>
                
                {/* Debug info - uncomment for debugging */}
                {table.hasOrder && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontSize: '0.7rem' }}>
                    OrderID: {table.orderId ? table.orderId.substring(0, 8) + '...' : 'None'}
                  </Typography>
                )}
                
                {/* Dynamic data - KOTs count and Total */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Chip
                    icon={<Receipt size={14} />}
                    label={`KOT's: ${table.kotsCount}`}
                    size="small"
                    variant={table.kotsCount > 0 ? "filled" : "outlined"}
                    color={table.kotsCount > 0 ? "success" : "default"}
                  />
                  <Typography variant="subtitle1" fontWeight="bold">
                    ₹{table.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
                
                {/* Status label */}
                {table.hasOrder && (
                  <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                    <Chip
                      size="small"
                      label={table.orderStatus === 'blank' ? 'Available' :
                             table.orderStatus === 'occupied' ? 'Occupied' :
                             table.orderStatus === 'kot_printed' ? 'In Progress' : 'Served'}
                      color={table.orderStatus === 'blank' ? 'default' :
                             table.orderStatus === 'occupied' ? 'primary' :
                             table.orderStatus === 'kot_printed' ? 'success' : 'secondary'}
                    />
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default TableView;
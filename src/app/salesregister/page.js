'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SalesRegister from '@/components/salesregister/SalesRegister';
import {
  Box, Container, Paper, IconButton, Typography, Button, Chip,
  CircularProgress, Alert, AlertTitle, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText, TextField
} from '@mui/material';
import {
  ArrowBack, Refresh as RefreshIcon, AddCircle as NewOrderIcon,
  ErrorOutline as ErrorIcon, BugReport as BugIcon,
  Create as CreateIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function SalesRegisterPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [initialOrder, setInitialOrder] = useState(null);
  const [initialMode, setInitialMode] = useState('Dine-in');
  const [tableOrders, setTableOrders] = useState([]);
  const [checkingOrders, setCheckingOrders] = useState(false);
  const [error, setError] = useState(null);
  const [confirmNewOrderOpen, setConfirmNewOrderOpen] = useState(false);
  const [isCorrectingId, setIsCorrectingId] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);

  // Extract params from URL
  const tableId = searchParams.get('tableId');
  const tableName = searchParams.get('tableName');
  const orderId = searchParams.get('orderId');
  const mode = searchParams.get('mode') || 'Dine-in';

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // This function creates a new order directly without going through the normal flow
  const createTestOrder = async () => {
    if (!tableId) {
      toast.error("No table ID available");
      return;
    }
    try {
      setCreatingTest(true);
      toast.info("Creating test order...");
      // Create a basic order with minimal required fields
      const testOrder = {
        orderMode: "Dine-in",
        table: tableId,
        customer: {
          name: "Test Customer",
          phone: "1234567890"
        },
        numOfPeople: 1,
        itemsSold: [],
        taxDetails: [
          { taxName: 'GST 5%', taxRate: 5, taxAmount: 0 }
        ],
        discount: {
          discountType: 'percentage',
          discountPercentage: 0,
          discountValue: 0
        },
        deliveryCharge: 0,
        packagingCharge: 0,
        payment: [
          { method: 'Cash', amount: 0 }
        ],
        orderStatus: 'pending',
        subtotalAmount: 0,
        totalTaxAmount: 0,
        totalAmount: 0,
        menu: "65f7ce9ce5e98ab4e6ac0cd1" // Replace with a valid menu ID from your system or remove if not required
      };
      const response = await axiosWithAuth.post("/api/orders", testOrder);
      if (response.data.success) {
        const newOrder = response.data.data;
        toast.success(`Test order created with ID: ${newOrder._id}`);
        // Update URL with the new order ID
        if (typeof window !== 'undefined') {
          const url = new URL(window.location);
          url.searchParams.set('orderId', newOrder._id);
          window.history.replaceState({}, '', url);
        }
        // Set the initial order to the newly created order
        setInitialOrder(newOrder);
        setError(null);
        // Force a refresh
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error("Failed to create test order");
      }
    } catch (error) {
      console.error("Error creating test order:", error);
      toast.error(`Error creating test order: ${error.message || "Unknown error"}`);
    } finally {
      setCreatingTest(false);
    }
  };

  // Add API diagnostic function for order testing
  const runApiDiagnostics = async () => {
    try {
      setRunningDiagnostics(true);
      toast.info("Running API diagnostics...");
      console.log("==== API DIAGNOSTICS ====");
      
      // Test 1: Check if table exists
      console.log(`1. Testing if table ${tableId} exists...`);
      try {
        const tableResponse = await axiosWithAuth.get(`/api/tables/${tableId}`);
        console.log("Table response:", tableResponse.data);
        const tableExists = tableResponse.data.success;
        console.log(`Table exists: ${tableExists}`);
      } catch (error) {
        console.log("Error checking table:", error.response?.data || error.message);
      }

      // Test 2: Check for ANY orders for this table with ALL possible statuses
      console.log(`2. Testing for ANY orders for table ${tableId} with ALL statuses...`);
      try {
        const allOrdersResponse = await axiosWithAuth.get(
          `/api/orders?table=${tableId}&status=pending,preparing,ready,served,completed,cancelled`
        );
        console.log("All orders response:", allOrdersResponse.data);
        const allOrdersCount = allOrdersResponse.data.success ? allOrdersResponse.data.data.length : 0;
        console.log(`Found ${allOrdersCount} orders with ALL statuses`);
      } catch (error) {
        console.log("Error checking all orders:", error.response?.data || error.message);
      }

      // Test 3: Check for the specific order ID
      if (orderId) {
        console.log(`3. Testing if order ${orderId} exists...`);
        try {
          const orderResponse = await axiosWithAuth.get(`/api/orders/${orderId}`);
          console.log("Order response:", orderResponse.data);
          console.log(`Order exists: ${orderResponse.data.success}`);
        } catch (error) {
          console.log("Order does not exist:", error.response?.status);
        }
      }

      // Test 4: Check for recent orders in the whole system
      console.log("4. Checking for the 5 most recent orders in the system...");
      try {
        const recentOrdersResponse = await axiosWithAuth.get("/api/orders?limit=5");
        console.log("Recent orders:", recentOrdersResponse.data);
        const recentOrdersCount = recentOrdersResponse.data.success ? recentOrdersResponse.data.data.length : 0;
        console.log(`Found ${recentOrdersCount} recent orders`);
      } catch (error) {
        console.log("Error checking recent orders:", error.response?.data || error.message);
      }

      // Test 5: Check all tables to see if they have orders
      console.log("5. Checking all tables for orders...");
      try {
        const tablesResponse = await axiosWithAuth.get("/api/tables");
        if (tablesResponse.data.success) {
          const tables = tablesResponse.data.data;
          console.log(`Found ${tables.length} tables`);
          // Check each table for orders
          for (const table of tables.slice(0, 5)) { // Only check first 5 tables to avoid too many requests
            try {
              const tableOrdersResp = await axiosWithAuth.get(
                `/api/orders?table=${table._id}&status=pending,preparing,ready,served`
              );
              const orderCount = tableOrdersResp.data.success ? tableOrdersResp.data.data.length : 0;
              console.log(`Table ${table.tableName} (${table._id}): ${orderCount} orders`);
            } catch (error) {
              console.log(`Error checking orders for table ${table.tableName}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.log("Error checking tables:", error.response?.data || error.message);
      }
      
      console.log("==== END API DIAGNOSTICS ====");
      toast.success("API diagnostics completed. Check console for results.");
    } catch (error) {
      console.error("Error running API diagnostics:", error);
      toast.error("Error running API diagnostics");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // This function debugs order ID issues
  const debugOrderIdIssues = useCallback(async () => {
    if (!tableId) return;
    try {
      console.log("==== ORDER ID DEBUGGING ====");
      console.log("Current URL Order ID:", orderId);
      
      // Fetch all orders for this table
      const response = await axiosWithAuth.get(
        `/api/orders?table=${tableId}&status=pending,preparing,ready,served`
      );
      
      if (response.data.success && response.data.data.length > 0) {
        console.log(`Found ${response.data.data.length} orders for table ${tableId}`);
        
        // Log all order IDs for this table
        response.data.data.forEach((order, index) => {
          console.log(`Order ${index + 1} ID: ${order._id}`);
          console.log(` - Created: ${new Date(order.createdAt || order.orderDateTime).toLocaleString()}`);
          console.log(` - Status: ${order.orderStatus}`);
          console.log(` - Items: ${order.itemsSold?.length || 0}`);
        });
        
        // Check if current order ID matches any of the found orders
        const orderExists = response.data.data.some(order => order._id === orderId);
        console.log("Current URL order ID exists in database:", orderExists);
        
        if (!orderExists && orderId) {
          console.warn("❌ Order ID mismatch detected! URL has an invalid order ID.");
          
          // Find closest matching order ID (for debugging)
          const closestMatch = response.data.data.find(order => 
            order._id.substring(0, 5) === orderId.substring(0, 5)
          );
          
          if (closestMatch) {
            console.log("Possibly similar order found:");
            console.log(" - Similar Order ID:", closestMatch._id);
            console.log(" - URL Order ID: ", orderId);
            
            // Highlight differences
            let diffString = "";
            for (let i = 0; i < Math.max(closestMatch._id.length, orderId.length); i++) {
              if (i < closestMatch._id.length && i < orderId.length) {
                diffString += closestMatch._id[i] === orderId[i] ? " " : "^";
              } else {
                diffString += "^";
              }
            }
            console.log(" - Differences: ", diffString);
          }
        }
      } else {
        console.log("No orders found for this table");
      }
      
      console.log("==== END DEBUG ====");
    } catch (error) {
      console.error("Error during order ID debugging:", error);
    }
  }, [tableId, orderId]);

  // This function corrects order IDs in the URL
  const correctOrderId = useCallback(async () => {
    if (!tableId) return;
    try {
      setIsCorrectingId(true);
      
      // First check if the current order ID is valid
      if (orderId) {
        try {
          const orderCheck = await axiosWithAuth.get(`/api/orders/${orderId}`);
          if (orderCheck.data.success) {
            console.log("Current order ID is valid, no correction needed");
            setIsCorrectingId(false);
            return; // No correction needed
          }
        } catch (error) {
          console.log("Current order ID is invalid, will attempt to find correct one");
        }
      }
      
      // Fetch all orders for this table
      const response = await axiosWithAuth.get(
        `/api/orders?table=${tableId}&status=pending,preparing,ready,served`
      );
      
      if (response.data.success && response.data.data.length > 0) {
        // Sort orders to get the most recent
        const sortedOrders = response.data.data.sort((a, b) => 
          new Date(b.createdAt || b.orderDateTime) - new Date(a.createdAt || a.orderDateTime)
        );
        
        // Get the most recent order
        const latestOrder = sortedOrders[0];
        console.log("Found latest order ID:", latestOrder._id);
        
        // Update URL with correct order ID
        if (typeof window !== 'undefined' && latestOrder._id !== orderId) {
          const url = new URL(window.location);
          url.searchParams.set('orderId', latestOrder._id);
          // Use history.replaceState to update URL without triggering a reload
          window.history.replaceState({}, '', url);
          console.log("URL updated with correct order ID");
          // Show a toast
          toast.success("Order ID corrected in URL");
          // Refresh the page for the changes to take effect
          window.location.reload();
        } else {
          toast.info("Order ID is already correct");
          setIsCorrectingId(false);
        }
      } else {
        toast.error("No orders found for this table");
        setIsCorrectingId(false);
      }
    } catch (error) {
      console.error("Error correcting order ID:", error);
      setIsCorrectingId(false);
    }
  }, [tableId, orderId]);

  // Function to fetch table orders
  const fetchTableOrders = useCallback(async (showLoading = true) => {
    // Skip if not authenticated or no tableId
    if (authLoading || !isAuthenticated || !tableId) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      setError(null); // Clear previous errors
      
      console.log("Checking for orders on table:", tableId);
      
      // Fetch ALL orders for this table (pending, preparing, ready, served)
      const response = await axiosWithAuth.get(
        `/api/orders?table=${tableId}&status=pending,preparing,ready,served`
      );
      
      console.log("API response:", response.data);
      
      if (response.data.success && response.data.data.length > 0) {
        // Store all the orders
        const orders = response.data.data;
        setTableOrders(orders);
        console.log(`Found ${orders.length} orders for table ${tableId}:`, orders);
        
        // Get the most recent order by creation date
        const sortedOrders = orders.sort((a, b) => 
          new Date(b.createdAt || b.orderDateTime) - new Date(a.createdAt || a.orderDateTime)
        );
        
        // Get the most recent order
        const latestOrder = sortedOrders[0];
        console.log("Using latest order:", latestOrder);
        
        // Set initial order
        setInitialOrder(latestOrder);
        setInitialMode(latestOrder.orderMode || 'Dine-in');
        
        // Update URL with orderId for better persistence
        if (typeof window !== 'undefined' && (!orderId || orderId !== latestOrder._id)) {
          const url = new URL(window.location);
          url.searchParams.set('orderId', latestOrder._id);
          window.history.replaceState({}, '', url);
          console.log("Updated URL with latest order ID:", latestOrder._id);
        }
        
        toast.success(`Loaded existing order for table ${tableName || tableId}`);
        return true;
      } else {
        console.log(`No orders found for table ${tableId}`);
        return false;
      }
    } catch (error) {
      console.error('Error finding order for table:', error);
      setError(`Error loading table orders: ${error.message || 'Unknown error'}`);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [tableId, orderId, isAuthenticated, authLoading, tableName]);

  // First try to load the specific order if an orderId is provided
  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (orderId) {
          // Try to fetch the specific order first
          console.log("Fetching specific order by ID:", orderId);
          
          try {
            const response = await axiosWithAuth.get(`/api/orders/${orderId}`);
            console.log("Order response:", response);
            
            if (response.data.success) {
              console.log("Order loaded successfully:", response.data.data);
              setInitialOrder(response.data.data);
              setInitialMode(response.data.data.orderMode || 'Dine-in');
              setLoading(false);
              return;
            }
          } catch (orderError) {
            console.error("Failed to load specific order:", orderError);
            
            // Run the debug function to get more information
            await debugOrderIdIssues();
            // Don't set the error yet - we'll try to fall back to loading table orders
          }
          
          // If we're here, the specific order failed to load.
          // Let's try to find other orders for this table as a fallback
          console.log("Order not found, falling back to table orders");
          
          // Only proceed with fallback if we have a tableId
          if (tableId) {
            const found = await fetchTableOrders(false);
            
            if (found) {
              // We found and set a table order as fallback
              toast.info('The specified order was not found. Loaded the most recent order for this table instead.');
            } else {
              // No fallback orders found
              console.log("No fallback orders found for table:", tableId);
              setError("The specified order was not found, and no other orders were found for this table.");
            }
          } else {
            // No tableId to fall back to
            setError("The specified order was not found. Please check the order ID.");
          }
        } else if (tableId) {
          // If no orderId is provided but we have a tableId, fetch table orders
          await fetchTableOrders(false);
        }
      } catch (error) {
        console.error('Error in order loading process:', error);
        setError(`Error loading order data: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    // Only run if authenticated
    if (!authLoading && isAuthenticated) {
      loadOrder();
    }
  }, [orderId, tableId, isAuthenticated, authLoading, fetchTableOrders, debugOrderIdIssues]);

  // Handle back navigation
  const handleBack = () => {
    router.push('/dashboard/orders/tableview');
  };

  // Handle order completion or update
  const handleOrderUpdate = (updatedOrder) => {
    if (updatedOrder) {
      setInitialOrder(updatedOrder); // Update the local state with the latest order
      
      // Update URL with orderId if it changed
      if (updatedOrder._id && (!orderId || updatedOrder._id !== orderId)) {
        const url = new URL(window.location);
        url.searchParams.set('orderId', updatedOrder._id);
        window.history.pushState({}, '', url);
      }
      
      toast.success('Order updated successfully');
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (orderId) {
        // Try to fetch the specific order again
        try {
          const response = await axiosWithAuth.get(`/api/orders/${orderId}`);
          
          if (response.data.success) {
            setInitialOrder(response.data.data);
            setInitialMode(response.data.data.orderMode || 'Dine-in');
            toast.success('Order refreshed successfully');
            setLoading(false);
            return;
          }
        } catch (orderError) {
          console.error("Failed to refresh order:", orderError);
          
          // Attempt to correct the order ID
          await correctOrderId();
          return; // The page will reload if an ID correction was made
        }
      }
      
      // If order refresh failed or no orderId, try table orders
      if (tableId) {
        const found = await fetchTableOrders(false);
        
        if (found) {
          toast.success('Table orders refreshed successfully');
        } else {
          setError('No orders found for this table');
        }
      } else {
        setError('No table ID or order ID to refresh');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError(`Error refreshing data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle create new order
  const handleCreateNew = () => {
    if (initialOrder && initialOrder.itemsSold?.length > 0) {
      // If there's an existing order with items, confirm before replacing
      setConfirmNewOrderOpen(true);
    } else {
      createNewOrder();
    }
  };

  // Create new order after confirmation
  const createNewOrder = () => {
    setInitialOrder(null);
    setError(null);
    
    // Update URL to remove orderId
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('orderId');
      window.history.pushState({}, '', url);
    }
    
    setConfirmNewOrderOpen(false);
    toast.success('Ready to create a new order');
  };

  // Handle manual check for table orders
  const checkTableOrders = async () => {
    if (!tableId) return;
    
    setCheckingOrders(true);
    
    try {
      await debugOrderIdIssues();
      const found = await fetchTableOrders(true);
      
      if (!found) {
        toast.error('No orders found for this table');
      }
    } catch (error) {
      console.error('Debug check failed:', error);
      toast.error('Failed to check table orders');
    } finally {
      setCheckingOrders(false);
    }
  };

  // Show loading or auth checks
  if (authLoading) {
    return <div>Checking authentication...</div>;
  }
  
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box>
      {/* Back button and header */}
      <Box display="flex" alignItems="center" p={2}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" component="h1">
          {tableName ? `Table ${tableName}` : 'Sales Register'}
        </Typography>
        {tableId && (
          <Chip
            label={`Table: ${tableName || tableId}`}
            color="primary"
            size="small"
            sx={{ ml: 2 }}
          />
        )}
        {initialOrder && (
          <Chip
            label={`Order: ${initialOrder.invoiceNumber || initialOrder._id}`}
            color="secondary"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading || isCorrectingId}
            variant="outlined"
            size="small"
            color="primary"
          >
            {isCorrectingId ? "Fixing..." : "REFRESH"}
          </Button>
          <Button
            startIcon={<NewOrderIcon />}
            onClick={handleCreateNew}
            disabled={loading}
            variant="outlined"
            size="small"
            color="secondary"
          >
            NEW ORDER
          </Button>
        </Box>
      </Box>

      {/* Error message */}
      {error ? (
        <Alert
          severity="error"
          sx={{ mx: 2, mb: 2 }}
          action={
            <Box>
              <Button color="inherit" size="small" onClick={handleRefresh} sx={{ mr: 1 }}>
                Retry
              </Button>
              <Button color="inherit" size="small" onClick={createNewOrder} variant="outlined">
                New Order
              </Button>
            </Box>
          }
          icon={<ErrorIcon />}
        >
          <AlertTitle>Error</AlertTitle>
          {error}
          <Box mt={2}>
            <Typography variant="body2">
              No orders were found for this table. You can create a new order to continue.
            </Typography>
          </Box>
        </Alert>
      ) : null}

      {/* Main content - either loading, error recovery, or SalesRegister */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading order data...</Typography>
        </Box>
      ) : error ? (
        <Box display="flex" flexDirection="column" alignItems="center" my={4} px={4}>
          <Typography variant="h6" gutterBottom>No order found</Typography>
          <Typography align="center" paragraph>
            No active orders were found for this table. You can create a new order to get started.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<NewOrderIcon />}
            onClick={createNewOrder}
            size="large"
            sx={{ mt: 2 }}
          >
            Create New Order
          </Button>
          <Box mt={4}>
            <img
              src="/placeholder-empty-order.png"
              alt="Empty order"
              style={{ maxWidth: '300px', opacity: 0.6 }}
              onError={(e) => {e.target.style.display = 'none'}}
            />
          </Box>
        </Box>
      ) : (
        <SalesRegister
          initialTableId={tableId}
          initialOrder={initialOrder}
          initialMode={initialMode}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      {/* Confirm New Order Dialog */}
      <Dialog open={confirmNewOrderOpen} onClose={() => setConfirmNewOrderOpen(false)}>
        <DialogTitle>Create New Order?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This table already has an active order with {initialOrder?.itemsSold?.length || 0} items.
            Are you sure you want to create a new order instead?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmNewOrderOpen(false)}>Cancel</Button>
          <Button onClick={createNewOrder} color="error" variant="contained">
            Create New Order
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
}
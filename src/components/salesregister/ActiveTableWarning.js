const { CircularProgress, Alert, AlertTitle, Button } = require("@mui/material");

const ActiveTableWarning = ({ tableId, orderId }) => {
    const [activeOrders, setActiveOrders] = useState([]);
    const [checking, setChecking] = useState(false);
    
    useEffect(() => {
      // Only check if we have a table but no recognized order
      if (tableId && !orderId) {
        checkTableOrders();
      }
    }, [tableId, orderId]);
    
    const checkTableOrders = async () => {
      setChecking(true);
      try {
        const response = await axiosWithAuth.get(
          `/api/orders?table=${tableId}&status=pending,preparing,ready,served`
        );
        
        if (response.data.success) {
          setActiveOrders(response.data.data);
        }
      } catch (error) {
        console.error('Error checking for active orders:', error);
      } finally {
        setChecking(false);
      }
    };
    
    if (checking) {
      return <CircularProgress size={20} />;
    }
    
    if (activeOrders.length > 0) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>This table has {activeOrders.length} active order(s)</AlertTitle>
          Creating a new order may cause conflicts. Consider using the existing order.
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ mt: 1 }}
            onClick={() => {
              if (activeOrders[0]._id) {
                // Update URL with the found order ID
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location);
                  url.searchParams.set('orderId', activeOrders[0]._id);
                  window.history.replaceState({}, '', url);
                  window.location.reload();
                }
              }
            }}
          >
            Load Existing Order
          </Button>
        </Alert>
      );
    }
    
    return null;
  };

  export default ActiveTableWarning
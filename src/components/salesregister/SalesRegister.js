'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Divider,
  Select,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  ListItem,
  ListItemText,
  List,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Snackbar,
  CircularProgress,
  Collapse,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Restaurant as TableIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  LocalDining as DiningIcon,
  LocalShipping as DeliveryIcon,
  TakeoutDining as TakeawayIcon,
  Payment as PaymentIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  ReceiptLong as ReceiptIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ArrowBack,
  Close
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

import PaymentDialog from './PaymentDialog';
import KOTDialog from './KOTDialog';
import KOTService from './KOTService';
import { Table } from 'lucide-react';

// Order storage helper functions
const saveOrderToLocalStorage = (tableId, order) => {
  if (!tableId || !order) return;
  try {
    const key = `table_order_${tableId}`;
    localStorage.setItem(key, JSON.stringify(order));
    console.log(`Saved order for table ${tableId} to localStorage`);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

const getOrderFromLocalStorage = (tableId) => {
  if (!tableId) return null;
  try {
    const key = `table_order_${tableId}`;
    const savedOrder = localStorage.getItem(key);
    if (savedOrder) {
      console.log(`Found saved order for table ${tableId} in localStorage`);
      return JSON.parse(savedOrder);
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error);
  }
  return null;
};

// Active Table Warning Component - to show when there are active but unloaded orders
const ActiveTableWarning = ({ tableId, orderId, onOrderLoad }) => {
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
      const response = await axiosWithAuth.get(`/api/orders?table=${tableId}&status=pending,preparing,ready,served`);
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
            if (activeOrders[0]._id && onOrderLoad) {
              onOrderLoad(activeOrders[0]._id);
            } else if (activeOrders[0]._id) {
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

// Category Sidebar with Accordion Structure component
const CategorySidebar = ({ 
  categories, 
  subCategories,
  selectedCategory, 
  selectedSubCategory,
  setSelectedCategory,
  setSelectedSubCategory,
  categorySearch,
  setCategorySearch,
  fetchSubCategories,
  loadingSubcategories,
  fetchDishesBySubcategory,
  fetchAllDishes
}) => {
  // Track open/closed state of each category
  const [expandedCategories, setExpandedCategories] = useState({});

  // Toggle category expansion
  const toggleCategory = async (categoryId) => {
    // Set the selected category
    setSelectedCategory(categoryId);
    
    // If we're collapsing the category, clear the subcategory selection
    if (expandedCategories[categoryId]) {
      setSelectedSubCategory('');
      // When collapsing, show all dishes again
      fetchAllDishes();
    }

    // Toggle expansion state
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));

    // If it's not already expanded, fetch subcategories
    if (!expandedCategories[categoryId]) {
      await fetchSubCategories(categoryId);
    }
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategoryId) => {
    setSelectedSubCategory(subcategoryId);
    // Fetch dishes for this subcategory
    fetchDishesBySubcategory(subcategoryId);
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(
    category => category.categoryName.toLowerCase().includes(categorySearch.toLowerCase())
  );
  
  // "Show All" button handler
  const handleShowAll = () => {
    setSelectedCategory('');
    setSelectedSubCategory('');
    fetchAllDishes();
  };

  return (
    <Paper sx={{ height: 'calc(100vh - 170px)', overflow: 'auto' }}>
      <TextField
        fullWidth
        placeholder="Search Categories"
        variant="outlined"
        size="small"
        value={categorySearch}
        onChange={(e) => setCategorySearch(e.target.value)}
        sx={{ p: 1 }}
      />
      
      {/* Show All button */}
      <Button 
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleShowAll}
        sx={{ mx: 1, mb: 1, width: 'calc(100% - 16px)' }}
      >
        Show All Items
      </Button>
      
      <List component="nav" dense>
        {filteredCategories.map((category) => (
          <React.Fragment key={category._id}>
            {/* Category Item */}
            <ListItem
              button
              onClick={() => toggleCategory(category._id)}
              sx={{
                py: 1.5,
                backgroundColor: selectedCategory === category._id ? 'grey.200' : 'inherit',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight={selectedCategory === category._id ? "bold" : "normal"}>
                    {category.categoryName}
                  </Typography>
                }
              />
              {/* Expand/Collapse Icon */}
              {expandedCategories[category._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            
            {/* Subcategories Collapse Section */}
            <Collapse in={expandedCategories[category._id]} timeout="auto" unmountOnExit>
              {loadingSubcategories && selectedCategory === category._id ? (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List component="div" disablePadding>
                  {subCategories
                    .filter(subcat => subcat.category === category._id || 
                             (subcat.category && subcat.category._id === category._id))
                    .map((subcategory) => (
                      <ListItem
                        button
                        key={subcategory._id}
                        sx={{
                          pl: 4,
                          py: 1,
                          backgroundColor: selectedSubCategory === subcategory._id ? 'primary.light' : 'grey.100'
                        }}
                        onClick={() => handleSubcategorySelect(subcategory._id)}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              {subcategory.subCategoryName}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  {subCategories.filter(subcat => 
                    subcat.category === category._id || 
                    (subcat.category && subcat.category._id === category._id)
                  ).length === 0 && (
                    <ListItem sx={{ pl: 4, py: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary">
                            No subcategories
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </Collapse>
          </React.Fragment>
        ))}
        
        {filteredCategories.length === 0 && (
          <ListItem>
            <ListItemText
              primary={
                <Typography variant="body2" color="text.secondary" align="center">
                  No categories found
                </Typography>
              }
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

// Updated SalesRegister component
const SalesRegister = ({
  initialTableId = null,
  initialOrder = null,
  initialMode = 'Dine-in',
  onOrderUpdate = null
}) => {
  // Helper function to get subcategory ID from a dish
  const getSubCategoryId = (dish) => {
    // If there's no subCategory at all, return null
    if (!dish.subCategory) return null;
    
    // Handle the case where subCategory is an array of objects
    if (Array.isArray(dish.subCategory)) {
      // Get the first item if it exists
      const firstSubCategory = dish.subCategory[0];
      if (!firstSubCategory) return null;
      
      // Handle if the item is a string (ID) or object with _id
      return typeof firstSubCategory === 'string' 
        ? firstSubCategory 
        : firstSubCategory._id || null;
    } 
    // Handle the case where subCategory is a string (direct ID reference)
    else if (typeof dish.subCategory === 'string') {
      return dish.subCategory;
    } 
    // Handle the case where subCategory is an object with _id
    else if (dish.subCategory && dish.subCategory._id) {
      return dish.subCategory._id;
    }
    
    return null;
  };

  const handleSaveInvoice = async () => {
    if (!currentOrder.itemsSold || currentOrder.itemsSold.length === 0) {
      toast.error('Please add items to the order first');
      return;
    }
    
    setSavingOrder(true);
    try {
      // If we have an existing order, update it
      if (currentOrder._id) {
        // First ensure all items have been sent to the kitchen
        const unsentItems = getUnsentItems();
        if (unsentItems.length > 0) {
          // Ask if user wants to send remaining items to kitchen
          if (window.confirm('There are unsent items. Send them to kitchen first?')) {
            await handleGenerateKOT();
          }
        }
        
        // Create/update the invoice
        const invoiceResponse = await axiosWithAuth.post('/api/orders/invoice', {
          salesOrder: currentOrder._id
        });
        
        if (invoiceResponse.data.success) {
          toast.success('Invoice saved successfully');
          
          // Update the order status to 'completed' if all items served
          if (currentOrder.orderStatus === 'served') {
            await axiosWithAuth.put(`/api/orders/${currentOrder._id}/status`, {
              status: 'completed'
            });
            
            // Update local state
            setCurrentOrder(prev => ({
              ...prev,
              orderStatus: 'completed'
            }));
          }
          
          if (onOrderUpdate) {
            onOrderUpdate(currentOrder);
          }
        } else {
          toast.error('Failed to save invoice');
        }
      } else {
        // This is a new order, first save the order then create invoice
        // Ensure we have basic required fields
        if (!currentOrder.orderMode) {
          toast.error('Please select an order mode');
          setSavingOrder(false);
          return;
        }
        
        if (currentOrder.orderMode === 'Dine-in' && !currentOrder.table) {
          toast.error('Please select a table for dine-in orders');
          setSavingOrder(false);
          return;
        }
        
        // Save the order first
        const orderResponse = await axiosWithAuth.post('/api/orders', currentOrder);
        
        if (orderResponse.data.success) {
          const savedOrder = orderResponse.data.data;
          
          // Create invoice for the new order
          const invoiceResponse = await axiosWithAuth.post('/api/orders/invoice', {
            salesOrder: savedOrder._id
          });
          
          if (invoiceResponse.data.success) {
            toast.success('Order and invoice saved successfully');
            
            // Update current order with saved data
            setCurrentOrder(savedOrder);
            
            // Update URL with order ID
            if (typeof window !== 'undefined') {
              const url = new URL(window.location);
              url.searchParams.set('orderId', savedOrder._id);
              window.history.replaceState({}, '', url);
            }
            
            if (onOrderUpdate) {
              onOrderUpdate(savedOrder);
            }
          } else {
            toast.warning('Order saved but invoice creation failed');
          }
        } else {
          toast.error('Failed to save order');
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(`Error: ${error.message || 'Failed to save invoice'}`);
    } finally {
      setSavingOrder(false);
    }
  };
  
  // Function to print an invoice
  const handlePrintInvoice = async () => {
    if (!currentOrder.itemsSold || currentOrder.itemsSold.length === 0) {
      toast.error('Please add items to the order first');
      return;
    }
    
    setSavingOrder(true);
    try {
      let invoiceId;
      
      // Check if the order exists and has an ID
      if (currentOrder._id) {
        // Check if invoice already exists for this order
        const invoiceCheckResponse = await axiosWithAuth.get(`/api/orders/invoice?orderId=${currentOrder._id}`);
        
        if (invoiceCheckResponse.data.success && invoiceCheckResponse.data.data.length > 0) {
          // Invoice exists, use it
          invoiceId = invoiceCheckResponse.data.data[0]._id;
        } else {
          // Create a new invoice
          const invoiceResponse = await axiosWithAuth.post('/api/orders/invoice', {
            salesOrder: currentOrder._id
          });
          
          if (invoiceResponse.data.success) {
            invoiceId = invoiceResponse.data.data._id;
          } else {
            throw new Error('Failed to create invoice');
          }
        }
        
        // Open the invoice in a new window for printing
        if (invoiceId) {
          window.open(`/print/invoice/${invoiceId}`, '_blank');
          toast.success('Invoice opened for printing');
          
          // Mark the invoice as printed
          await axiosWithAuth.put(`/api/orders/invoice/${invoiceId}`, {
            isPrinted: true,
            printedAt: new Date()
          });
        }
      } else {
        // This is a new order, save it first
        toast.info('Saving order before printing...');
        
        // Save the order
        const orderResponse = await axiosWithAuth.post('/api/orders', currentOrder);
        
        if (orderResponse.data.success) {
          const savedOrder = orderResponse.data.data;
          
          // Create invoice for the new order
          const invoiceResponse = await axiosWithAuth.post('/api/orders/invoice', {
            salesOrder: savedOrder._id
          });
          
          if (invoiceResponse.data.success) {
            invoiceId = invoiceResponse.data.data._id;
            
            // Update current order with saved data
            setCurrentOrder(savedOrder);
            
            // Update URL with order ID
            if (typeof window !== 'undefined') {
              const url = new URL(window.location);
              url.searchParams.set('orderId', savedOrder._id);
              window.history.replaceState({}, '', url);
            }
            
            if (onOrderUpdate) {
              onOrderUpdate(savedOrder);
            }
            
            // Open the invoice in a new window for printing
            if (invoiceId) {
              window.open(`/print/invoice/${invoiceId}`, '_blank');
              toast.success('Invoice opened for printing');
              
              // Mark the invoice as printed
              await axiosWithAuth.put(`/api/orders/invoice/${invoiceId}`, {
                isPrinted: true,
                printedAt: new Date()
              });
            }
          } else {
            throw new Error('Failed to create invoice');
          }
        } else {
          throw new Error('Failed to save order');
        }
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error(`Error: ${error.message || 'Failed to print invoice'}`);
    } finally {
      setSavingOrder(false);
    }
  };
  
  // Function to print and save invoice
  const handlePrintAndSave = async () => {
    setSavingOrder(true);
    try {
      // First save the invoice
      await handleSaveInvoice();
      
      // Then print it
      await handlePrintInvoice();
      
      toast.success('Invoice saved and printed successfully');
    } catch (error) {
      console.error('Error in print and save:', error);
      toast.error(`Error: ${error.message || 'Failed to print and save'}`);
    } finally {
      setSavingOrder(false);
    }
  };

  // Function to group dishes by subcategory
  const groupDishesBySubcategory = (dishesList, subcategories) => {
    // Log for debugging
    console.log(`Grouping ${dishesList.length} dishes into ${subcategories.length} subcategories`);
    
    // Create initial groups structure with all subcategories
    const groupedDishes = {};
    
    // First initialize with all available subcategories
    subcategories.forEach(subcategory => {
      if (subcategory && subcategory._id) {
        groupedDishes[subcategory._id] = {
          subcategoryId: subcategory._id,
          subcategoryName: subcategory.subCategoryName,
          dishes: []
        };
      }
    });
    
    // Track dishes that weren't matched
    let unmatched = 0;
    
    // Group dishes into their subcategories
    dishesList.forEach(dish => {
      const subCategoryId = getSubCategoryId(dish);
      
      if (subCategoryId && groupedDishes[subCategoryId]) {
        // Add to appropriate subcategory
        groupedDishes[subCategoryId].dishes.push(dish);
      } else {
        unmatched++;
        // Create or add to "Other" category for dishes without a matching subcategory
        if (!groupedDishes['other']) {
          groupedDishes['other'] = {
            subcategoryId: 'other',
            subcategoryName: 'Other Items',
            dishes: []
          };
        }
        groupedDishes['other'].dishes.push(dish);
      }
    });
    
    // Log results for debugging
    console.log(`Grouped dishes: ${dishesList.length - unmatched} matched, ${unmatched} unmatched`);
    
    return groupedDishes;
  };

  // State for order modes (Dine-in, Delivery, Takeaway)
  const [orderMode, setOrderMode] = useState(initialMode);
  const [initError, setInitError] = useState(null);
  // KOT tracking state - using item IDs instead of array indices
  const [kotSentItems, setKotSentItems] = useState({});
  // State for categories and items
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [tables, setTables] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [dishesGroupedBySubcategory, setDishesGroupedBySubcategory] = useState({});
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Search state
  const [categorySearch, setCategorySearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [dietFilter, setDietFilter] = useState('all'); // 'all', 'veg', 'non-veg', 'egg'
  // Currently selected table
  const [selectedTable, setSelectedTable] = useState(null);
  // Notification state
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  // Current order data
  const [currentOrder, setCurrentOrder] = useState({
    orderMode: initialMode,
    customer: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
    numOfPeople: 1,
    table: initialTableId || '',
    itemsSold: [],
    taxDetails: [
      { taxName: 'GST 5%', taxRate: 5, taxAmount: 0 },
      { taxName: 'Service Tax', taxRate: 2.5, taxAmount: 0 }
    ],
    discount: {
      discountType: 'percentage',
      discountPercentage: 0,
      discountValue: 0,
      discountReason: '',
    },
    deliveryCharge: initialMode.includes('Delivery') ? 40 : 0,
    packagingCharge: (initialMode.includes('Takeaway') || initialMode.includes('Delivery')) ? 20 : 0,
    payment: [
      { method: 'Cash', amount: 0 }
    ],
    orderStatus: 'pending',
    subtotalAmount: 0,
    totalTaxAmount: 0,
    totalAmount: 0,
    menu: ''
  });
  // Loading states
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [synchronizing, setSynchronizing] = useState(false);
  // Dialog states
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [openKotDialog, setOpenKotDialog] = useState(false);
  const [openConfirmResetDialog, setOpenConfirmResetDialog] = useState(false);
  const [currentKot, setCurrentKot] = useState(null);
  // Tab value based on the order mode
  const getTabValue = (mode) => {
    if (mode === 'Dine-in') return 0;
    if (mode === 'Delivery') return 1;
    if (mode === 'Takeaway') return 2;
    return 0;
  };
  const [tabValue, setTabValue] = useState(getTabValue(initialMode));
  // Debug state
  const [debugData, setDebugData] = useState({
    initialized: false,
    initialOrderId: initialOrder?._id || 'None',
    initialTableId: initialTableId || 'None',
    loadedMenuItems: 0,
    loadCompleted: false
  });

  // Function to fetch all dishes and apply filters
  const fetchAllDishes = () => {
    console.log("Fetching all available dishes");
    
    // If we already have dishes loaded, just filter and use them
    if (dishes.length > 0) {
      // Apply diet filter if needed
      const filteredWithDiet = dietFilter === 'all' ? dishes : applyDietFilter(dishes);
      
      // Apply search filter if needed
      const searchFiltered = itemSearch 
        ? filteredWithDiet.filter(dish => 
            dish.dishName && dish.dishName.toLowerCase().includes(itemSearch.toLowerCase())
          )
        : filteredWithDiet;
      
      console.log(`Showing all ${searchFiltered.length} available dishes`);
      
      // Update filtered dishes with all available dishes
      setFilteredDishes(searchFiltered);
    } else {
      // If no dishes are loaded yet, try to load them from the selected menu
      if (selectedMenu) {
        console.log("No dishes loaded yet, fetching from selected menu");
        fetchMenuItems(selectedMenu);
      } else {
        console.log("No menu selected, cannot fetch dishes");
      }
    }
  };

  // Function to fetch dishes by subcategory
  const fetchDishesBySubcategory = async (subcategoryId) => {
    if (!subcategoryId) {
      console.log("No subcategory ID provided, showing all dishes");
      fetchAllDishes();
      return;
    }
    
    console.log(`Fetching dishes for subcategory: ${subcategoryId}`);
    setLoadingSubcategories(true);
    
    try {
      // API call to get dishes by subcategory
      const res = await axiosWithAuth.get(`/api/menu/dishes?subcategory=${subcategoryId}`);
      if (res.data.success && res.data.data.length > 0) {
        console.log(`Found ${res.data.data.length} dishes for subcategory ${subcategoryId}`);
        
        // Get the subcategory dishes
        const subcategoryDishes = res.data.data;
        
        // Now find these dishes in our complete dishes list to get pricing
        const dishesWithPricing = dishes.filter(dish => {
          return subcategoryDishes.some(sd => sd._id === dish._id);
        });
        
        console.log(`Matched ${dishesWithPricing.length} dishes with pricing info`);
        
        // Apply diet filter if needed
        const filteredWithDiet = applyDietFilter(dishesWithPricing);
        
        // Apply search filter if needed
        const searchFiltered = itemSearch 
          ? filteredWithDiet.filter(dish => 
              dish.dishName && dish.dishName.toLowerCase().includes(itemSearch.toLowerCase())
            )
          : filteredWithDiet;
        
        // Update filtered dishes with what we found
        setFilteredDishes(searchFiltered);
      } else {
        console.log(`No dishes found for subcategory ${subcategoryId}`);
        setFilteredDishes([]);
      }
    } catch (error) {
      console.error("Error fetching dishes for subcategory:", error);
      // Set empty list as fallback
      setFilteredDishes([]);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Improved order sync function
  const synchronizeOrderStatus = async (orderToSync = null) => {
    const orderId = orderToSync?._id || currentOrder._id;
    if (!orderId) return; // Only for existing orders

    setSynchronizing(true);
    try {
      // 1. Check order status in database
      const orderResponse = await axiosWithAuth.get(`/api/orders/${orderId}`);
      if (!orderResponse.data.success) {
        toast.error("Failed to sync order status - couldn't fetch order");
        return;
      }
      const orderInDb = orderResponse.data.data;
      // 2. Check all KOTs for this order
      const kotsResponse = await axiosWithAuth.get(`/api/orders/kot?orderId=${orderId}`);
      if (!kotsResponse.data.success) {
        toast.error("Failed to sync order status - couldn't fetch KOTs");
        return;
      }
      const kots = kotsResponse.data.data;
      // 3. Determine correct status based on KOTs
      let calculatedStatus = 'pending';
      // If ANY KOT is in 'preparing' status, the order is 'preparing'
      if (kots.some(k => k.kotStatus === 'preparing')) {
        calculatedStatus = 'preparing';
      }
      // If ALL KOTs are in 'ready' or 'completed' status, the order is 'ready'
      if (kots.length > 0 && kots.every(k => ['ready', 'completed'].includes(k.kotStatus))) {
        calculatedStatus = 'ready';
      }
      // If ALL KOTs are in 'completed' status, the order is 'served'
      if (kots.length > 0 && kots.every(k => k.kotStatus === 'completed')) {
        calculatedStatus = 'served';
      }
      // 4. If order status is out of sync, update it
      if (orderInDb.orderStatus !== calculatedStatus) {
        console.log(`Synchronizing order status: ${orderInDb.orderStatus} → ${calculatedStatus}`);
        await axiosWithAuth.put(`/api/orders/${orderId}/status`, {
          status: calculatedStatus
        });
        // Update local state
        setCurrentOrder(prev => ({
          ...prev,
          orderStatus: calculatedStatus
        }));
        toast.success(`Order status synchronized to: ${calculatedStatus}`);
      } else {
        console.log(`Order status already in sync: ${orderInDb.orderStatus}`);
      }
    } catch (error) {
      console.error('Error synchronizing order status:', error);
      toast.error('Failed to synchronize order status');
    } finally {
      setSynchronizing(false);
    }
  };

  // Function to mark items as sent to kitchen using item IDs
  const markItemsAsSent = (items) => {
    const updatedKotSentItems = { ...kotSentItems };
    items.forEach(item => {
      if (item._id) {
        updatedKotSentItems[item._id] = true;
      }
    });
    setKotSentItems(updatedKotSentItems);

    // Also save this state to localStorage if we have a table
    if (currentOrder.table) {
      saveOrderToLocalStorage(currentOrder.table, {
        ...currentOrder,
        _kotSentItems: updatedKotSentItems
      });
    }
  };

  // Function to get items that haven't been sent to kitchen yet
  const getUnsentItems = () => {
    return currentOrder.itemsSold.filter(item => !kotSentItems[item._id]);
  };

  // Initialize data
  useEffect(() => {
    console.log("SalesRegister component initializing with:", {
      initialTableId,
      initialOrder: initialOrder ? `ID: ${initialOrder._id}` : 'None',
      initialMode
    });
    const initData = async () => {
      setLoading(true);
      try {
        // Create a safe default order state that won't break if things fail
        const safeDefaultOrder = {
          orderMode: initialMode,
          customer: {
            name: '',
            phone: '',
            email: '',
            address: '',
          },
          numOfPeople: 1,
          table: initialTableId || '',
          itemsSold: [],
          taxDetails: [
            { taxName: 'GST 5%', taxRate: 5, taxAmount: 0 },
            { taxName: 'Service Tax', taxRate: 2.5, taxAmount: 0 }
          ],
          discount: {
            discountType: 'percentage',
            discountPercentage: 0,
            discountValue: 0,
            discountReason: '',
          },
          deliveryCharge: initialMode.includes('Delivery') ? 40 : 0,
          packagingCharge: (initialMode.includes('Takeaway') || initialMode.includes('Delivery')) ? 20 : 0,
          payment: [
            { method: 'Cash', amount: 0 }
          ],
          orderStatus: 'pending',
          subtotalAmount: 0,
          totalTaxAmount: 0,
          totalAmount: 0,
          menu: ''
        };
        
        // Set initial safe state
        setCurrentOrder(safeDefaultOrder);
        
        // Fetch initial data
        await Promise.all([
          fetchCategories(),
          fetchSubCategories(),
          fetchTables(),
          fetchMenus(initialMode)
        ]);
        
        // Set initial order mode
        setOrderMode(initialMode);
        
        // Set selected table
        if (initialTableId) {
          const tableObj = tables.find(t => t._id === initialTableId);
          if (tableObj) {
            console.log("Setting selected table:", tableObj);
            setSelectedTable(tableObj);
            setCurrentOrder(prev => ({
              ...prev,
              table: initialTableId
            }));
          }
        }

        // Check localStorage for existing order data as a fallback
        if (initialTableId) {
          const savedOrder = getOrderFromLocalStorage(initialTableId);
          console.log("Checking localStorage for saved order:", savedOrder);
          
          // If we have a saved order with items, and no initialOrder (or an empty one)
          if (savedOrder && savedOrder.itemsSold && savedOrder.itemsSold.length > 0 && 
              (!initialOrder || initialOrder.itemsSold?.length === 0)) {
            console.log("Using saved order from localStorage instead");
            
            // Restore KOT sent items state if available
            if (savedOrder._kotSentItems) {
              setKotSentItems(savedOrder._kotSentItems);
              // Remove the property before using the order
              delete savedOrder._kotSentItems;
            }
            
            // Ensure all items have unique IDs
            const itemsWithIds = (savedOrder.itemsSold || []).map(item => {
              if (!item._id) {
                return {
                  ...item,
                  _id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                };
              }
              return item;
            });
            
            // Create a properly merged order object
            const mergedOrder = {
              // Start with our safe default structure
              ...safeDefaultOrder,
              // Then apply the savedOrder values
              ...savedOrder,
              // Make sure these specific properties are correctly set
              orderMode: initialMode,
              table: initialTableId,
              // Use items with guaranteed IDs
              itemsSold: itemsWithIds
            };
            
            console.log("Setting merged order from localStorage:", mergedOrder);
            setCurrentOrder(mergedOrder);
            
            // Set selected menu based on the saved order
            if (savedOrder.menu) {
              setSelectedMenu(savedOrder.menu);
              await fetchMenuItems(savedOrder.menu);
            }
            
            // Set notification
            setNotification({
              open: true,
              message: 'Recovered order from local storage',
              severity: 'info'
            });
          } else {
            // Load existing order if provided
            if (initialOrder) {
              try {
                console.log("Loading initial order:", initialOrder);
                
                // Validate the order structure to prevent null reference errors
                if (!initialOrder.itemsSold) {
                  console.warn("Order is missing itemsSold array, using empty array");
                  initialOrder.itemsSold = [];
                }
                
                if (!initialOrder.customer) {
                  console.warn("Order is missing customer object, using default");
                  initialOrder.customer = {
                    name: 'Guest',
                    phone: '',
                    email: '',
                    address: ''
                  };
                }
                
                // Ensure all items have unique IDs
                const itemsWithIds = (initialOrder.itemsSold || []).map(item => {
                  if (!item._id) {
                    return {
                      ...item,
                      _id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                    };
                  }
                  return item;
                });
                
                // Create a properly merged order object that keeps the structure
                const mergedOrder = {
                  // Start with our safe default structure
                  ...safeDefaultOrder,
                  // Then apply the initialOrder values, but only if they exist
                  ...initialOrder,
                  // Make sure these specific properties are correctly set
                  _id: initialOrder._id, // Preserve the order ID
                  orderMode: initialMode,
                  table: initialTableId || initialOrder.table,
                  menu: initialOrder.menu || safeDefaultOrder.menu,
                  // Use items with guaranteed IDs
                  itemsSold: itemsWithIds
                };
                
                console.log("Setting merged order state:", mergedOrder);
                setCurrentOrder(mergedOrder);
                
                // Since this is an existing order, assume all current items
                // have already been sent to the kitchen
                const initialKotSentItems = {};
                itemsWithIds.forEach(item => {
                  if (item._id) {
                    initialKotSentItems[item._id] = true;
                  }
                });
                setKotSentItems(initialKotSentItems);
                
                // Save to localStorage for future reference
                if (initialTableId) {
                  saveOrderToLocalStorage(initialTableId, {
                    ...mergedOrder,
                    _kotSentItems: initialKotSentItems
                  });
                }
                
                // Set selected menu based on the existing order
                if (initialOrder.menu) {
                  setSelectedMenu(initialOrder.menu);
                  await fetchMenuItems(initialOrder.menu);
                }
                
                // Set notification
                setNotification({
                  open: true,
                  message: 'Existing order loaded',
                  severity: 'info'
                });
                
                // Synchronize order status
                setTimeout(() => {
                  synchronizeOrderStatus(mergedOrder);
                }, 1000);
              } catch (orderError) {
                console.error("Error processing initial order:", orderError);
                setInitError("Error loading order data. Some items may be missing.");
                // Continue with basic initialization
              }
            }
          }
        }
        
        setDebugData(prev => ({
          ...prev,
          initialized: true,
          loadCompleted: true
        }));
      } catch (error) {
        console.error('Error initializing data:', error);
        setInitError(`Error loading data: ${error.message || 'Unknown error'}`);
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, [initialTableId, initialOrder, initialMode]);

  // Save to localStorage when order changes
  useEffect(() => {
    // Save order to localStorage whenever it changes
    if (currentOrder && currentOrder.table && (currentOrder.itemsSold?.length > 0 || currentOrder._id)) {
      saveOrderToLocalStorage(currentOrder.table, {
        ...currentOrder,
        _kotSentItems: kotSentItems // Save KOT tracking state too
      });
    }
  }, [currentOrder, kotSentItems]);

  // Expose component for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.currentSalesRegister = {
        setCurrentOrder: setCurrentOrder,
        getCurrentOrder: () => currentOrder,
        getKotSentItems: () => kotSentItems,
        reloadMenu: (menuId) => fetchMenuItems(menuId),
        synchronizeOrderStatus: synchronizeOrderStatus
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.currentSalesRegister;
      }
    };
  }, [currentOrder, kotSentItems]);

  // Make sure we still fetch menu items when the menu changes
  useEffect(() => {
    if (selectedMenu) {
      fetchMenuItems(selectedMenu);
    }
  }, [selectedMenu]);

  // Handle order mode change
  useEffect(() => {
    // If there's an initialTableId, we should keep the order mode as Dine-in
    if (initialTableId && orderMode !== 'Dine-in') {
      setOrderMode('Dine-in');
      return;
    }
    
    // Update order mode in current order
    setCurrentOrder(prev => ({
      ...prev,
      orderMode,
      // Reset table if not dine-in
      table: orderMode === 'Dine-in' ? (initialTableId || prev.table) : null,
      // Add delivery charge if delivery
      deliveryCharge: orderMode.includes('Delivery') ? 40 : 0,
      // Add packaging charge if takeaway or delivery
      packagingCharge: orderMode.includes('Takeaway') || orderMode.includes('Delivery') ? 20 : 0,
    }));
    
    // Update menus based on order mode
    fetchMenus(orderMode);
  }, [orderMode, initialTableId]);

  // Recalculate totals when items, discounts, or charges change
  useEffect(() => {
    calculateTotals();
  }, [
    currentOrder.itemsSold,
    currentOrder.discount.discountPercentage,
    currentOrder.discount.discountType,
    currentOrder.deliveryCharge,
    currentOrder.packagingCharge
  ]);

  // Add an effect to ensure we show all dishes initially
  useEffect(() => {
    if (dishes.length > 0 && !selectedSubCategory) {
      fetchAllDishes();
    }
  }, [dishes.length, dietFilter, itemSearch]);

  // Add useEffect to handle search and diet filter changes
  useEffect(() => {
    if (selectedSubCategory) {
      // If a subcategory is selected, refetch with current filters
      fetchDishesBySubcategory(selectedSubCategory);
    } else {
      // Otherwise just apply filters to all dishes
      fetchAllDishes();
    }
  }, [dietFilter, itemSearch]);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch all subcategories directly
  const fetchSubCategories = async (categoryId = null) => {
    try {
      setLoadingSubcategories(true);
      let url = '/api/menu/subcategories';
      if (categoryId) {
        url += `?category=${categoryId}`;
      }
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setSubCategories(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Fetch tables
  const fetchTables = async () => {
    try {
      const res = await axiosWithAuth.get('/api/tables');
      if (res.data.success) {
        setTables(res.data.data.filter(table => table.status));
        // If initialTableId is provided, find and set it
        if (initialTableId) {
          const table = res.data.data.find(t => t._id === initialTableId);
          if (table) {
            setSelectedTable(table);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  // Fetch menus
  const fetchMenus = async (modeOverride) => {
    try {
      const mode = modeOverride || orderMode;
      const url = mode
        ? `/api/menu/menus?mode=${mode}&strictMode=true`
        : '/api/menu/menus';
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setMenus(res.data.data);
        // If there's a default menu for this mode, select it
        const defaultMenu = res.data.data.find(menu => menu.isDefault);
        if (defaultMenu) {
          setSelectedMenu(defaultMenu._id);
          setCurrentOrder(prev => ({
            ...prev,
            menu: defaultMenu._id
          }));
          fetchMenuItems(defaultMenu._id);
        } else if (res.data.data.length > 0) {
          // If no default but menus exist, select the first one
          setSelectedMenu(res.data.data[0]._id);
          setCurrentOrder(prev => ({
            ...prev,
            menu: res.data.data[0]._id
          }));
          fetchMenuItems(res.data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  // Enhanced fetchMenuItems function that ensures dishes are always loaded and visible
  const fetchMenuItems = async (menuId) => {
    if (!menuId) return;
    
    console.log(`Fetching menu items for menu ID: ${menuId}`);
    try {
      const res = await axiosWithAuth.get(`/api/menu/pricing?menu=${menuId}`);
      if (res.data.success) {
        console.log(`Successfully fetched ${res.data.data.length} menu items`);
        
        // Format dishes with pricing information
        const dishesWithPricing = res.data.data.map(item => {
          return {
            ...item.dish,
            price: item.price,
            finalPrice: item.finalPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            taxSlab: item.taxSlab,
            variant: item.variant,
            menuPricingId: item._id,
            isAvailable: item.isAvailable,
            // Ensure we have the subcategory information properly mapped
            subCategory: item.dish.subCategory,
            // Also ensure category information is available for filtering
            category: item.dish.category || item.category
          };
        });
        
        // Filter out unavailable items
        const availableDishes = dishesWithPricing.filter(dish => dish.isAvailable !== false);
        console.log(`Found ${availableDishes.length} available dishes`);
        
        // ALWAYS set both the dishes and filteredDishes to ensure something displays
        setDishes(availableDishes);
        
        // If diet filter is active, apply it
        const dietFiltered = dietFilter === 'all' ? availableDishes : applyDietFilter(availableDishes);
        
        // Apply search filter if needed
        const searchFiltered = itemSearch 
          ? dietFiltered.filter(dish => 
              dish.dishName && dish.dishName.toLowerCase().includes(itemSearch.toLowerCase())
            ) 
          : dietFiltered;
        
        // CRITICAL: Always update filteredDishes regardless of category selection
        setFilteredDishes(searchFiltered);
        console.log(`Set filtered dishes to ${searchFiltered.length} items`);
        
        // If a subcategory was previously selected, refresh those dishes
        if (selectedSubCategory) {
          console.log(`Refreshing dishes for selected subcategory: ${selectedSubCategory}`);
          // Call fetchDishesBySubcategory again to refresh with new data
          fetchDishesBySubcategory(selectedSubCategory);
        }
      } else {
        console.error("API returned success: false when fetching menu items");
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      // If there's an error, at least show any dishes we already have
      if (dishes.length > 0) {
        setFilteredDishes(dishes);
      }
    }
  };

  // Helper function to apply diet type filter
  const applyDietFilter = (dishesToFilter) => {
    if (dietFilter === 'all') {
      return dishesToFilter;
    }
    return dishesToFilter.filter(dish => {
      // Handle null/undefined case
      if (!dish.dieteryTag) {
        // Default to veg if not specified
        return dietFilter === 'veg';
      }
      switch(dietFilter) {
        case 'veg':
          return dish.dieteryTag === 'veg';
        case 'non-veg':
          return dish.dieteryTag === 'non veg';
        case 'egg':
          return dish.dieteryTag === 'egg';
        default:
          return true;
      }
    });
  };

  // Handle menu change
  const handleMenuChange = (menuId) => {
    setSelectedMenu(menuId);
    setCurrentOrder(prev => ({
      ...prev,
      menu: menuId
    }));
    fetchMenuItems(menuId);
  };

  // Handle table selection
  const handleTableSelect = (tableId) => {
    const table = tables.find(t => t._id === tableId);
    setSelectedTable(table);
    setCurrentOrder(prev => ({
      ...prev,
      table: tableId
    }));
  };

  // Add dish to order with unique ID
  const addDishToOrder = (dish) => {
    if (!currentOrder.menu) {
      toast.error('Please select a menu first');
      return;
    }
    
    // Check if dish already exists in order
    const existingItemIndex = currentOrder.itemsSold.findIndex(
      item => item.dish === dish._id &&
      (item.variant === (dish.variant?._id || null) || (!item.variant && !dish.variant))
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if dish already exists
      const updatedItems = [...currentOrder.itemsSold];
      updatedItems[existingItemIndex].quantity += 1;
      setCurrentOrder(prev => ({
        ...prev,
        itemsSold: updatedItems
      }));
    } else {
      // Add new item with a unique ID
      const newItemId = `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newItem = {
        _id: newItemId,
        dish: dish._id,
        dishName: dish.dishName,
        variant: dish.variant?._id || null,
        variantName: dish.variant?.variantName || '',
        quantity: 1,
        price: dish.price || 0,
        addOns: [],
        notes: ''
      };
      setCurrentOrder(prev => ({
        ...prev,
        itemsSold: [...prev.itemsSold, newItem]
      }));
    }
  };

  // Update item quantity
  const updateItemQuantity = (index, change) => {
    const updatedItems = [...currentOrder.itemsSold];
    const newQuantity = updatedItems[index].quantity + change;
    
    if (newQuantity <= 0) {
      // Get the item ID
      const itemToRemove = updatedItems[index];
      // Remove item if quantity is zero or negative
      updatedItems.splice(index, 1);
      // Remove the item ID from kotSentItems if it exists
      if (itemToRemove._id && kotSentItems[itemToRemove._id]) {
        const updatedKotSentItems = { ...kotSentItems };
        delete updatedKotSentItems[itemToRemove._id];
        setKotSentItems(updatedKotSentItems);
      }
    } else {
      updatedItems[index].quantity = newQuantity;
    }
    
    setCurrentOrder(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  // Remove item
  const removeItem = (index) => {
    const updatedItems = [...currentOrder.itemsSold];
    const itemToRemove = updatedItems[index];
    
    // Remove the item
    updatedItems.splice(index, 1);
    
    // Remove the item ID from kotSentItems if it exists
    if (itemToRemove._id && kotSentItems[itemToRemove._id]) {
      const updatedKotSentItems = { ...kotSentItems };
      delete updatedKotSentItems[itemToRemove._id];
      setKotSentItems(updatedKotSentItems);
    }
    
    setCurrentOrder(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  // Add note to item
  const addNoteToItem = (index, note) => {
    const updatedItems = [...currentOrder.itemsSold];
    updatedItems[index].notes = note;
    setCurrentOrder(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  // Calculate order totals
  const calculateTotals = () => {
    // Calculate subtotal
    let subtotal = currentOrder.itemsSold.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      // Add addon prices if any
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach(addon => {
          itemTotal += addon.price || 0;
        });
      }
      return sum + itemTotal;
    }, 0);
    
    // Calculate taxes
    const taxes = currentOrder.taxDetails.map(tax => {
      const taxAmount = (subtotal * tax.taxRate) / 100;
      return {
        ...tax,
        taxAmount
      };
    });
    const totalTax = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);
    
    // Calculate discount
    let discountAmount = 0;
    if (currentOrder.discount.discountType === 'percentage') {
      discountAmount = (subtotal * currentOrder.discount.discountPercentage) / 100;
    } else {
      discountAmount = currentOrder.discount.discountValue;
    }
    
    // Calculate total
    const total = subtotal + totalTax + currentOrder.deliveryCharge + currentOrder.packagingCharge - discountAmount;
    
    // Update payment amount if only one payment method
    let updatedPayment = [...currentOrder.payment];
    if (updatedPayment.length === 1) {
      updatedPayment[0].amount = parseFloat(total.toFixed(2));
    }
    
    // Update order data with calculations
    setCurrentOrder(prev => ({
      ...prev,
      subtotalAmount: parseFloat(subtotal.toFixed(2)),
      totalTaxAmount: parseFloat(totalTax.toFixed(2)),
      taxDetails: taxes,
      discount: {
        ...prev.discount,
        discountValue: parseFloat(discountAmount.toFixed(2))
      },
      totalAmount: parseFloat(total.toFixed(2)),
      payment: updatedPayment
    }));
  };

  // Handle discount change
  const handleDiscountChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setCurrentOrder(prev => ({
      ...prev,
      discount: {
        ...prev.discount,
        discountPercentage: numValue,
        discountValue: (prev.subtotalAmount * numValue) / 100
      }
    }));
  };

  // Handle customer details
  const handleCustomerChange = (field, value) => {
    setCurrentOrder(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value
      }
    }));
  };

  // Handle order mode tabs
  const handleOrderModeChange = (event, newValue) => {
    // If we're in table view with initialTableId, don't allow changing order mode
    if (initialTableId) {
      toast.info('Cannot change order mode when editing a table order');
      return;
    }
    const modes = ['Dine-in', 'Delivery', 'Takeaway'];
    setOrderMode(modes[newValue]);
    setTabValue(newValue);
  };

  // Handle specific order ID loading
  const handleLoadOrder = (orderId) => {
    // Update URL with the found order ID
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('orderId', orderId);
      window.history.replaceState({}, '', url);
      window.location.reload();
    }
  };

  // KOT success handler
  const handleKotSuccess = async (kot) => {
    setCurrentKot(kot);
    toast.success('KOT operation completed successfully');
    try {
      if (kot && kot.salesOrder) {
        const orderId = typeof kot.salesOrder === 'string' ? kot.salesOrder : kot.salesOrder._id;
        // Just update the ID, keeping ALL current items
        setCurrentOrder(prev => ({
          ...prev,
          _id: orderId
        }));
        // Save to localStorage
        if (currentOrder.table) {
          const savedOrder = {
            ...currentOrder,
            _id: orderId,
            _kotSentItems: kotSentItems // Store which items have been sent to kitchen
          };
          saveOrderToLocalStorage(currentOrder.table, savedOrder);
        }
        // Update URL with order ID for persistence
        if (typeof window !== 'undefined') {
          const url = new URL(window.location);
          url.searchParams.set('orderId', orderId);
          window.history.replaceState({}, '', url);
        }
        if (onOrderUpdate) {
          onOrderUpdate({
            ...currentOrder,
            _id: orderId
          });
        }
        // Synchronize order status
        setTimeout(() => {
          synchronizeOrderStatus();
        }, 1000);
      }
    } catch (error) {
      console.error('Error after KOT generation:', error);
    }
  };

  // Function to help generate new KOT
  const handleGenerateKOT = async () => {
    // Get only the items that haven't been sent to kitchen
    const unsentItems = getUnsentItems();
    if (unsentItems.length === 0) {
      toast.error('No new items to send to kitchen');
      return;
    }
    
    // Create a copy of the current order with only unsent items
    const kotOrder = {
      ...currentOrder,
      itemsSold: unsentItems
    };
    
    try {
      // Generate KOT with only new items
      const result = await KOTService.generateKOT(kotOrder);
      if (result.success) {
        // Mark all current items as sent to kitchen
        markItemsAsSent(unsentItems);
        // Call handleKotSuccess with the result
        handleKotSuccess(result.data);
      } else {
        toast.error(result.message || 'Failed to generate KOT');
      }
    } catch (error) {
      console.error('Error generating KOT:', error);
      toast.error(`Error: ${error.message || 'Failed to generate KOT'}`);
    }
  };

  // Function to print KOT
  const handlePrintKOT = async () => {
    // Get only the items that haven't been sent to kitchen
    const unsentItems = getUnsentItems();
    if (unsentItems.length === 0) {
      toast.error('No new items to send to kitchen');
      return;
    }
    
    // Create a copy of the current order with only unsent items
    const kotOrder = {
      ...currentOrder,
      itemsSold: unsentItems
    };
    
    try {
      // Generate and print KOT with only new items
      const result = await KOTService.generateKOT(kotOrder);
      if (result.success) {
        // Print the KOT
        await KOTService.printKOT(result.data);
        // Mark all items as sent to kitchen
        markItemsAsSent(unsentItems);
        // Call handleKotSuccess with the result
        handleKotSuccess(result.data);
      } else {
        toast.error(result.message || 'Failed to generate KOT');
      }
    } catch (error) {
      console.error('Error generating KOT:', error);
      toast.error(`Error: ${error.message || 'Failed to generate KOT'}`);
    }
  };

  // Handle order reset/cancel
  const resetOrder = () => {
    setOpenConfirmResetDialog(true);
  };

  // Execute order reset after confirmation
  const executeOrderReset = async () => {
    setOpenConfirmResetDialog(false);
    
    // If this is a dine-in order with a table and an existing order ID,
    // we should first check if we need to release the table
    if (currentOrder.orderMode === 'Dine-in' && currentOrder.table && currentOrder._id) {
      try {
        // Check if there are any completed payments
        const hasCompletedPayment = currentOrder.payment && currentOrder.payment.some(p => p.amount > 0);
        
        // If payments were made, release the table
        if (hasCompletedPayment) {
          await axiosWithAuth.put(`/api/tables/${currentOrder.table}/status`, {
            status: 'available'
          });
          console.log(`Table ${currentOrder.table} released after reset`);
        }
      } catch (error) {
        console.error('Error releasing table during reset:', error);
      }
    }
    
    // Reset the form
    setCurrentOrder({
      orderMode: orderMode,
      customer: {
        name: '',
        phone: '',
        email: '',
        address: '',
      },
      numOfPeople: 1,
      table: initialTableId || (orderMode === 'Dine-in' ? currentOrder.table : ''),
      itemsSold: [],
      taxDetails: [
        { taxName: 'GST 5%', taxRate: 5, taxAmount: 0 },
        { taxName: 'Service Tax', taxRate: 2.5, taxAmount: 0 }
      ],
      discount: {
        discountType: 'percentage',
        discountPercentage: 0,
        discountValue: 0,
        discountReason: '',
      },
      deliveryCharge: orderMode.includes('Delivery') ? 40 : 0,
      packagingCharge: orderMode.includes('Takeaway') || orderMode.includes('Delivery') ? 20 : 0,
      payment: [
        { method: 'Cash', amount: 0 }
      ],
      orderStatus: 'pending',
      subtotalAmount: 0,
      totalTaxAmount: 0,
      totalAmount: 0,
      menu: selectedMenu
    });
    
    // Reset KOT tracking
    setKotSentItems({});
    
    // Clear from localStorage if we have a tableId
    if (initialTableId) {
      try {
        localStorage.removeItem(`table_order_${initialTableId}`);
      } catch (error) {
        console.error("Error clearing localStorage:", error);
      }
    }
    
    // Notify parent about the reset
    if (onOrderUpdate) {
      onOrderUpdate(null);
    }
    
    // Remove order ID from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('orderId');
      window.history.replaceState({}, '', url);
    }
    
    toast.success('Order has been reset');
  };

  // Debug info for development - remove in production
  console.log('SalesRegister Render Status:', {
    selectedCategory,
    categoryName: categories.find(c => c._id === selectedCategory)?.categoryName || 'None',
    subcategories: subCategories.length,
    allDishes: dishes.length,
    filteredDishes: filteredDishes.length,
    groupedDishes: Object.keys(dishesGroupedBySubcategory).length
  });

  return (
    <Box sx={{ flexGrow: 1 }}>
      {initError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setInitError(null)}
        >
          {initError}
        </Alert>
      )}
      
      {/* Active table warning for missed orders */}
      <ActiveTableWarning
        tableId={initialTableId}
        orderId={currentOrder._id}
        onOrderLoad={handleLoadOrder}
      />
      
      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Header bar with logo, order mode, and table selection */}
      <Paper elevation={1} sx={{ mb: 2, p: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={2}>
            <Typography variant="h5" component="div" fontWeight="bold">
              LOGO
            </Typography>
          </Grid>
          <Grid item xs={6}>
            {/* Disable changing order mode when we have initialTableId */}
            <Tabs
              value={tabValue}
              onChange={handleOrderModeChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
              sx={{ pointerEvents: initialTableId ? 'none' : 'auto', opacity: initialTableId ? 0.8 : 1 }}
            >
              <Tab
                icon={<DiningIcon />}
                label="DINE IN"
                sx={{ backgroundColor: tabValue === 0 ? 'primary.light' : 'grey.300' }}
              />
              <Tab
                icon={<DeliveryIcon />}
                label="DELIVERY"
                sx={{ backgroundColor: tabValue === 1 ? 'primary.light' : 'grey.300' }}
              />
              <Tab
                icon={<TakeawayIcon />}
                label="TAKEAWAY"
                sx={{ backgroundColor: tabValue === 2 ? 'primary.light' : 'grey.300' }}
              />
            </Tabs>
            {initialTableId && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                Order mode locked for table editing
              </Typography>
            )}
          </Grid>
          <Grid item xs={4}>
            <Box display="flex" alignItems="center" gap={1}>
              <FormControl fullWidth size="small">
                <InputLabel id="menu-select-label">SELECT MENU</InputLabel>
                <Select
                  labelId="menu-select-label"
                  value={selectedMenu}
                  onChange={(e) => handleMenuChange(e.target.value)}
                  label="SELECT MENU"
                >
                  {menus.map((menu) => (
                    <MenuItem key={menu._id} value={menu._id}>
                      {menu.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={() => setOpenCustomerDialog(true)}
                title="Guest Details"
              >
                <PersonIcon />
              </IconButton>
              <IconButton
                color="primary"
                onClick={() => synchronizeOrderStatus()}
                disabled={synchronizing || !currentOrder._id}
                title="Sync Status"
              >
                {synchronizing ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        {/* Table selection row (only for dine-in) */}
        {orderMode === 'Dine-in' && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
            {/* Don't show "ALL" button when we have initialTableId */}
            {!initialTableId && (
              <Button
                variant={!selectedTable ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedTable(null)}
                startIcon={<TableIcon />}
              >
                ALL
              </Button>
            )}
            {tables.map((table) => (
              <Button
                key={table._id}
                variant={(initialTableId && initialTableId === table._id) ||
                  (!initialTableId && selectedTable && selectedTable._id === table._id)
                  ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleTableSelect(table._id)}
                disabled={initialTableId && initialTableId !== table._id} // Disable other tables when initialTableId is set
              >
                TABLE {table.tableName}
              </Button>
            ))}
          </Box>
        )}
      </Paper>
      
      {/* Main content grid */}
      <Grid container spacing={2}>
        {/* Left sidebar - Categories with Accordion */}
        <Grid item xs={2}>
          <CategorySidebar
            categories={categories}
            subCategories={subCategories}
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            setSelectedCategory={setSelectedCategory}
            setSelectedSubCategory={setSelectedSubCategory}
            categorySearch={categorySearch}
            setCategorySearch={setCategorySearch}
            fetchSubCategories={fetchSubCategories}
            loadingSubcategories={loadingSubcategories}
            fetchDishesBySubcategory={fetchDishesBySubcategory}
            fetchAllDishes={fetchAllDishes}
          />
        </Grid>
        
        {/* Middle - Items grid - shows all items by default, subcategory items when selected */}
        <Grid item xs={7}>
          <Paper sx={{ height: 'calc(100vh - 170px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Search and filters */}
            <Box p={1} display="flex" gap={1}>
              <TextField
                fullWidth
                placeholder="ITEM SEARCH INPUT"
                variant="outlined"
                size="small"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  // Search will be applied in the useEffect that watches itemSearch
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Divider />
            
            {/* Item filters (veg, non-veg, etc) */}
            <Box display="flex" justifyContent="flex-end" p={1}>
              <Chip
                label="VEG"
                color="success"
                variant={dietFilter === 'veg' ? 'filled' : 'outlined'}
                sx={{ mr: 1 }}
                onClick={() => setDietFilter('veg')}
                clickable
              />
              <Chip
                label="NON-VEG"
                color="error"
                variant={dietFilter === 'non-veg' ? 'filled' : 'outlined'}
                sx={{ mr: 1 }}
                onClick={() => setDietFilter('non-veg')}
                clickable
              />
              <Chip
                label="EGG"
                color="warning"
                variant={dietFilter === 'egg' ? 'filled' : 'outlined'}
                sx={{ mr: 1 }}
                onClick={() => setDietFilter('egg')}
                clickable
              />
              <Chip
                label="ALL"
                color="primary"
                variant={dietFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setDietFilter('all')}
                clickable
              />
            </Box>
            <Divider />
            
            {/* Loading indicator */}
            {loadingSubcategories && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={30} />
              </Box>
            )}
            
            {/* Title showing current selection */}
            {selectedSubCategory && !loadingSubcategories && (
              <Box p={2} sx={{ backgroundColor: 'grey.100' }}>
                <Typography variant="h6">
                  {subCategories.find(sc => sc._id === selectedSubCategory)?.subCategoryName || 'Selected Subcategory'}
                </Typography>
              </Box>
            )}
            
            {/* Items grid - Shows all dishes or filtered by subcategory */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
              {filteredDishes.length === 0 && !loadingSubcategories ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="h6" color="text.secondary">
                    No items found
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredDishes.map((dish) => (
                    <Grid item xs={12} sm={6} md={4} key={`${dish._id}-${dish.variant?._id || 'main'}`}>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'grey.100' },
                          display: 'flex',
                          height: '100%'
                        }}
                        onClick={() => addDishToOrder(dish)}
                      >
                        <Box sx={{ mr: 2, width: 60, height: 60, bgcolor: 'grey.200', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 1 }}>
                          {dish.image ? (
                            <img src={dish.image} alt={dish.dishName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                          ) : (
                            <DiningIcon color="primary" fontSize="large" />
                          )}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                            {dish.dishName}
                            {dish.variant && ` - ${dish.variant.variantName}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {dish.variant ? 'NO PRICE (IF VARIANT)' : `₹${dish.price?.toFixed(2)}`}
                          </Typography>
                          <Chip
                            size="small"
                            label={dish.dieteryTag || 'veg'}
                            color={dish.dieteryTag === 'non veg' ? 'error' : dish.dieteryTag === 'egg' ? 'warning' : 'success'}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
            
            {/* KOT Buttons */}
            <Box p={1} display="flex" justifyContent="space-between" borderTop="1px solid" borderColor="divider">
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleGenerateKOT}
                disabled={getUnsentItems().length === 0}
              >
                SAVE KOT {getUnsentItems().length > 0 ? `(${getUnsentItems().length})` : ''}
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrintKOT}
                disabled={getUnsentItems().length === 0}
              >
                PRINT KOT {getUnsentItems().length > 0 ? `(${getUnsentItems().length})` : ''}
              </Button>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => setOpenKotDialog(true)}
              >
                VIEW KOT
              </Button>
              <Button
                variant="outlined"
                startIcon={<ReceiptIcon />}
                onClick={() => {
                  toast.info('Invoice printing functionality');
                }}
              >
                PRINT INVOICE
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Right sidebar - Cart and checkout */}
        <Grid item xs={3}>
          <Paper sx={{ height: 'calc(100vh - 170px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Order items list */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <CartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Order Items
              </Typography>
              {currentOrder.itemsSold.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="150px">
                  <Typography variant="body2" color="text.secondary">
                    No items added yet. Click on items to add them to your order.
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {currentOrder.itemsSold.map((item, index) => (
                    <ListItem
                      key={`${item._id || `${item.dish}-${item.variant || 'main'}-${index}`}`}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        p: 1,
                        // Add visual indicator for items sent to kitchen
                        bgcolor: kotSentItems[item._id] ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                      }}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => removeItem(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" fontWeight="bold">
                              {item.dishName}
                              {item.variantName && ` - ${item.variantName}`}
                            </Typography>
                            {kotSentItems[item._id] && (
                              <Chip
                                size="small"
                                label="Sent"
                                color="success"
                                variant="outlined"
                                sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              ₹{item.price.toFixed(2)}
                            </Typography>
                            {item.notes && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Note: {item.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Box display="flex" alignItems="center" ml={1}>
                        <IconButton size="small" onClick={() => updateItemQuantity(index, -1)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => updateItemQuantity(index, 1)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
            
            {/* Order summary */}
            <Box p={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="h6" gutterBottom>
                NET TOTAL: ₹{currentOrder.totalAmount.toFixed(2)}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ExpandLessIcon />}
                  onClick={() => setOpenSummaryDialog(true)}
                >
                  SUMMARY
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PaymentIcon />}
                  onClick={() => setOpenPaymentDialog(true)}
                >
                  PAYMENT
                </Button>
              </Box>
              <Box display="flex" flexDirection="column" gap={1} mb={1}>
              <Button
  fullWidth
  variant="contained"
  color="primary"
  onClick={handleSaveInvoice}
  disabled={savingOrder}
>
  {savingOrder ? 'SAVING...' : 'SAVE INVOICE'}
</Button>
                <Button
  fullWidth
  variant="contained"
  color="secondary"
  onClick={handlePrintAndSave}
  disabled={savingOrder}
>
  {savingOrder ? 'SAVING...' : 'PRINT & SAVE'}
</Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={resetOrder}
                >
                  CANCEL ORDER
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Customer Details Dialog */}
      <Dialog open={openCustomerDialog} onClose={() => setOpenCustomerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Guest Details</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Customer Contact"
              fullWidth
              margin="normal"
              placeholder="INPUT/SELECT CUSTOMER CONTACT"
              value={currentOrder.customer.phone}
              onChange={(e) => handleCustomerChange('phone', e.target.value)}
            />
            <TextField
              label="Customer Name"
              fullWidth
              margin="normal"
              placeholder="INPUT CUSTOMER NAME"
              value={currentOrder.customer.name}
              onChange={(e) => handleCustomerChange('name', e.target.value)}
            />
            {(orderMode === 'Delivery' || orderMode === 'Direct Order-Delivery') && (
              <TextField
                label="Customer Address"
                fullWidth
                margin="normal"
                multiline
                rows={2}
                placeholder="INPUT CUSTOMER ADDRESS"
                value={currentOrder.customer.address}
                onChange={(e) => handleCustomerChange('address', e.target.value)}
              />
            )}
            {orderMode === 'Dine-in' && (
              <TextField
                label="Number of Guests"
                type="number"
                fullWidth
                margin="normal"
                placeholder="INPUT NUMBER OF GUEST IN THE ORDER"
                value={currentOrder.numOfPeople}
                onChange={(e) => setCurrentOrder(prev => ({
                  ...prev,
                  numOfPeople: parseInt(e.target.value) || 1
                }))}
                InputProps={{ inputProps: { min: 1 } }}
              />
            )}
          </Box>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => setOpenCustomerDialog(false)}
          >
            SAVE CUSTOMER
          </Button>
        </DialogContent>
      </Dialog>

      <PaymentDialog 
  open={openPaymentDialog} 
  onClose={() => setOpenPaymentDialog(false)} 
  order={currentOrder} 
  onSuccess={(updatedOrder) => {
    setOpenPaymentDialog(false);
    handleOrderUpdate(updatedOrder);
    toast.success('Payment processed successfully');
  }} 
/>

{/* KOT Dialog */}
<KOTDialog 
  open={openKotDialog}
  onClose={() => setOpenKotDialog(false)}
  order={currentOrder}
  onSuccess={(kot) => {
    setOpenKotDialog(false);
    handleKotSuccess(kot);
  }}
/>

{/* Order Summary Dialog */}
<Dialog
  open={openSummaryDialog}
  onClose={() => setOpenSummaryDialog(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>
    Order Summary
    <IconButton
      onClick={() => setOpenSummaryDialog(false)}
      sx={{ position: 'absolute', right: 8, top: 8 }}
    >
      <Close />
    </IconButton>
  </DialogTitle>
  <DialogContent>
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" gutterBottom>Order Details</Typography>
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Order Mode:</Typography>
            <Typography variant="body2">{currentOrder.orderMode}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Customer:</Typography>
            <Typography variant="body2">{currentOrder.customer?.name || 'Guest'}</Typography>
          </Box>
          {currentOrder.orderMode === 'Dine-in' && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Table:</Typography>
              <Typography variant="body2">
                {selectedTable ? `Table ${selectedTable.tableName}` : 'None'}
              </Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Invoice Number:</Typography>
            <Typography variant="body2">{currentOrder.invoiceNumber || 'Not generated'}</Typography>
          </Box>
          {currentOrder.refNum && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Reference:</Typography>
              <Typography variant="body2">{currentOrder.refNum}</Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Status:</Typography>
            <Typography variant="body2">{currentOrder.orderStatus}</Typography>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" gutterBottom>Financial Details</Typography>
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Subtotal:</Typography>
            <Typography variant="body2">₹{currentOrder.subtotalAmount.toFixed(2)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Tax:</Typography>
            <Typography variant="body2">₹{currentOrder.totalTaxAmount.toFixed(2)}</Typography>
          </Box>
          {currentOrder.discount && currentOrder.discount.discountValue > 0 && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Discount:</Typography>
              <Typography variant="body2" color="error">
                -₹{currentOrder.discount.discountValue.toFixed(2)}
              </Typography>
            </Box>
          )}
          {currentOrder.deliveryCharge > 0 && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Delivery Charge:</Typography>
              <Typography variant="body2">₹{currentOrder.deliveryCharge.toFixed(2)}</Typography>
            </Box>
          )}
          {currentOrder.packagingCharge > 0 && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Packaging Charge:</Typography>
              <Typography variant="body2">₹{currentOrder.packagingCharge.toFixed(2)}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              ₹{currentOrder.totalAmount.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Order Items</Typography>
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
              {currentOrder.itemsSold.map((item, index) => (
                <TableRow key={item._id || index}>
                  <TableCell>{item.dishName}</TableCell>
                  <TableCell>{item.variantName || '-'}</TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">₹{item.price.toFixed(2)}</TableCell>
                  <TableCell align="right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  </DialogContent>
  <DialogActions>
    <Button 
      variant="contained" 
      color="primary" 
      startIcon={<PrintIcon />}
      onClick={() => {
        setOpenSummaryDialog(false);
        handlePrintInvoice();
      }}
    >
      Print Invoice
    </Button>
    <Button 
      onClick={() => setOpenSummaryDialog(false)} 
      color="secondary"
    >
      Close
    </Button>
  </DialogActions>
</Dialog>
      
      {/* Confirm Reset Dialog */}
      <Dialog open={openConfirmResetDialog} onClose={() => setOpenConfirmResetDialog(false)}>
        <DialogTitle>
          <WarningIcon color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Cancel Order?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to cancel this order? All items and changes will be lost.
          </Typography>
          {currentOrder.orderMode === 'Dine-in' && currentOrder.table && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Table Information</AlertTitle>
              If payment was processed, table status will be updated to available.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmResetDialog(false)}>
            Keep Order
          </Button>
          <Button variant="contained" color="error" onClick={executeOrderReset}>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesRegister;
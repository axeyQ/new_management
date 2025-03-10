// src/components/orders/OrderForm.js
'use client';
import { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CardHeader,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  AddCircle as AddCircleIcon,
  TableRestaurant as TableIcon,
  LocalDining as DiningIcon,
  Fastfood as FastfoodIcon,
  Search as SearchIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const paymentMethods = [
  { id: 'Cash', label: 'Cash' },
  { id: 'Credit Card', label: 'Credit Card' },
  { id: 'Debit Card', label: 'Debit Card' },
  { id: 'UPI', label: 'UPI' },
  { id: 'ZomatoPay', label: 'Zomato Pay' },
];

const OrderForm = ({ orderId, onSuccess, onCancel, menuId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const isEditMode = !!orderId;
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);
  const menusRequestId = useRef(0); // To track the latest request

  // Order data
  const [orderData, setOrderData] = useState({
    orderMode: 'Dine-in',
    customer: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
    numOfPeople: 1,
    table: '',
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
    deliveryCharge: 0,
    packagingCharge: 0,
    payment: [
      { method: 'Cash', amount: 0 }
    ],
    orderStatus: 'pending',
    staff: {
      captain: user?._id,
      biller: user?._id,
    },
    subtotalAmount: 0,
    totalTaxAmount: 0,
    totalAmount: 0,
    menu: '', // Added menu field
  });

  // Reference data
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menus, setMenus] = useState([]); // Added menus state
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const [openDebugDialog, setOpenDebugDialog] = useState(false);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [openDiscountDialog, setOpenDiscountDialog] = useState(false);

  // Add-ons state
  const [openAddonsDialog, setOpenAddonsDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [availableAddons, setAvailableAddons] = useState([]);

  // Load data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTables(),
          fetchCategories(),
          fetchDishes(),
          fetchCustomers(),
          fetchMenus(),
        ]);
        if (isEditMode) {
          await fetchOrder();
        }
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing data:', error);
        toast.error('Error loading data');
        setDebugInfo(prev => ({
          ...prev,
          initError: error.message,
          initStack: error.stack
        }));
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, [isEditMode, orderId]);

  // Update filtered dishes when search or category changes
  useEffect(() => {
    filterDishes();
  }, [searchTerm, selectedCategory, selectedSubCategory, dishes]);

  // Recalculate totals when items, discounts, or charges change
  useEffect(() => {
    if (initialized) {
      calculateTotals();
    }
  }, [
    orderData.itemsSold,
    orderData.discount.discountPercentage,
    orderData.discount.discountType,
    orderData.deliveryCharge,
    orderData.packagingCharge,
    initialized
  ]);

  // Load reference data
  const fetchTables = async () => {
    try {
      const res = await axiosWithAuth.get('/api/tables');
      if (res.data.success) {
        setTables(res.data.data.filter(table => table.status));
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      setDebugInfo(prev => ({
        ...prev,
        tablesError: error.message
      }));
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setDebugInfo(prev => ({
        ...prev,
        categoriesError: error.message
      }));
    }
  };

  const fetchSubCategories = async (categoryId) => {
    try {
      const url = categoryId
        ? `/api/menu/subcategories?category=${categoryId}`
        : '/api/menu/subcategories';
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setSubCategories(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setDebugInfo(prev => ({
        ...prev,
        subCategoriesError: error.message
      }));
    }
  };

  const fetchDishes = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/dishes');
      if (res.data.success) {
        setDishes(res.data.data);
        setFilteredDishes(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      setDebugInfo(prev => ({
        ...prev,
        dishesError: error.message
      }));
    }
  };

  const fetchMenus = async (modeOverride) => {
    setLoadingMenus(true);
    try {
        // Fetch menus specifically for the current order mode with strictMode=true
        const mode = modeOverride || orderData.orderMode;
        const url = mode
          ? `/api/menu/menus?mode=${mode}&strictMode=true`
          : '/api/menu/menus';
        
        console.log('Fetching menus from:', url);
        const res = await axiosWithAuth.get(url);
        
        console.log('API Response:', res);
        
        if (res.data.success) {
            setMenus(res.data.data);
            console.log('Fetched menus:', res.data.data);
            
            if (res.data.data.length === 0) {
                console.log('Warning: No menus found for mode:', orderData.orderMode);
                toast.warning(`No menus found for ${orderData.orderMode} mode`);
            }
            
            // If there's a default menu for this mode, select it
            const defaultMenu = res.data.data.find(menu => menu.isDefault);
            if (defaultMenu) {
                console.log('Using default menu:', defaultMenu.name);
                setOrderData(prev => ({
                    ...prev,
                    menu: defaultMenu._id
                }));
                // When menu changes, refresh items with new pricing
                fetchMenuItems(defaultMenu._id);
            } else if (res.data.data.length > 0) {
                // If no default but menus exist, select the first one
                console.log('No default menu found, using first menu:', res.data.data[0].name);
                setOrderData(prev => ({
                    ...prev,
                    menu: res.data.data[0]._id
                }));
                fetchMenuItems(res.data.data[0]._id);
            } else {
                // Clear menu selection if no menus available
                console.log('No menus available, clearing menu selection');
                setOrderData(prev => ({
                    ...prev,
                    menu: ''
                }));
            }
        } else {
            console.error('Menu API returned error:', res.data.message);
            toast.error('Failed to load menus: ' + res.data.message);
        }
    } catch (error) {
        console.error('Error fetching menus:', error);
        console.error('Error details:', error.response?.data || error.message);
        toast.error('Error loading menus: ' + (error.response?.data?.message || error.message));
    } finally {
        setLoadingMenus(false);
    }
};
  const fetchMenuItems = async (menuId) => {
    if (!menuId) return;
    try {
      const res = await axiosWithAuth.get(`/api/menu/pricing?menu=${menuId}`);
      if (res.data.success) {
        // Update available dishes with pricing information
        const dishesWithPricing = res.data.data.map(item => ({
          ...item.dish,
          price: item.price,
          finalPrice: item.finalPrice,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          taxSlab: item.taxSlab,
          variant: item.variant,
          menuPricingId: item._id,
          isAvailable: item.isAvailable
        }));
        // Filter out unavailable items
        const availableDishes = dishesWithPricing.filter(dish => dish.isAvailable !== false);
        setDishes(availableDishes);
        setDebugInfo(prev => ({
          ...prev,
          menuItems: {
            menuId,
            totalItems: res.data.data.length,
            availableItems: availableDishes.length
          }
        }));
        filterDishes(); // Refresh filtered dishes
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setDebugInfo(prev => ({
        ...prev,
        menuItemsError: {
          menuId,
          error: error.message
        }
      }));
    }
  };

  const fetchDishAddons = async (dishId, variantId = null) => {
    if (!dishId || !orderData.menu) return [];
    try {
      let url = `/api/menu/addon-pricing/dish?menuId=${orderData.menu}&dishId=${dishId}`;
      if (variantId) {
        url += `&variantId=${variantId}`;
      }
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        return res.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching dish add-ons:', error);
      setDebugInfo(prev => ({
        ...prev,
        dishAddonsError: {
          dishId,
          variantId,
          error: error.message
        }
      }));
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      // For demo, use mock data since customer API might not be implemented yet
      setCustomers([
        { name: 'John Doe', phone: '9876543210', email: 'john@example.com' },
        { name: 'Jane Smith', phone: '8765432109', email: 'jane@example.com' },
        { name: 'Bob Johnson', phone: '7654321098', email: 'bob@example.com' },
      ]);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrder = async () => {
    try {
      const res = await axiosWithAuth.get(`/api/orders/${orderId}`);
      if (res.data.success) {
        setOrderData(res.data.data);
        setDebugInfo(prev => ({
          ...prev,
          orderDetails: {
            orderMode: res.data.data.orderMode,
            menu: res.data.data.menu
          }
        }));
      } else {
        toast.error('Failed to load order');
        router.push('/dashboard/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Error loading order');
      setDebugInfo(prev => ({
        ...prev,
        orderError: error.message
      }));
      router.push('/dashboard/orders');
    }
  };

  // Filter dishes based on search and category
  const filterDishes = () => {
    if (!dishes || dishes.length === 0) return;
    let filtered = [...dishes];
    if (selectedCategory) {
      // First filter by category
      const subCatsInCategory = subCategories.filter(
        sc => sc.category._id === selectedCategory
      ).map(sc => sc._id);
      filtered = filtered.filter(dish => {
        // Handle both string IDs and object references
        const dishSubCats = (dish.subCategory || []).map(sc =>
          typeof sc === 'string' ? sc : sc._id
        );
        return dishSubCats.some(id => subCatsInCategory.includes(id));
      });
    }
    if (selectedSubCategory) {
      // Then filter by subcategory if selected
      filtered = filtered.filter(dish =>
        (dish.subCategory || []).some(sc => {
          const scId = typeof sc === 'string' ? sc : sc._id;
          return scId === selectedSubCategory;
        })
      );
    }
    if (searchTerm) {
      // Finally filter by search term
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(dish =>
        dish.dishName.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredDishes(filtered);
  };

  // Handle form field changes
  const handleOrderModeChange = (e) => {
    const mode = e.target.value;
    console.log(`Order mode changed to: ${mode}`);
    
    setOrderData(prev => ({
      ...prev,
      orderMode: mode,
      // Reset table if not dine-in
      table: mode === 'Dine-in' ? prev.table : null,
      // Add delivery charge if delivery
      deliveryCharge: mode.includes('Delivery') ? 40 : 0,
      // Add packaging charge if takeaway or delivery
      packagingCharge: mode.includes('Takeaway') || mode.includes('Delivery') ? 20 : 0,
      // Clear menu selection as we'll fetch new menus based on the mode
      menu: ''
    }));
    
    // Reset dishes when order mode changes
    setDishes([]);
    setFilteredDishes([]);
    
    // Update menus when order mode changes
    // Adding a small delay to avoid race conditions
    
      fetchMenus(mode);
  };

  const handleTableChange = (e) => {
    setOrderData(prev => ({
      ...prev,
      table: e.target.value
    }));
  };

  const handleMenuChange = (e) => {
    const menuId = e.target.value;
    console.log(`Menu changed to: ${menuId}`);
    
    setOrderData(prev => ({
      ...prev,
      menu: menuId
    }));
    
    // Load menu items with pricing
    if (menuId) {
      fetchMenuItems(menuId);
    } else {
      // Clear dishes if no menu selected
      setDishes([]);
      setFilteredDishes([]);
    }
  };

  const handleCustomerChange = (field, value) => {
    setOrderData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value
      }
    }));
  };

  const handleSelectCustomer = (customer) => {
    setOrderData(prev => ({
      ...prev,
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || ''
      }
    }));
    setOpenCustomerDialog(false);
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setSelectedSubCategory('');
    fetchSubCategories(categoryId);
  };

  const handleSubCategoryChange = (e) => {
    setSelectedSubCategory(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Item management
  const addDishToOrder = async (dish) => {
    if (!orderData.menu) {
      toast.error('Please select a menu first');
      return;
    }
    // Check if dish already exists in order
    const existingItemIndex = orderData.itemsSold.findIndex(
      item => item.dish === dish._id &&
      (item.variant === (dish.variant?._id || null) ||
        (!item.variant && !dish.variant))
    );
    if (existingItemIndex >= 0) {
      // Update quantity if dish already exists
      const updatedItems = [...orderData.itemsSold];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderData(prev => ({
        ...prev,
        itemsSold: updatedItems
      }));
    } else {
      // Fetch available add-ons for this dish
      const dishAddons = await fetchDishAddons(dish._id, dish.variant?._id);
      // Add new item
      const newItem = {
        dish: dish._id,
        dishName: dish.dishName,
        variant: dish.variant?._id || null,
        variantName: dish.variant?.variantName || '',
        quantity: 1,
        price: dish.price || 0, // Use menu price
        addOns: [],
        availableAddons: dishAddons, // Store available add-ons
        notes: ''
      };
      setOrderData(prev => ({
        ...prev,
        itemsSold: [...prev.itemsSold, newItem]
      }));
    }
  };

  const updateItemQuantity = (index, change) => {
    const updatedItems = [...orderData.itemsSold];
    const newQuantity = updatedItems[index].quantity + change;
    if (newQuantity <= 0) {
      // Remove item if quantity is zero or negative
      updatedItems.splice(index, 1);
    } else {
      updatedItems[index].quantity = newQuantity;
    }
    setOrderData(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  const removeItem = (index) => {
    const updatedItems = [...orderData.itemsSold];
    updatedItems.splice(index, 1);
    setOrderData(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  const updateItemNote = (index, note) => {
    const updatedItems = [...orderData.itemsSold];
    updatedItems[index].notes = note;
    setOrderData(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  // Add-on management
  const handleAddAddonClick = (itemIndex) => {
    const item = orderData.itemsSold[itemIndex];
    setSelectedItemIndex(itemIndex);
    setAvailableAddons(item.availableAddons || []);
    setOpenAddonsDialog(true);
  };

  const addAddonToItem = (itemIndex, addon) => {
    const updatedItems = [...orderData.itemsSold];
    // Check if this addon is already added
    const existingAddonIndex = updatedItems[itemIndex].addOns.findIndex(
      a => a.addOn === addon._id
    );
    if (existingAddonIndex >= 0) {
      toast.info('This add-on is already added to the item');
      return;
    }
    // Add the addon
    updatedItems[itemIndex].addOns.push({
      addOn: addon._id,
      name: addon.name,
      price: addon.price
    });
    setOrderData(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  const removeAddonFromItem = (itemIndex, addonIndex) => {
    const updatedItems = [...orderData.itemsSold];
    updatedItems[itemIndex].addOns.splice(addonIndex, 1);
    setOrderData(prev => ({
      ...prev,
      itemsSold: updatedItems
    }));
  };

  // Discount handling
  const handleDiscountTypeChange = (e) => {
    const discountType = e.target.value;
    setOrderData(prev => ({
      ...prev,
      discount: {
        ...prev.discount,
        discountType
      }
    }));
  };

  const handleDiscountValueChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    if (orderData.discount.discountType === 'percentage') {
      setOrderData(prev => ({
        ...prev,
        discount: {
          ...prev.discount,
          discountPercentage: value,
          discountValue: (prev.subtotalAmount * value) / 100
        }
      }));
    } else {
      setOrderData(prev => ({
        ...prev,
        discount: {
          ...prev.discount,
          discountValue: value
        }
      }));
    }
  };

  const handleDiscountReasonChange = (e) => {
    setOrderData(prev => ({
      ...prev,
      discount: {
        ...prev.discount,
        discountReason: e.target.value
      }
    }));
  };

  // Payment handling
  const handlePaymentMethodChange = (index, method) => {
    const updatedPayments = [...orderData.payment];
    updatedPayments[index].method = method;
    setOrderData(prev => ({
      ...prev,
      payment: updatedPayments
    }));
  };

  const handlePaymentAmountChange = (index, amount) => {
    const updatedPayments = [...orderData.payment];
    updatedPayments[index].amount = parseFloat(amount) || 0;
    setOrderData(prev => ({
      ...prev,
      payment: updatedPayments
    }));
  };

  const addPaymentMethod = () => {
    setOrderData(prev => ({
      ...prev,
      payment: [...prev.payment, { method: 'Cash', amount: 0 }]
    }));
  };

  const removePaymentMethod = (index) => {
    const updatedPayments = [...orderData.payment];
    updatedPayments.splice(index, 1);
    setOrderData(prev => ({
      ...prev,
      payment: updatedPayments
    }));
  };

  // Calculation functions
  const calculateTotals = () => {
    // Calculate subtotal
    const subtotal = orderData.itemsSold.reduce((sum, item) => {
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
    const taxes = orderData.taxDetails.map(tax => {
      const taxAmount = (subtotal * tax.taxRate) / 100;
      return {
        ...tax,
        taxAmount
      };
    });
    const totalTax = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);

    // Calculate discount
    let discountValue = 0;
    if (orderData.discount.discountType === 'percentage') {
      discountValue = (subtotal * orderData.discount.discountPercentage) / 100;
    } else {
      discountValue = orderData.discount.discountValue;
    }

    // Calculate total
    const total = subtotal + totalTax + orderData.deliveryCharge + orderData.packagingCharge - discountValue;

    // Update payment amount if only one payment method
    let updatedPayment = [...orderData.payment];
    if (updatedPayment.length === 1) {
      updatedPayment[0].amount = total;
    }

    // Update order data with calculations
    setOrderData(prev => ({
      ...prev,
      subtotalAmount: subtotal,
      totalTaxAmount: totalTax,
      taxDetails: taxes,
      discount: {
        ...prev.discount,
        discountValue
      },
      totalAmount: total,
      payment: updatedPayment
    }));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!orderData.customer.name || !orderData.customer.phone) {
      toast.error('Customer name and phone are required');
      return;
    }
    
    if (!orderData.menu) {
      toast.error('Please select a menu');
      return;
    }
    
    if (orderData.orderMode === 'Dine-in' && !orderData.table) {
      toast.error('Please select a table for dine-in orders');
      return;
    }
    if (orderData.orderMode === 'Zomato') {
      // Initialize with default values if not already set
      if (!orderData.zomatoOrderDetails) {
        const now = new Date();
        const thirtyMinutesLater = new Date(now.getTime() + 30 * 60000);
        const sixtyMinutesLater = new Date(now.getTime() + 60 * 60000);
        
        orderData.zomatoOrderDetails = {
          zomatoOrderId: `ZOM-${Math.floor(100000 + Math.random() * 900000)}`, // Random 6-digit ID
          zomatoStatus: 'placed',
          estimatedReadyTime: thirtyMinutesLater.toISOString(),
          estimatedDeliveryTime: sixtyMinutesLater.toISOString(),
          timeline: [{
            status: 'placed',
            timestamp: now.toISOString(),
            note: 'Order placed via Zomato'
          }]
        };
        
        console.log('Initialized Zomato order details:', orderData.zomatoOrderDetails);
      }
    }
    
    if (orderData.itemsSold.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }
    
    // Validate payment
    const totalPayment = orderData.payment.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPayment - orderData.totalAmount) > 0.01) {
      toast.error('Total payment amount must equal order total');
      return;
    }
    
    // Make sure table is not an empty string
    if (orderData.table === '') {
      orderData.table = null;
    }
    
    setLoading(true);
    try {
      console.log('Submitting order data:', JSON.stringify(orderData, null, 2));
      const method = isEditMode ? 'put' : 'post';
      const url = isEditMode ? `/api/orders/${orderId}` : '/api/orders';
      const res = await axiosWithAuth[method](url, orderData);
      
      console.log('Order submission response:', res);
      if (res.data.success) {
        toast.success(
          isEditMode ? 'Order updated successfully' : 'Order created successfully'
        );
        
        // Create KOT
        if (!isEditMode) {
          try {
            // Generate temporary identifiers for KOT
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
            const timeStr = now.getTime().toString().slice(-6);
            const randomToken = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
            
            const kotData = {
              salesOrder: res.data.data._id,
              items: res.data.data.itemsSold.map(item => ({
                dish: item.dish,
                dishName: item.dishName,
                variant: item.variant,
                variantName: item.variantName,
                quantity: item.quantity,
                addOns: item.addOns?.map(addon => ({
                  addOn: addon.addOn,
                  addOnName: addon.name
                })) || [],
                notes: item.notes
              })),
              orderMode: res.data.data.orderMode,
              table: res.data.data.table,
              customer: {
                name: res.data.data.customer.name,
                phone: res.data.data.customer.phone
              },
              kotStatus: 'pending',
              // Add required fields for KOT
              kotTokenNum: randomToken.toString(),
              refNum: res.data.data.refNum || `REF-${dateStr}-${timeStr}`,
              kotFinalId: `KF-${dateStr}-${randomToken}`,
              kotInvoiceId: `KOT-${dateStr}-${randomToken}`
            };
            
            const kotResponse = await axiosWithAuth.post('/api/orders/kot', kotData);
            console.log('KOT creation response:', kotResponse.data);
          } catch (error) {
            console.error('Error creating KOT:', error);
          }
          
          // Create invoice
          try {
            const invoiceData = {
              salesOrder: res.data.data._id
            };
            await axiosWithAuth.post('/api/orders/invoice', invoiceData);
          } catch (error) {
            console.error('Error creating invoice:', error);
          }
        }
        
        if (onSuccess) {
          console.log('Calling onSuccess callback from OrderForm');
          // Pass the created/updated order to the callback
          onSuccess(res.data.data);
        } else {
          router.push('/dashboard/orders');
        }
      } else {
        toast.error(res.data.message || 'An error occurred');
        console.error('Order submission error response:', res.data);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {isEditMode ? 'Edit Order' : 'Create New Order'}
      </Typography>
      
      {/* Debug Button */}
      <Box position="absolute" right="10px" top="10px">
        <IconButton
          color="primary"
          onClick={() => setOpenDebugDialog(true)}
          title="Debug Information"
        >
          <BugIcon />
        </IconButton>
      </Box>
      
      <Grid container spacing={3}>
        {/* Left column: Order details & Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Order Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="order-mode-label">Order Mode</InputLabel>
                  <Select
                    labelId="order-mode-label"
                    value={orderData.orderMode}
                    onChange={handleOrderModeChange}
                    label="Order Mode"
                    disabled={isEditMode}
                  >
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="menu-label">Menu</InputLabel>
                  <Select
                    labelId="menu-label"
                    value={orderData.menu}
                    onChange={handleMenuChange}
                    label="Menu"
                    required
                    disabled={isEditMode || loadingMenus}
                  >
                    <MenuItem value="">
                      <em>Select a menu</em>
                    </MenuItem>
                    {menus.map((menu) => (
                      <MenuItem key={menu._id} value={menu._id}>
                        {menu.name} ({menu.orderMode})
                      </MenuItem>
                    ))}
                  </Select>
                  {loadingMenus && <CircularProgress size={24} sx={{ ml: 1 }} />}
                </FormControl>
                {menuError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {menuError}
                  </Alert>
                )}
                {menus.length === 0 && !loadingMenus && !menuError && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No menus available for {orderData.orderMode}
                  </Alert>
                )}
              </Grid>
              {orderData.orderMode === 'Dine-in' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="table-label">Table</InputLabel>
                    <Select
                      labelId="table-label"
                      value={orderData.table}
                      onChange={handleTableChange}
                      label="Table"
                    >
                      <MenuItem value="">
                        <em>Select a table</em>
                      </MenuItem>
                      {tables.map((table) => (
                        <MenuItem key={table._id} value={table._id}>
                          {table.tableName} ({table.capacity} seats)
                        </MenuItem>
                      ))}
                    </Select>
                    {orderData.orderMode === 'Dine-in' && !orderData.table && (
                      <FormHelperText error>Table is required for dine-in orders</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              {orderData.orderMode === 'Dine-in' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Number of People"
                    type="number"
                    value={orderData.numOfPeople}
                    onChange={(e) => setOrderData(prev => ({
                      ...prev,
                      numOfPeople: parseInt(e.target.value) || 1
                    }))}
                    InputProps={{ inputProps: { min: 1 } }}
                    margin="normal"
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Customer Information</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonIcon />}
                onClick={() => setOpenCustomerDialog(true)}
              >
                Select Customer
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={orderData.customer.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  required
                  error={!orderData.customer.name}
                  helperText={!orderData.customer.name ? 'Customer name is required' : ''}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={orderData.customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  required
                  error={!orderData.customer.phone}
                  helperText={!orderData.customer.phone ? 'Phone number is required' : ''}
                  margin="normal"
                />
              </Grid>
              {(orderData.orderMode === 'Delivery' || orderData.orderMode === 'Direct Order-Delivery') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Delivery Address"
                    value={orderData.customer.address}
                    onChange={(e) => handleCustomerChange('address', e.target.value)}
                    required
                    multiline
                    rows={2}
                    margin="normal"
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Order Items</Typography>
            {/* Item selection interface */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.categoryName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="subcategory-label">Subcategory</InputLabel>
                  <Select
                    labelId="subcategory-label"
                    value={selectedSubCategory}
                    onChange={handleSubCategoryChange}
                    label="Subcategory"
                    disabled={!selectedCategory}
                  >
                    <MenuItem value="">All Subcategories</MenuItem>
                    {subCategories.map((subCategory) => (
                      <MenuItem key={subCategory._id} value={subCategory._id}>
                        {subCategory.subCategoryName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search dishes..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            {/* Dish selection */}
            {filteredDishes.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                {filteredDishes.map((dish) => (
                  <Chip
                    key={dish._id}
                    icon={<FastfoodIcon />}
                    label={`${dish.dishName}${dish.variant ? ` - ${dish.variant.variantName}` : ''} (₹${dish.price})`}
                    onClick={() => addDishToOrder(dish)}
                    color="primary"
                    variant="outlined"
                    sx={{ m: 0.5 }}
                    disabled={!orderData.menu}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2, mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No dishes found. Try adjusting your filters or selecting a menu first.
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            {/* Order items list */}
            {orderData.itemsSold.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderData.itemsSold.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {item.dishName}
                            {item.variantName && ` - ${item.variantName}`}
                          </Typography>
                          {/* Add-ons display */}
                          {item.addOns && item.addOns.length > 0 && (
                            <Box mt={0.5}>
                              {item.addOns.map((addon, addonIndex) => (
                                <Chip
                                  key={addonIndex}
                                  label={`${addon.name} (₹${addon.price.toFixed(2)})`}
                                  size="small"
                                  onDelete={() => removeAddonFromItem(index, addonIndex)}
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                          {/* Add-on button */}
                          <Button
                            size="small"
                            startIcon={<AddCircleIcon />}
                            onClick={() => handleAddAddonClick(index)}
                            sx={{ mt: 0.5 }}
                            disabled={!item.availableAddons || item.availableAddons.length === 0}
                          >
                            Add-on
                          </Button>
                          {item.notes && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Note: {item.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => updateItemQuantity(index, -1)}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                            <IconButton
                              size="small"
                              onClick={() => updateItemQuantity(index, 1)}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          ₹{((item.price * item.quantity) +
                            (item.addOns ? item.addOns.reduce((sum, addon) => sum + addon.price, 0) : 0)
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => {
                              const note = prompt('Add note for this item:', item.notes);
                              if (note !== null) {
                                updateItemNote(index, note);
                              }
                            }}
                          >
                            <AddCircleIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeItem(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No items added to this order yet.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select items from above to add them to the order.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        {/* Right column: Order summary & Payment */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Order Summary" />
            <CardContent>
              <List disablePadding>
                <ListItem>
                  <ListItemText primary="Subtotal" />
                  <Typography variant="body1">
                    ₹{orderData.subtotalAmount.toFixed(2)}
                  </Typography>
                </ListItem>
                {orderData.taxDetails.map((tax, index) => (
                  <ListItem key={index} dense>
                    <ListItemText
                      primary={tax.taxName}
                      secondary={`${tax.taxRate}%`}
                    />
                    <Typography variant="body2">
                      ₹{tax.taxAmount.toFixed(2)}
                    </Typography>
                  </ListItem>
                ))}
                {orderData.discount.discountValue > 0 && (
                  <ListItem>
                    <ListItemText
                      primary="Discount"
                      secondary={
                        orderData.discount.discountType === 'percentage'
                          ? `${orderData.discount.discountPercentage}%`
                          : 'Fixed'
                      }
                    />
                    <Typography variant="body1" color="error">
                      -₹{orderData.discount.discountValue.toFixed(2)}
                    </Typography>
                  </ListItem>
                )}
                {orderData.deliveryCharge > 0 && (
                  <ListItem>
                    <ListItemText primary="Delivery Charge" />
                    <Typography variant="body1">
                      ₹{orderData.deliveryCharge.toFixed(2)}
                    </Typography>
                  </ListItem>
                )}
                {orderData.packagingCharge > 0 && (
                  <ListItem>
                    <ListItemText primary="Packaging Charge" />
                    <Typography variant="body1">
                      ₹{orderData.packagingCharge.toFixed(2)}
                    </Typography>
                  </ListItem>
                )}
              </List>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">
                  ₹{orderData.totalAmount.toFixed(2)}
                </Typography>
              </Box>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                sx={{ mt: 2 }}
                startIcon={<AddCircleIcon />}
                onClick={() => setOpenDiscountDialog(true)}
              >
                {orderData.discount.discountValue > 0
                  ? 'Update Discount'
                  : 'Add Discount'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Payment Details"
              action={
                <Button
                  size="small"
                  onClick={() => setOpenPaymentDialog(true)}
                  startIcon={<AddCircleIcon />}
                >
                  Edit
                </Button>
              }
            />
            <CardContent>
              {orderData.payment.map((payment, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="body1">{payment.method}:</Typography>
                  <Typography variant="body1">
                    ₹{payment.amount.toFixed(2)}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Total Paid:</Typography>
                <Typography variant="body1">
                  ₹{orderData.payment.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={<SaveIcon />}
                >
                  {loading
                    ? 'Processing...'
                    : isEditMode
                      ? 'Update Order'
                      : 'Place Order'}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={onCancel}
                  disabled={loading}
                  startIcon={<CancelIcon />}
                >
                  Cancel
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Customer Selection Dialog */}
      <Dialog
        open={openCustomerDialog}
        onClose={() => setOpenCustomerDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Customer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search customers..."
            variant="outlined"
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <List>
            {customers.map((customer, index) => (
              <ListItem
                key={index}
                button
                onClick={() => handleSelectCustomer(customer)}
              >
                <ListItemText
                  primary={customer.name}
                  secondary={`${customer.phone} | ${customer.email || 'No email'}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCustomerDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Debug Information Dialog */}
      <Dialog
        open={openDebugDialog}
        onClose={() => setOpenDebugDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Debug Information
          <IconButton
            onClick={() => setOpenDebugDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CancelIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Current State</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Order Mode: {orderData.orderMode}</Typography>
                  <Typography variant="subtitle1">Selected Menu: {orderData.menu || 'None'}</Typography>
                  <Typography variant="subtitle1">Menu Count: {menus.length}</Typography>
                  <Typography variant="subtitle1">Menu Request ID: {menusRequestId.current}</Typography>
                  <Typography variant="subtitle1">Loading Menus: {loadingMenus ? 'Yes' : 'No'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Menu Error: {menuError || 'None'}</Typography>
                  <Typography variant="subtitle1">Dish Count: {dishes.length}</Typography>
                  <Typography variant="subtitle1">Filtered Dishes: {filteredDishes.length}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          
          <Typography variant="h6" gutterBottom>Available Menus</Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Order Mode</TableCell>
                  <TableCell>Is Default</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {menus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No menus available</TableCell>
                  </TableRow>
                ) : (
                  menus.map(menu => (
                    <TableRow key={menu._id}>
                      <TableCell>{menu._id}</TableCell>
                      <TableCell>{menu.name}</TableCell>
                      <TableCell>{menu.orderMode}</TableCell>
                      <TableCell>{menu.isDefault ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="h6" gutterBottom>API Information</Typography>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2">Debug Information:</Typography>
            <Box component="pre" sx={{ 
              maxHeight: 300, 
              overflow: 'auto', 
              p: 2, 
              bgcolor: 'black', 
              color: 'lightgreen', 
              borderRadius: 1 
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </Box>
          </Paper>
          
          <Typography variant="h6" gutterBottom>Troubleshooting</Typography>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>1. Check if the API endpoint is implemented</Typography>
            <Typography variant="body2" paragraph>
              Make sure you have created the necessary API files in your project:
              <br />- src/app/api/menu/menus/route.js
              <br />- src/app/api/menu/menus/[id]/route.js
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>2. Check your database</Typography>
            <Typography variant="body2" paragraph>
              Ensure your Menu documents in MongoDB have the correct orderMode values. They should exactly match the values from the dropdown:
              <br />- Dine-in
              <br />- Takeaway
              <br />- Delivery
              <br />- Direct Order-TableQR
              <br />- Direct Order-Takeaway
              <br />- Direct Order-Delivery
              <br />- Zomato
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>3. Check for race conditions</Typography>
            <Typography variant="body2" paragraph>
              Switching order modes rapidly might cause issues. The code now includes a system to handle this.
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>4. Test the API manually</Typography>
            <Typography variant="body2">
              Try directly visiting:<br />
              /api/menu/menus?mode=Dine-in&strictMode=true<br />
              /api/menu/menus?mode=Takeaway&strictMode=true<br />
              /api/menu/menus?mode=Delivery&strictMode=true
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDebugDialog(false)}>Close</Button>
          <Button 
            onClick={() => {
              // Re-fetch menus
              fetchMenus();
              toast.success("Refreshing menus...");
            }}
            variant="contained"
            color="primary"
          >
            Refresh Menus
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Other dialogs */}
      <Dialog
        open={openDiscountDialog}
        onClose={() => setOpenDiscountDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apply Discount</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="discount-type-label">Discount Type</InputLabel>
            <Select
              labelId="discount-type-label"
              value={orderData.discount.discountType}
              onChange={handleDiscountTypeChange}
              label="Discount Type"
            >
              <MenuItem value="percentage">Percentage</MenuItem>
              <MenuItem value="fixed">Fixed Amount</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={orderData.discount.discountType === 'percentage' ? 'Percentage' : 'Amount'}
            type="number"
            value={orderData.discount.discountType === 'percentage'
              ? orderData.discount.discountPercentage
              : orderData.discount.discountValue}
            onChange={handleDiscountValueChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {orderData.discount.discountType === 'percentage' ? '%' : '₹'}
                </InputAdornment>
              ),
            }}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Reason (Optional)"
            value={orderData.discount.discountReason}
            onChange={handleDiscountReasonChange}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDiscountDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // Reset discount
              setOrderData(prev => ({
                ...prev,
                discount: {
                  ...prev.discount,
                  discountPercentage: 0,
                  discountValue: 0,
                  discountReason: ''
                }
              }));
              setOpenDiscountDialog(false);
            }}
            color="error"
          >
            Remove Discount
          </Button>
          <Button
            onClick={() => setOpenDiscountDialog(false)}
            variant="contained"
            color="primary"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Payment Methods</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Total Amount: ₹{orderData.totalAmount.toFixed(2)}
          </Typography>
          {orderData.payment.map((payment, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2
              }}
            >
              <FormControl sx={{ flexGrow: 1 }}>
                <InputLabel id={`payment-method-${index}-label`}>Method</InputLabel>
                <Select
                  labelId={`payment-method-${index}-label`}
                  value={payment.method}
                  onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
                  label="Method"
                  size="small"
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method.id} value={method.id}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Amount"
                type="number"
                value={payment.amount}
                onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                sx={{ width: 150 }}
                size="small"
              />
              {orderData.payment.length > 1 && (
                <IconButton
                  color="error"
                  onClick={() => removePaymentMethod(index)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={addPaymentMethod}
            disabled={orderData.payment.length >= 3}
          >
            Add Payment Method
          </Button>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Total Paid: ₹{orderData.payment.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </Typography>
            {Math.abs(orderData.payment.reduce((sum, p) => sum + p.amount, 0) - orderData.totalAmount) > 0.01 && (
              <Typography variant="body2" color="error">
                Payment amount doesn&apos;t match order total
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // Set full amount to first payment method
              const updatedPayments = [...orderData.payment];
              if (updatedPayments.length > 0) {
                updatedPayments[0].amount = orderData.totalAmount;
                for (let i = 1; i < updatedPayments.length; i++) {
                  updatedPayments[i].amount = 0;
                }
                setOrderData(prev => ({
                  ...prev,
                  payment: updatedPayments
                }));
              }
              setOpenPaymentDialog(false);
            }}
            variant="outlined"
          >
            Full Amount to First Method
          </Button>
          <Button
            onClick={() => setOpenPaymentDialog(false)}
            variant="contained"
            color="primary"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openAddonsDialog}
        onClose={() => setOpenAddonsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Add-ons</DialogTitle>
        <DialogContent>
          {availableAddons.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No add-ons available for this item
            </Alert>
          ) : (
            <List>
              {availableAddons.map((addon) => (
                <ListItem key={addon._id} disablePadding>
                  <ListItemButton onClick={() => {
                    addAddonToItem(selectedItemIndex, addon);
                    setOpenAddonsDialog(false);
                  }}>
                    <ListItemText
                      primary={addon.name}
                      secondary={`₹${addon.price.toFixed(2)}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddonsDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderForm;
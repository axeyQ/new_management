'use client';
import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Divider,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AddCircle as AddCircleIcon,
  Search as SearchIcon,
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

const OrderForm = ({ orderId, onSuccess, onCancel }) => {
  const router = useRouter();
  const { user } = useAuth();
  const isEditMode = !!orderId;
  
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
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
  });
  
  // Reference data
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [openDiscountDialog, setOpenDiscountDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  
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
        ]);
        
        if (isEditMode) {
          await fetchOrder();
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing data:', error);
        toast.error('Error loading data');
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
    }
  };
  
  const fetchSubCategories = async (categoryId) => {
    try {
      const url = categoryId ? `/api/menu/subcategories?category=${categoryId}` : '/api/menu/subcategories';
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setSubCategories(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
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
    }
  };
  
  const fetchCustomers = async () => {
    try {
      // In a real app, this would fetch from a customers API
      // Simulating with mock data for now
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
      } else {
        toast.error('Failed to load order');
        router.push('/dashboard/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Error loading order');
      router.push('/dashboard/orders');
    }
  };
  
  // Filter dishes based on search and category
  const filterDishes = () => {
    let filtered = [...dishes];
    
    if (selectedCategory) {
      // Filter by category
      const subCatsInCategory = subCategories.filter(
        sc => sc.category && sc.category._id === selectedCategory
      ).map(sc => sc._id);
      
      filtered = filtered.filter(dish => {
        const dishSubCats = dish.subCategory ? dish.subCategory.map(sc => 
          typeof sc === 'string' ? sc : sc._id) : [];
        return dishSubCats.some(id => subCatsInCategory.includes(id));
      });
    }
    
    if (selectedSubCategory) {
      // Filter by subcategory
      filtered = filtered.filter(dish => {
        const dishSubCats = dish.subCategory ? dish.subCategory.map(sc => 
          typeof sc === 'string' ? sc : sc._id) : [];
        return dishSubCats.includes(selectedSubCategory);
      });
    }
    
    if (searchTerm) {
      // Filter by search term
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
    setOrderData(prev => ({
      ...prev,
      orderMode: mode,
      // Reset table if not dine-in
      table: mode === 'Dine-in' ? prev.table : '',
      // Add delivery charge if delivery
      deliveryCharge: mode.includes('Delivery') ? 40 : 0,
      // Add packaging charge if takeaway or delivery
      packagingCharge: mode.includes('Takeaway') || mode.includes('Delivery') ? 20 : 0,
    }));
  };
  
  const handleTableChange = (e) => {
    setOrderData(prev => ({
      ...prev,
      table: e.target.value
    }));
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
  
  // Add dish to order
  const addDishToOrder = (dish) => {
    // For real implementation, this would fetch the price from a menu pricing API
    // Using a mock price here
    const dishPrice = 100; 
    
    // Check if dish already exists in order
    const existingItemIndex = orderData.itemsSold.findIndex(
      item => (item.dish === dish._id || item.dish?._id === dish._id) && !item.variant
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if dish already exists
      const updatedItems = [...orderData.itemsSold];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };
      
      setOrderData(prev => ({
        ...prev,
        itemsSold: updatedItems
      }));
    } else {
      // Add new item
      const newItem = {
        dish: dish._id || dish,
        dishName: dish.dishName,
        variant: null,  // Set variant to null instead of empty string
        quantity: 1,
        price: dishPrice,
        addOns: [],
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
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: newQuantity
      };
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
    updatedItems[index] = {
      ...updatedItems[index],
      notes: note
    };
    
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
    updatedPayments[index] = {
      ...updatedPayments[index],
      method
    };
    
    setOrderData(prev => ({
      ...prev,
      payment: updatedPayments
    }));
  };
  
  const handlePaymentAmountChange = (index, amount) => {
    const updatedPayments = [...orderData.payment];
    updatedPayments[index] = {
      ...updatedPayments[index],
      amount: parseFloat(amount) || 0
    };
    
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
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Calculate taxes
    const taxes = orderData.taxDetails.map(tax => {
      const taxAmount = parseFloat(((subtotal * tax.taxRate) / 100).toFixed(2));
      return {
        ...tax,
        taxAmount
      };
    });
    
    const totalTax = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);
    
    // Calculate discount
    let discountValue = 0;
    if (orderData.discount.discountType === 'percentage') {
      discountValue = parseFloat(((subtotal * orderData.discount.discountPercentage) / 100).toFixed(2));
    } else {
      discountValue = orderData.discount.discountValue;
    }
    
    // Calculate total
    const total = parseFloat((subtotal + totalTax + orderData.deliveryCharge +
      orderData.packagingCharge - discountValue).toFixed(2));
    
    // Update payment amount if only one payment method
    let updatedPayment = [...orderData.payment];
    if (updatedPayment.length === 1) {
      updatedPayment[0] = {
        ...updatedPayment[0],
        amount: total
      };
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
  const handleSubmit = async () => {
    // Validate form
    if (!orderData.customer.name || !orderData.customer.phone) {
      toast.error('Customer name and phone are required');
      return;
    }
    
    if (orderData.orderMode === 'Dine-in' && !orderData.table) {
      toast.error('Please select a table for dine-in orders');
      return;
    }
    
    if (orderData.itemsSold.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }
    
    setLoading(true);
    
    try {
      // Generate temporary refNum and invoiceNumber if needed (for new orders)
      // In a real implementation, this would be handled by the server
      let dataToSubmit = {...orderData};
      
      if (!isEditMode) {
        // Generate a temporary reference number and invoice number for new orders
        // The server will replace these with properly generated values
        const now = new Date();
        const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
        const timeStr = now.getTime().toString().slice(-6);
        
        dataToSubmit.refNum = `REF-${dateStr}-${timeStr}`;
        dataToSubmit.invoiceNumber = `INV-${dateStr}-${timeStr}`;
      }
      
      // Clean up data - ensure variant field is properly formatted
      dataToSubmit.itemsSold = dataToSubmit.itemsSold.map(item => ({
        ...item,
        variant: item.variant || null  // Ensure variant is null rather than empty string
      }));
      
      const method = isEditMode ? 'put' : 'post';
      const url = isEditMode ? `/api/orders/${orderId}` : '/api/orders';
      
      const res = await axiosWithAuth[method](url, dataToSubmit);
      
      if (res.data.success) {
        toast.success(
          isEditMode ? 'Order updated successfully' : 'Order created successfully'
        );
        
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="h5" gutterBottom>
        {isEditMode ? 'Edit Order' : 'Create New Order'}
      </Typography>
      
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
                    label={dish.dishName}
                    onClick={() => addDishToOrder(dish)}
                    color="primary"
                    variant="outlined"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2, mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No dishes found. Try adjusting your filters.
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
                          <Typography variant="body2">{item.dishName}</Typography>
                          {item.notes && (
                            <Typography variant="caption" color="text.secondary">
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
                        <TableCell align="right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
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
      
      {/* Discount Dialog */}
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
      
      {/* Payment Dialog */}
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
            
            {Math.abs(orderData.payment.reduce((sum, p) => sum + p.amount, 0) -
              orderData.totalAmount) > 0.01 && (
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
                updatedPayments[0] = {
                  ...updatedPayments[0],
                  amount: orderData.totalAmount
                };
                
                for (let i = 1; i < updatedPayments.length; i++) {
                  updatedPayments[i] = {
                    ...updatedPayments[i],
                    amount: 0
                  };
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
    </Box>
  );
};

export default OrderForm;
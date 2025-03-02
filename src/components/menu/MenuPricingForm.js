// src/components/menu/MenuPricingForm.js
'use client';
import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Autocomplete,
  CircularProgress,
  Grid,
  InputAdornment,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const MenuPricingForm = ({ menuId, pricingItem, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    dishId: pricingItem?.dish?._id || '',
    price: pricingItem?.price || '',
    taxSlab: pricingItem?.taxSlab || 'GST 5%',
    taxRate: pricingItem?.taxRate || 5,
    isAvailable: pricingItem?.isAvailable !== undefined ? pricingItem.isAvailable : true,
  });
  
  const [dishes, setDishes] = useState([]);
  const [availableDishes, setAvailableDishes] = useState([]);
  const [selectedDish, setSelectedDish] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableVariants, setAvailableVariants] = useState([]);

  const taxSlabs = [
    { label: 'GST 5%', rate: 5 },
    { label: 'GST 12%', rate: 12 },
    { label: 'GST 18%', rate: 18 },
    { label: 'GST 28%', rate: 28 },
  ];
  
  // Calculate final price
  const finalPrice = formData.price
    ? parseFloat(formData.price) + (parseFloat(formData.price) * formData.taxRate) / 100
    : 0;
  // When a dish is selected, fetch its variants
useEffect(() => {
  if (selectedDish) {
    // Fetch variants for the selected dish
    const fetchVariants = async () => {
      try {
        const res = await axiosWithAuth.get(`/api/menu/dishes/${selectedDish._id}/variants`);
        if (res.data.success) {
          setAvailableVariants(res.data.data);
        } else {
          setAvailableVariants([]);
        }
      } catch (error) {
        console.error('Error fetching variants:', error);
        setAvailableVariants([]);
      }
    };
    
    fetchVariants();
  } else {
    setAvailableVariants([]);
    setSelectedVariant(null);
  }
}, [selectedDish]);
  useEffect(() => {
    fetchDishes();
  }, []);
  
  useEffect(() => {
    if (pricingItem && pricingItem.dish) {
      setSelectedDish(pricingItem.dish);
    }
  }, [pricingItem]);
  
  const fetchDishes = async () => {
    setLoadingDishes(true);
    try {
      // Fetch all dishes
      const dishesRes = await axiosWithAuth.get('/api/menu/dishes');
      if (dishesRes.data.success) {
        setDishes(dishesRes.data.data);
        
        // Fetch existing menu pricing to exclude already added dishes
        if (menuId) {
          const pricingRes = await axiosWithAuth.get(`/api/menu/pricing?menu=${menuId}`);
          if (pricingRes.data.success) {
            const existingDishIds = pricingRes.data.data.map(item => item.dish._id);
            
            // If editing an existing item, we include that dish in available options
            if (pricingItem && pricingItem.dish) {
              const availableDishes = dishesRes.data.data.filter(dish => 
                !existingDishIds.includes(dish._id) || dish._id === pricingItem.dish._id
              );
              setAvailableDishes(availableDishes);
            } else {
              // For new items, exclude all existing dishes
              const availableDishes = dishesRes.data.data.filter(dish => 
                !existingDishIds.includes(dish._id)
              );
              setAvailableDishes(availableDishes);
            }
          }
        } else {
          setAvailableDishes(dishesRes.data.data);
        }
      } else {
        toast.error('Failed to load dishes');
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Error loading dishes');
    } finally {
      setLoadingDishes(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };
  
  const handleTaxSlabChange = (e) => {
    const slab = taxSlabs.find(s => s.label === e.target.value);
    setFormData(prev => ({
      ...prev,
      taxSlab: e.target.value,
      taxRate: slab ? slab.rate : 5,
    }));
  };
  
  const handleDishChange = (event, newValue) => {
    setSelectedDish(newValue);
    setSelectedVariant(null);
    setFormData(prev => ({
      ...prev,
      dishId: newValue?._id || '',
      variantId: ''
    }));
  };

  // Add handler for variant selection
const handleVariantChange = (event, newValue) => {
  setSelectedVariant(newValue);
  setFormData(prev => ({
    ...prev,
    variantId: newValue?._id || ''
  }));
};

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.dishId) {
      toast.error('Please select a dish');
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    setLoading(true);
    try {
      const url = pricingItem
        ? `/api/menu/pricing/${pricingItem._id}`
        : '/api/menu/pricing';
      const method = pricingItem ? 'put' : 'post';
      
      const data = pricingItem
        ? {
            price: parseFloat(formData.price),
            taxSlab: formData.taxSlab,
            taxRate: formData.taxRate,
            isAvailable: formData.isAvailable,
          }
        : {
            menuId,
            dishId: formData.dishId,
            variantId: formData.variantId || null, // Include variant if selected
            price: parseFloat(formData.price),
            taxSlab: formData.taxSlab,
            taxRate: formData.taxRate,
            isAvailable: formData.isAvailable,
          };
      
      const res = await axiosWithAuth[method](url, data);
      if (res.data.success) {
        toast.success(
          pricingItem
            ? 'Menu pricing updated successfully'
            : 'Dish added to menu successfully'
        );
        onSuccess(res.data.data);
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {pricingItem ? 'Edit Menu Item' : 'Add Dish to Menu'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              options={availableDishes}
              getOptionLabel={(option) => option.dishName}
              value={selectedDish}
              onChange={handleDishChange}
              loading={loadingDishes}
              disabled={pricingItem !== null}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Dish"
                  required
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingDishes ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              type="number"
              required
              inputProps={{ min: 0, step: "0.01" }}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="taxSlab-label">Tax Slab</InputLabel>
              <Select
                labelId="taxSlab-label"
                name="taxSlab"
                value={formData.taxSlab}
                onChange={handleTaxSlabChange}
                label="Tax Slab"
              >
                {taxSlabs.map((slab) => (
                  <MenuItem key={slab.label} value={slab.label}>
                    {slab.label} ({slab.rate}%)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mt: 2, bgcolor: '#f9f9f9' }}>
              <Typography variant="subtitle2" gutterBottom>Price Calculation</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>Base Price:</Grid>
                <Grid item xs={6} textAlign="right">₹{parseFloat(formData.price || 0).toFixed(2)}</Grid>
                
                <Grid item xs={6}>Tax ({formData.taxRate}%):</Grid>
                <Grid item xs={6} textAlign="right">
                  ₹{((parseFloat(formData.price || 0) * formData.taxRate) / 100).toFixed(2)}
                </Grid>
                
                <Grid item xs={6} fontWeight="bold">Final Price:</Grid>
                <Grid item xs={6} textAlign="right" fontWeight="bold">
                  ₹{finalPrice.toFixed(2)}
                </Grid>
              </Grid>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="isAvailable"
                  checked={formData.isAvailable}
                  onChange={handleSwitchChange}
                  color="primary"
                />
              }
              label="Available on Menu"
            />
          </Grid>
        </Grid>
        
<Grid item xs={12}>
  <Autocomplete
    options={availableDishes}
    getOptionLabel={(option) => option.dishName}
    value={selectedDish}
    onChange={handleDishChange}
    loading={loadingDishes}
    disabled={pricingItem !== null}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Select Dish"
        required
        fullWidth
        InputProps={{
          ...params.InputProps,
          endAdornment: (
            <>
              {loadingDishes ? <CircularProgress color="inherit" size={20} /> : null}
              {params.InputProps.endAdornment}
            </>
          ),
        }}
      />
    )}
  />
</Grid>

{/* Add variant selector - only show if dish has variants */}
{availableVariants.length > 0 && (
  <Grid item xs={12}>
    <Autocomplete
      options={availableVariants}
      getOptionLabel={(option) => option.variantName}
      value={selectedVariant}
      onChange={handleVariantChange}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Variant (Optional)"
          fullWidth
        />
      )}
    />
  </Grid>
)}

        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || (!pricingItem && availableDishes.length === 0)}
          >
            {loading ? 'Saving...' : pricingItem ? 'Update Item' : 'Add to Menu'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default MenuPricingForm;
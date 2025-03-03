// src/components/menu/MenuPricingForm.js - Updated with variant support
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
  Divider,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const MenuPricingForm = ({ menuId, pricingItem, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    dishId: pricingItem?.dish?._id || '',
    variantId: pricingItem?.variant?._id || '',
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
  const [loadingVariants, setLoadingVariants] = useState(false);
  
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
      fetchVariants(selectedDish._id);
    } else {
      setAvailableVariants([]);
      setSelectedVariant(null);
      setFormData(prev => ({ ...prev, variantId: '' }));
    }
  }, [selectedDish]);
  
  useEffect(() => {
    fetchDishes();
  }, []);
  
  useEffect(() => {
    if (pricingItem) {
      if (pricingItem.dish) {
        setSelectedDish(pricingItem.dish);
      }
      
      if (pricingItem.variant) {
        setSelectedVariant(pricingItem.variant);
        fetchVariants(pricingItem.dish._id);
      }
    }
  }, [pricingItem]);
  
  const fetchVariants = async (dishId) => {
    if (!dishId) return;
    
    setLoadingVariants(true);
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
      if (res.data.success) {
        setAvailableVariants(res.data.data);
        
        // If this is an edit and we have a selected variant, find it in the results
        if (formData.variantId) {
          const variant = res.data.data.find(v => v._id === formData.variantId);
          if (variant) {
            setSelectedVariant(variant);
          }
        }
      } else {
        setAvailableVariants([]);
        toast.error('Failed to load variants');
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setAvailableVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };
  
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
            const existingPricing = pricingRes.data.data;
            
            // Build a Set of dish+variant combinations that already exist
            const existingCombinations = new Set();
            existingPricing.forEach(item => {
              // For dish only (no variant), the key is just the dish ID
              if (!item.variant) {
                existingCombinations.add(item.dish._id);
              } else {
                // For dish+variant combinations, the key is dish ID + variant ID
                existingCombinations.add(`${item.dish._id}-${item.variant._id}`);
              }
            });
            
            // If editing an existing item, include its dish
            if (pricingItem && pricingItem.dish) {
              // For dishes with variants, we allow adding the dish if either:
              // 1. It's the current dish being edited
              // 2. It has variants and not all variants are already priced
              const availableDishList = dishesRes.data.data.filter(dish => {
                // If it's the current dish being edited, include it
                if (pricingItem.dish._id === dish._id) {
                  return true;
                }
                
                // For dishes without variants, check if they're already in pricing
                if (!dish.variations || dish.variations.length === 0) {
                  return !existingCombinations.has(dish._id);
                }
                
                // For dishes with variants, check if all variants are already priced
                // We'll assume a dish with variants is available if the dish itself isn't priced
                // or if at least one variant isn't priced
                if (!existingCombinations.has(dish._id)) {
                  return true;
                }
                
                // If we get here, dish has variants and might have some that aren't priced
                // This would require checking each variant, which we'll do when a dish is selected
                return true;
              });
              
              setAvailableDishes(availableDishList);
            } else {
              // For new items, exclude all dishes that are already fully priced
              const availableDishList = dishesRes.data.data.filter(dish => {
                // For dishes without variants, check if they're already in pricing
                if (!dish.variations || dish.variations.length === 0) {
                  return !existingCombinations.has(dish._id);
                }
                
                // For dishes with variants, always include them - we'll filter variants later
                return true;
              });
              
              setAvailableDishes(availableDishList);
            }
          } else {
            // If pricing fetch fails, just show all dishes
            setAvailableDishes(dishesRes.data.data);
          }
        } else {
          // If no menu ID, show all dishes
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
    
    // If dish has variants, require a variant selection
    if (availableVariants.length > 0 && !formData.variantId) {
      toast.error("This dish has variants. Please select a specific variant to price.");
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
          
          {/* Variant selector - only show if dish has variants */}
          {availableVariants.length > 0 && (
            <Grid item xs={12}>
              <Autocomplete
                options={availableVariants}
                getOptionLabel={(option) => option.variantName}
                value={selectedVariant}
                onChange={handleVariantChange}
                loading={loadingVariants}
                disabled={pricingItem?.variant !== undefined}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Variant"
                    fullWidth
                    required
                    error={!selectedVariant && !pricingItem}
                    helperText={!selectedVariant && !pricingItem ? 
                      "A variant must be selected since this dish has variants" : 
                      "Select a variant to price"}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingVariants ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          )}
          
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
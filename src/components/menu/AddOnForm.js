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
  Switch,
  FormControlLabel,
  Autocomplete,
  CircularProgress,
  FormHelperText,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  InputAdornment,
  Alert,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const AddOnForm = ({ addon, addonGroups, onSuccess, onCancel, menuId }) => {
  const [addonType, setAddonType] = useState(addon?.dishReference ? 'dish-based' : 'custom');
  const [formData, setFormData] = useState({
    name: addon?.name || '',
    selectedDish: null,
    selectedVariant: null,
    price: addon?.price || '',
    addonGroupId: '',
    availabilityStatus: addon?.availabilityStatus !== undefined ? addon.availabilityStatus : true,
  });
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [menu, setMenu] = useState(null);
  const [isZomatoMenu, setIsZomatoMenu] = useState(false);

  useEffect(() => {
    // Fetch menu details to check if it's Zomato mode
    if (menuId) {
      fetchMenuDetails();
    }
    fetchDishes();

    // If editing an addon, find which group it belongs to and set initial dish
    if (addon) {
      for (const group of addonGroups) {
        if (group.addOns?.includes(addon._id)) {
          setFormData(prev => ({
            ...prev,
            addonGroupId: group._id,
            name: addon.name || ''
          }));
          break;
        }
      }
      // If dish reference exists, find the dish
      if (addon.dishReference) {
        fetchInitialDish(addon.dishReference);
      }
      // If variant reference exists, find the variant
      if (addon.variantReference) {
        fetchInitialVariant(addon.variantReference, addon.dishReference);
      }
    }
  }, [addon, addonGroups, menuId]);

  const fetchMenuDetails = async () => {
    try {
      const res = await axiosWithAuth.get(`/api/menu/menus/${menuId}`);
      if (res.data.success) {
        setMenu(res.data.data);
        setIsZomatoMenu(res.data.data.orderMode === 'Zomato');
      }
    } catch (error) {
      console.error('Error fetching menu details:', error);
    }
  };

  // When a dish is selected, fetch its variants and price
  useEffect(() => {
    if (formData.selectedDish) {
      fetchVariants(formData.selectedDish._id);
      
      // Fetch the dish price from the menu
      if (menuId) {
        fetchDishPriceFromMenu(formData.selectedDish._id);
      }
    } else {
      setVariants([]);
      setFormData(prev => ({ ...prev, selectedVariant: null }));
    }
  }, [formData.selectedDish, menuId]);

  const fetchDishPriceFromMenu = async (dishId) => {
    try {
      const res = await axiosWithAuth.get(`/api/menu/pricing?menu=${menuId}&dish=${dishId}`);
      if (res.data.success && res.data.data.length > 0) {
        // Update form price with the menu price
        const menuPricing = res.data.data[0];
        setFormData(prev => ({
          ...prev,
          price: menuPricing.price || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching dish price from menu:', error);
    }
  };

  const fetchDishes = async () => {
    setLoadingDishes(true);
    try {
      // If we have a menu ID, fetch dishes with pricing from that menu
      let url = '/api/menu/dishes';
      if (menuId) {
        url = `/api/menu/pricing?menu=${menuId}`;
      }
      
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        if (menuId) {
          // Map the pricing data to dish objects
          const dishesWithPricing = res.data.data.map(item => ({
            ...item.dish,
            _id: item.dish._id,
            price: item.price,
            finalPrice: item.finalPrice,
            menuPricingId: item._id
          }));
          setDishes(dishesWithPricing);
        } else {
          setDishes(res.data.data);
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

  const fetchInitialDish = async (dishId) => {
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}`);
      if (res.data.success) {
        setFormData(prev => ({
          ...prev,
          selectedDish: res.data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching initial dish:', error);
    }
  };

  const fetchInitialVariant = async (variantId, dishId) => {
    try {
      // First fetch variants for the dish
      await fetchVariants(dishId);
      // Then get this specific variant
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
      if (res.data.success) {
        const variant = res.data.data.find(v => v._id === variantId);
        if (variant) {
          setFormData(prev => ({
            ...prev,
            selectedVariant: variant
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching initial variant:', error);
    }
  };

  const fetchVariants = async (dishId) => {
    if (!dishId) return;
    setLoadingVariants(true);
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
      if (res.data.success) {
        setVariants(res.data.data);
        
        // If menu is specified, fetch variant prices
        if (menuId && res.data.data.length > 0) {
          const variantIds = res.data.data.map(v => v._id);
          
          // Fetch pricing for each variant
          const variantPricingPromises = variantIds.map(variantId => 
            axiosWithAuth.get(`/api/menu/pricing?menu=${menuId}&dish=${dishId}&variant=${variantId}`)
          );
          
          const variantPricingResults = await Promise.all(variantPricingPromises);
          
          // Update variants with pricing information
          const variantsWithPricing = res.data.data.map((variant, index) => {
            const pricingRes = variantPricingResults[index];
            if (pricingRes.data.success && pricingRes.data.data.length > 0) {
              return {
                ...variant,
                price: pricingRes.data.data[0].price,
                finalPrice: pricingRes.data.data[0].finalPrice
              };
            }
            return variant;
          });
          
          setVariants(variantsWithPricing);
        }
      } else {
        setVariants([]);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handlePriceChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      price: value === '' ? '' : parseFloat(value) || 0,
    }));
  };

  const handleDishChange = async (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      selectedDish: newValue,
      selectedVariant: null,
    }));
    
    // Price will be updated via the useEffect that runs when selectedDish changes
  };

  const handleVariantChange = async (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      selectedVariant: newValue,
    }));
    
    // If variant selected, update price
    if (newValue && menuId) {
      try {
        const res = await axiosWithAuth.get(
          `/api/menu/pricing?menu=${menuId}&dish=${formData.selectedDish._id}&variant=${newValue._id}`
        );
        if (res.data.success && res.data.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            price: res.data.data[0].price || 0
          }));
        }
      } catch (error) {
        console.error('Error fetching variant price:', error);
      }
    }
  };

  const handleAddonTypeChange = (event, newValue) => {
    if (newValue !== null) {
      setAddonType(newValue);
      // Reset certain form fields when switching types
      if (newValue === 'custom') {
        setFormData(prev => ({
          ...prev,
          selectedDish: null,
          selectedVariant: null
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          name: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.addonGroupId) {
      toast.error('Please select an add-on group');
      return;
    }
    if (addonType === 'dish-based' && !formData.selectedDish) {
      toast.error('Please select a dish');
      return;
    }
    if (addonType === 'custom' && !formData.name.trim()) {
      toast.error('Please enter an add-on name');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data for API
      const apiData = {
        addonGroupId: formData.addonGroupId,
        price: formData.price,
        availabilityStatus: formData.availabilityStatus,
        menuId: menuId // Pass the menu ID for proper pricing
      };
      
      if (addonType === 'dish-based') {
        apiData.name = formData.selectedDish.dishName + 
          (formData.selectedVariant ? ` - ${formData.selectedVariant.variantName}` : '');
        apiData.dishReference = formData.selectedDish._id;
        apiData.variantReference = formData.selectedVariant ? formData.selectedVariant._id : null;
      } else {
        apiData.name = formData.name;
        // Leave dishReference and variantReference undefined for custom add-ons
      }
      
      const url = addon
        ? `/api/menu/addons/${addon._id}`
        : '/api/menu/addons';
      const method = addon ? 'put' : 'post';
      
      const res = await axiosWithAuth[method](url, apiData);
      if (res.data.success) {
        toast.success(
          addon
            ? 'Add-on updated successfully'
            : 'Add-on created successfully'
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

  // If not a Zomato menu, display a message and return
  if (!isZomatoMenu && menuId) {
    return (
      <Alert severity="info">
        Add-ons are only available for Zomato ordering mode. This menu is configured for {menu?.orderMode || 'another'} mode.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {addon ? 'Edit Add-on' : 'Add New Add-on'}
      </Typography>
      <form onSubmit={handleSubmit}>
        {/* Add-on Type Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Add-on Type
          </Typography>
          <ToggleButtonGroup
            color="primary"
            value={addonType}
            exclusive
            onChange={handleAddonTypeChange}
            fullWidth
            disabled={addon !== null} // Disable type change when editing
          >
            <ToggleButton value="dish-based">Dish-based Add-on</ToggleButton>
            <ToggleButton value="custom">Custom Add-on</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {/* For dish-based add-ons, show dish selector */}
        {addonType === 'dish-based' && (
          <>
            <Autocomplete
              options={dishes}
              getOptionLabel={(option) => option.dishName}
              value={formData.selectedDish}
              onChange={handleDishChange}
              loading={loadingDishes}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Dish *"
                  margin="normal"
                  fullWidth
                  required
                />
              )}
            />
            {/* Variant selector - only show if the dish has variants */}
            {variants.length > 0 && (
              <Autocomplete
                options={variants}
                getOptionLabel={(option) => option.variantName}
                value={formData.selectedVariant}
                onChange={handleVariantChange}
                loading={loadingVariants}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Variant (Optional)"
                    margin="normal"
                    fullWidth
                    helperText="Leave empty to make add-on available for the base dish"
                  />
                )}
              />
            )}
          </>
        )}
        
        {/* For custom add-ons, show name field */}
        {addonType === 'custom' && (
          <TextField
            fullWidth
            label="Add-on Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
        )}
        
        {/* Price field - for both custom add-ons and dish-based add-ons */}
        <TextField
          fullWidth
          label="Price"
          name="price"
          type="number"
          value={formData.price}
          onChange={handlePriceChange}
          InputProps={{
            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
          }}
          margin="normal"
          required
          helperText={
            addonType === 'dish-based' 
              ? "Price is automatically mapped from the menu configuration but can be adjusted" 
              : "Enter the price for this add-on"
          }
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="addon-group-label">Add-on Group *</InputLabel>
          <Select
            labelId="addon-group-label"
            name="addonGroupId"
            value={formData.addonGroupId}
            onChange={handleChange}
            label="Add-on Group *"
            required
          >
            <MenuItem value="">
              <em>Select a group</em>
            </MenuItem>
            {addonGroups.map((group) => (
              <MenuItem key={group._id} value={group._id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControlLabel
          control={
            <Switch
              name="availabilityStatus"
              checked={formData.availabilityStatus}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Available"
          sx={{ mt: 1, display: 'block' }}
        />
        
        <Divider sx={{ my: 2 }} />
        
        {/* Description section */}
        <Typography variant="body2" color="text.secondary" mb={2}>
          {addonType === 'dish-based' ? (
            formData.selectedDish && formData.selectedVariant ? (
              <>This add-on will be available for
              <strong> {formData.selectedDish.dishName}</strong> -
              <strong> {formData.selectedVariant.variantName}</strong> variant only.</>
            ) : formData.selectedDish ? (
              <>This add-on will be available for
              <strong> {formData.selectedDish.dishName}</strong> (all variants).</>
            ) : (
              'Select a dish to create an add-on for it.'
            )
          ) : (
            'This is a custom add-on that is not linked to any specific dish.'
          )}
        </Typography>
        
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
            disabled={loading}
          >
            {loading ? 'Saving...' : addon ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default AddOnForm;
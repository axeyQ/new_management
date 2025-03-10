// src/components/menu/VariantForm.js
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
  CircularProgress,
  Divider,
  Grid,
  FormLabel,
  RadioGroup,
  Radio,
  InputAdornment,
  Alert,
  Chip
} from '@mui/material';
import {
  InventoryTwoTone as InventoryIcon,
  Inventory2 as RestockIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';
import OutOfStockModal from './OutOfStockModal';
import RestockModal from './RestockModal';

const VariantForm = ({ variant, dishId, onSuccess, onCancel }) => {
  const isEditMode = !!variant;
  const [loading, setLoading] = useState(false);
  
  // Stock status modals
  const [openOutOfStockModal, setOpenOutOfStockModal] = useState(false);
  const [openRestockModal, setOpenRestockModal] = useState(false);
  
  const [formData, setFormData] = useState({
    variantName: variant?.variantName || '',
    description: variant?.description || '',
    image: variant?.image || '',
    shortCode: variant?.shortCode || '',
    isAvailable: variant?.isAvailable !== false,
    
    // Packaging charges
    packagingCharges: {
      type: variant?.packagingCharges?.type || 'fixed',
      amount: variant?.packagingCharges?.amount || 0,
      appliedAt: variant?.packagingCharges?.appliedAt || 'dish'
    },
    
    // Delivery charges
    deliveryCharges: {
      type: variant?.deliveryCharges?.type || 'fixed',
      amount: variant?.deliveryCharges?.amount || 0,
      appliedAt: variant?.deliveryCharges?.appliedAt || 'dish'
    },
    
    // GST
    gstItemType: variant?.gstItemType || 'goods',
    
    // Nature tags
    natureTags: {
      cuisine: variant?.natureTags?.cuisine || '',
      spiciness: variant?.natureTags?.spiciness || '',
      sweetnessSaltness: variant?.natureTags?.sweetnessSaltness || '',
      texture: variant?.natureTags?.texture || '',
      oil: variant?.natureTags?.oil || '',
      temperature: variant?.natureTags?.temperature || '',
      cookingStyle: variant?.natureTags?.cookingStyle || '',
      other: variant?.natureTags?.other || ''
    },
    
    // Stats inclusion
    statInclusion: variant?.statInclusion === true
  });
  
  // Handle form field changes
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
  
  const handleNestedChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };
  
  // Stock status handlers
  const handleOutOfStockClick = () => {
    if (!variant) {
      toast.error('Please save the variant first before changing stock status');
      return;
    }
    setOpenOutOfStockModal(true);
  };
  
  const handleRestockClick = () => {
    if (!variant) {
      toast.error('Please save the variant first before changing stock status');
      return;
    }
    setOpenRestockModal(true);
  };
  
  const handleStockSuccess = (updatedVariant) => {
    toast.success('Stock status updated successfully');
    if (onSuccess) {
      onSuccess(updatedVariant);
    }
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.variantName.trim()) {
      toast.error('Variant name is required');
      return;
    }
    
    if (!dishId) {
      toast.error('Dish ID is required');
      return;
    }
    
    // Validate required nature tags
    if (!formData.natureTags.cuisine || 
        !formData.natureTags.spiciness || 
        !formData.natureTags.sweetnessSaltness || 
        !formData.natureTags.texture || 
        !formData.natureTags.oil || 
        !formData.natureTags.temperature || 
        !formData.natureTags.cookingStyle) {
      toast.error('All nature tags are required except "other"');
      return;
    }
    
    setLoading(true);
    
    try {
      // Add dishId to the data if this is a new variant
      const submitData = {
        ...formData,
        dishReference: dishId,
      };
      
      const url = isEditMode 
        ? `/api/menu/variants/${variant._id}` 
        : '/api/menu/variants';
      
      const method = isEditMode ? 'put' : 'post';
      
      const res = await axiosWithAuth[method](url, submitData);
      
      if (res.data.success) {
        toast.success(
          isEditMode 
            ? 'Variant updated successfully' 
            : 'Variant created successfully'
        );
        
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        toast.error(res.data.message || 'Failed to save variant');
      }
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          {isEditMode ? 'Edit Variant' : 'Create New Variant'}
        </Typography>
        
        {/* Show stock status controls only in edit mode */}
        {isEditMode && (
          <Box>
            {variant?.stockStatus?.isOutOfStock ? (
              <Button
                variant="outlined"
                color="success"
                startIcon={<RestockIcon />}
                onClick={handleRestockClick}
                sx={{ ml: 1 }}
              >
                Restock
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<InventoryIcon />}
                onClick={handleOutOfStockClick}
                sx={{ ml: 1 }}
              >
                Mark Out of Stock
              </Button>
            )}
          </Box>
        )}
      </Box>
      
      {/* Show out of stock indicator in edit mode */}
      {isEditMode && variant?.stockStatus?.isOutOfStock && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography>
              This variant is currently <strong>out of stock</strong>
              {variant.stockStatus.restockTime && (
                <> until {new Date(variant.stockStatus.restockTime).toLocaleString()}</>
              )}
              {variant.stockStatus.outOfStockReason && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Reason: {variant.stockStatus.outOfStockReason}
                </Typography>
              )}
            </Typography>
            <Chip label="Out of Stock" color="error" />
          </Box>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Variant Name"
              name="variantName"
              value={formData.variantName}
              onChange={handleChange}
              required
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Short Code"
              name="shortCode"
              value={formData.shortCode}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={2}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Image URL"
              name="image"
              value={formData.image}
              onChange={handleChange}
              margin="normal"
            />
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
              label="Available"
              sx={{ mt: 1, display: 'block' }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="statInclusion"
                  checked={formData.statInclusion}
                  onChange={handleSwitchChange}
                  color="primary"
                />
              }
              label="Include in Statistics"
              sx={{ mt: 1, display: 'block' }}
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Pricing & Tax Information
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl component="fieldset" margin="normal">
              <FormLabel component="legend">GST Item Type</FormLabel>
              <RadioGroup
                row
                name="gstItemType"
                value={formData.gstItemType}
                onChange={handleChange}
              >
                <FormControlLabel value="goods" control={<Radio />} label="Goods" />
                <FormControlLabel value="services" control={<Radio />} label="Services" />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* Packaging Charges Section */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle2" gutterBottom>Packaging Charges</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">Type</FormLabel>
                  <RadioGroup
                    row
                    value={formData.packagingCharges.type}
                    onChange={(e) => handleNestedChange('packagingCharges', 'type', e.target.value)}
                  >
                    <FormControlLabel value="fixed" control={<Radio />} label="Fixed" />
                    <FormControlLabel value="percentage" control={<Radio />} label="Percentage" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  InputProps={{ inputProps: { min: 0 } }}
                  value={formData.packagingCharges.amount}
                  onChange={(e) => handleNestedChange('packagingCharges', 'amount', parseFloat(e.target.value) || 0)}
                  margin="normal"
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">Applied At</FormLabel>
                  <RadioGroup
                    row
                    value={formData.packagingCharges.appliedAt}
                    onChange={(e) => handleNestedChange('packagingCharges', 'appliedAt', e.target.value)}
                  >
                    <FormControlLabel value="dish" control={<Radio />} label="Dish" />
                    <FormControlLabel value="billing" control={<Radio />} label="Billing" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Delivery Charges Section */}
          <Grid item xs={12} md={12}>
            <Typography variant="subtitle2" gutterBottom>Delivery Charges</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">Type</FormLabel>
                  <RadioGroup
                    row
                    value={formData.deliveryCharges.type}
                    onChange={(e) => handleNestedChange('deliveryCharges', 'type', e.target.value)}
                  >
                    <FormControlLabel value="fixed" control={<Radio />} label="Fixed" />
                    <FormControlLabel value="percentage" control={<Radio />} label="Percentage" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  InputProps={{ inputProps: { min: 0 } }}
                  value={formData.deliveryCharges.amount}
                  onChange={(e) => handleNestedChange('deliveryCharges', 'amount', parseFloat(e.target.value) || 0)}
                  margin="normal"
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">Applied At</FormLabel>
                  <RadioGroup
                    row
                    value={formData.deliveryCharges.appliedAt}
                    onChange={(e) => handleNestedChange('deliveryCharges', 'appliedAt', e.target.value)}
                  >
                    <FormControlLabel value="dish" control={<Radio />} label="Dish" />
                    <FormControlLabel value="billing" control={<Radio />} label="Billing" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Variant Nature Tags
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cuisine"
              value={formData.natureTags.cuisine}
              onChange={(e) => handleNestedChange('natureTags', 'cuisine', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Spiciness"
              value={formData.natureTags.spiciness}
              onChange={(e) => handleNestedChange('natureTags', 'spiciness', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Sweetness/Saltness"
              value={formData.natureTags.sweetnessSaltness}
              onChange={(e) => handleNestedChange('natureTags', 'sweetnessSaltness', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Texture"
              value={formData.natureTags.texture}
              onChange={(e) => handleNestedChange('natureTags', 'texture', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Oil"
              value={formData.natureTags.oil}
              onChange={(e) => handleNestedChange('natureTags', 'oil', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Temperature"
              value={formData.natureTags.temperature}
              onChange={(e) => handleNestedChange('natureTags', 'temperature', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Cooking Style"
              value={formData.natureTags.cookingStyle}
              onChange={(e) => handleNestedChange('natureTags', 'cookingStyle', e.target.value)}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Other Nature Tags"
              value={formData.natureTags.other}
              onChange={(e) => handleNestedChange('natureTags', 'other', e.target.value)}
              margin="normal"
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
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isEditMode ? (
              'Update Variant'
            ) : (
              'Create Variant'
            )}
          </Button>
        </Box>
      </form>
      
      {/* Out of Stock Modal */}
      <OutOfStockModal
        open={openOutOfStockModal}
        onClose={() => setOpenOutOfStockModal(false)}
        item={variant}
        itemType="variant"
        onSuccess={handleStockSuccess}
      />
      
      {/* Restock Modal */}
      <RestockModal
        open={openRestockModal}
        onClose={() => setOpenRestockModal(false)}
        item={variant}
        itemType="variant"
        onSuccess={handleStockSuccess}
      />
    </Paper>
  );
};

export default VariantForm;
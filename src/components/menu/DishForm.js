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
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
  Divider,
  Grid,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  ListSubheader,
  Alert,
} from '@mui/material';
import { CloudOff as OfflineIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import VariantFormSection from './VariantFormSection';
import { meatTypes } from './meatTypes';
import { useNetwork } from '@/context/NetworkContext';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const dietaryTags = ['veg', 'non veg', 'egg'];
const specialTags = ["Chef's Special", 'Gluten Free', 'Jain', 'Sugar Free', 'Vegan'];
const spiceLevels = ['Low Spicy', 'Medium Spicy', 'Very Spicy'];
const frostTypes = ['Freshly Frosted', 'Pre Frosted'];
const units = ['grams', 'ml', 'pieces'];
const allergens = ['Crustacean', 'Tree Nuts', 'Peanut', 'Gluten', 'Fish', 'Soybeans', 'Milk', 'Sulphate', 'Egg'];

const DishForm = ({ dish, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    dishName: dish?.dishName || '',
    image: dish?.image || '',
    subCategory: dish?.subCategory?.map(sc => sc._id) || [],
    description: dish?.description || '',
    shortCode: dish?.shortCode || '',
    dieteryTag: dish?.dieteryTag || 'veg',
    meatTypes: dish?.meatTypes || (dish?.dieteryTag === 'non veg' ? ['Chicken'] : []), // Default to Chicken for non-veg
    specialTag: dish?.specialTag || '',
    spiceLevel: dish?.spiceLevel || '',
    frostType: dish?.frostType || '',
    servingInfo: {
      portionSize: dish?.servingInfo?.portionSize || '',
      quantity: dish?.servingInfo?.quantity || '',
      unit: dish?.servingInfo?.unit || '',
      serves: dish?.servingInfo?.serves || ''
    },
    allergen: dish?.allergen || [],
    packagingCharges: {
      type: dish?.packagingCharges?.type || 'fixed',
      amount: dish?.packagingCharges?.amount || 0,
      appliedAt: dish?.packagingCharges?.appliedAt || 'dish'
    },
    deliveryCharges: {
      type: dish?.deliveryCharges?.type || 'fixed',
      amount: dish?.deliveryCharges?.amount || 0,
      appliedAt: dish?.deliveryCharges?.appliedAt || 'dish'
    },
    gstItemType: dish?.gstItemType || 'goods',
    natureTags: {
      cuisine: dish?.natureTags?.cuisine || '',
      spiciness: dish?.natureTags?.spiciness || '',
      sweetnessSaltness: dish?.natureTags?.sweetnessSaltness || '',
      texture: dish?.natureTags?.texture || '',
      oil: dish?.natureTags?.oil || '',
      temperature: dish?.natureTags?.temperature || '',
      cookingStyle: dish?.natureTags?.cookingStyle || '',
      other: dish?.natureTags?.other || ''
    }
  });

  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(true);
  const [variants, setVariants] = useState(dish?.variations || []);

  const { isOnline } = useNetwork();

  useEffect(() => {
    fetchSubCategories();
  }, []);

  useEffect(() => {
    if (dish?._id) {
      const fetchVariants = async () => {
        try {
          const res = await enhancedAxiosWithAuth.get(`/api/menu/dishes/${dish._id}/variants`);
          if (res.data.success) {
            setVariants(res.data.data);
          }
        } catch (error) {
          console.error('Error fetching variants:', error);
        }
      };
      fetchVariants();
    }
  }, [dish]);

  const handleVariantsChange = (updatedVariants) => {
    setVariants(updatedVariants);
  };

  const fetchSubCategories = async () => {
    try {
      const res = await enhancedAxiosWithAuth.get('/api/menu/subcategories');
      if (res.data.success) {
        setSubCategories(res.data.data);
        // Check if this is offline data
        if (res.data.isOfflineData) {
          console.log('Displaying cached subcategory data');
        }
      } else {
        toast.error('Failed to load subcategories');
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Error loading subcategories');
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // When dietary tag changes
    if (name === 'dieteryTag') {
      if (value === 'non veg') {
        // Set Chicken as default when switching to non-veg
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          meatTypes: prev.meatTypes.length > 0 ? prev.meatTypes : ['Chicken']
        }));
      } else {
        // Reset meat types when switching away from non-veg
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          meatTypes: []
        }));
      }
    } else {
      // Normal handling for other fields
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
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

  
  const handleArrayChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOfflineSubmission = async (formData, dish) => {
    try {
      // Generate a temporary ID if this is a new dish
      const tempId = dish ? dish._id : `temp_${Date.now()}`;
      
      // Prepare the dish object with required fields
      const dishToSave = {
        ...formData,
        _id: tempId,
        isTemp: !dish, // Only mark as temp if it's a new dish
        createdAt: dish?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to IndexedDB
      await idb.updateDish(dishToSave);
      
      // Queue the operation for later sync
      const operationId = `op_${Date.now()}`;
      await idb.queueOperation({
        id: operationId,
        type: dish ? 'UPDATE_DISH' : 'CREATE_DISH',
        method: dish ? 'put' : 'post',
        url: dish ? `/api/menu/dishes/${dish._id}` : '/api/menu/dishes',
        data: formData,
        tempId: dish ? null : tempId,
        timestamp: new Date().toISOString()
      });
      
      // Also save variants if needed
      if (variants.length > 0) {
        for (const variant of variants) {
          if (variant._id.toString().startsWith('temp-')) {
            // This is a new variant
            const variantData = {
              variantName: variant.variantName,
              description: variant.description || '',
              isAvailable: variant.isAvailable !== false,
              dishReference: tempId
            };
            
            const variantTempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Save to IndexedDB
            await idb.updateVariant({
              ...variantData,
              _id: variantTempId,
              isTemp: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            
            // Queue operation
            await idb.queueOperation({
              id: `op_var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              type: 'CREATE_VARIANT',
              method: 'post',
              url: '/api/menu/variants',
              data: variantData,
              tempId: variantTempId,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      return dishToSave;
    } catch (error) {
      console.error('Error in offline submission:', error);
      throw error;
    }
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.subCategory.length === 0) {
      toast.error('Please select at least one subcategory');
      return;
    }
    
    // Validate meat types for non-vegetarian dishes
    if (formData.dieteryTag === 'non veg' && formData.meatTypes.length === 0) {
      toast.error('Please select at least one meat type for non-vegetarian dish');
      return;
    }
    
    setLoading(true);
    
    try {
      // Add variants to the form data
      const dishData = {
        ...formData,
        variations: variants,
      };
      
      // Check if we're offline
      if (!isOnline) {
        // Handle offline submission
        const result = await handleOfflineSubmission(dishData, dish);
        toast.success(
          dish
            ? 'Dish will be updated when you are back online'
            : 'Dish will be created when you are back online'
        );
        onSuccess(result);
        return;
      }
      
      // Online submission
      const url = dish ? `/api/menu/dishes/${dish._id}` : '/api/menu/dishes';
      const method = dish ? 'put' : 'post';
      
      const res = await enhancedAxiosWithAuth[method](url, dishData);
      
      if (res.data.success) {
        // Check if this was an offline operation
        if (res.data.isOfflineOperation) {
          toast.success(
            dish
              ? 'Dish will be updated when you are back online'
              : 'Dish will be created when you are back online'
          );
        } else {
          toast.success(
            dish
              ? 'Dish updated successfully'
              : 'Dish created successfully'
          );
        }
        onSuccess(res.data.data);
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // If network error during offline mode
      if (!error.response && !navigator.onLine) {
        try {
          // Fallback to direct IndexedDB save
          const result = await handleOfflineSubmission(formData, dish);
          toast.success(
            dish
              ? 'Dish will be updated when you are back online'
              : 'Dish will be created when you are back online'
          );
          onSuccess(result);
        } catch (offlineError) {
          console.error('Offline fallback failed:', offlineError);
          toast.error('Failed to save dish for offline use');
        }
      } else {
        toast.error(error.response?.data?.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {dish ? 'Edit Dish' : 'Add New Dish'}
      </Typography>
      {/* Offline indicator */}
      {!isOnline && (
        <Alert
          severity="info"
          icon={<OfflineIcon />}
          sx={{ mb: 3 }}
        >
          You are offline. Changes will be saved locally and synchronized when you&apos;re back online.
        </Alert>
      )}
      
      {/* Temporary dish indicator */}
      {dish?.isTemp && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
        >
          This dish is pending synchronization with the server.
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Dish Name"
              name="dishName"
              value={formData.dishName}
              onChange={handleChange}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
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
              label="Image URL"
              name="image"
              value={formData.image}
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
              rows={3}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="subcategory-label">Subcategories</InputLabel>
              {loadingSubCategories ? (
                <CircularProgress size={24} sx={{ mt: 2 }} />
              ) : (
                <Select
                  labelId="subcategory-label"
                  name="subCategory"
                  multiple
                  value={formData.subCategory}
                  onChange={handleArrayChange}
                  input={<OutlinedInput label="Subcategories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const subCat = subCategories.find(sc => sc._id === value);
                        return (
                          <Chip key={value} label={subCat ? subCat.subCategoryName : value} />
                        );
                      })}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                  required
                >
                  {subCategories.map((subCategory) => (
                    <MenuItem key={subCategory._id} value={subCategory._id}>
                      {subCategory.subCategoryName}
                    </MenuItem>
                  ))}
                </Select>
              )}
              <FormHelperText>Select at least one subcategory</FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Dish Classification
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="dieteryTag-label">Dietary Type</InputLabel>
              <Select
                labelId="dieteryTag-label"
                name="dieteryTag"
                value={formData.dieteryTag}
                onChange={handleChange}
                label="Dietary Type"
                required
              >
                {dietaryTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="specialTag-label">Special Tag</InputLabel>
              <Select
                labelId="specialTag-label"
                name="specialTag"
                value={formData.specialTag}
                onChange={handleChange}
                label="Special Tag"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {specialTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Multi-select meat types field for non-veg dishes */}
          {formData.dieteryTag === 'non veg' && (
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="meat-types-label">Meat Types</InputLabel>
                <Select
                  labelId="meat-types-label"
                  name="meatTypes"
                  multiple
                  value={formData.meatTypes}
                  onChange={handleArrayChange}
                  input={<OutlinedInput label="Meat Types" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {/* Popular Options Group */}
                  <ListSubheader>Popular Options</ListSubheader>
                  {meatTypes["Popular Options"].map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                  
                  {/* Other Options Group */}
                  <ListSubheader>Other Options</ListSubheader>
                  {meatTypes["Other Options"].map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select meat types for non-vegetarian dish</FormHelperText>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="spiceLevel-label">Spice Level</InputLabel>
              <Select
                labelId="spiceLevel-label"
                name="spiceLevel"
                value={formData.spiceLevel}
                onChange={handleChange}
                label="Spice Level"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {spiceLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="frostType-label">Frost Type</InputLabel>
              <Select
                labelId="frostType-label"
                name="frostType"
                value={formData.frostType}
                onChange={handleChange}
                label="Frost Type"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {frostTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="allergen-label">Allergens</InputLabel>
              <Select
                labelId="allergen-label"
                name="allergen"
                multiple
                value={formData.allergen}
                onChange={handleArrayChange}
                input={<OutlinedInput label="Allergens" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {allergens.map((allergen) => (
                  <MenuItem key={allergen} value={allergen}>
                    {allergen}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Serving Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Portion Size"
              value={formData.servingInfo.portionSize}
              onChange={(e) => handleNestedChange('servingInfo', 'portionSize', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Serves"
              type="number"
              InputProps={{ inputProps: { min: 1 } }}
              value={formData.servingInfo.serves}
              onChange={(e) => handleNestedChange('servingInfo', 'serves', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              InputProps={{ inputProps: { min: 0 } }}
              value={formData.servingInfo.quantity}
              onChange={(e) => handleNestedChange('servingInfo', 'quantity', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="unit-label">Unit</InputLabel>
              <Select
                labelId="unit-label"
                value={formData.servingInfo.unit}
                onChange={(e) => handleNestedChange('servingInfo', 'unit', e.target.value)}
                label="Unit"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {units.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
        <VariantFormSection
          variants={variants}
          onChange={handleVariantsChange}
          dishId={dish?._id}
        />
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Dish Nature Tags (Optional)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cuisine"
              value={formData.natureTags.cuisine}
              onChange={(e) => handleNestedChange('natureTags', 'cuisine', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Spiciness"
              value={formData.natureTags.spiciness}
              onChange={(e) => handleNestedChange('natureTags', 'spiciness', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Sweetness/Saltness"
              value={formData.natureTags.sweetnessSaltness}
              onChange={(e) => handleNestedChange('natureTags', 'sweetnessSaltness', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Texture"
              value={formData.natureTags.texture}
              onChange={(e) => handleNestedChange('natureTags', 'texture', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Oil"
              value={formData.natureTags.oil}
              onChange={(e) => handleNestedChange('natureTags', 'oil', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Temperature"
              value={formData.natureTags.temperature}
              onChange={(e) => handleNestedChange('natureTags', 'temperature', e.target.value)}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Cooking Style"
              value={formData.natureTags.cookingStyle}
              onChange={(e) => handleNestedChange('natureTags', 'cookingStyle', e.target.value)}
              margin="normal"
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
            disabled={loading || loadingSubCategories}
          >
            {loading ? 'Saving...' : dish ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default DishForm;

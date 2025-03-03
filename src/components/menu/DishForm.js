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
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';
import VariantFormSection from './VariantFormSection';
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

  useEffect(() => {
    fetchSubCategories();
  }, []);
  const handleVariantsChange = (updatedVariants) => {
  setVariants(updatedVariants);
};
useEffect(() => {
  if (dish?._id) {
    const fetchVariants = async () => {
      try {
        const res = await axiosWithAuth.get(`/api/menu/dishes/${dish._id}/variants`);
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

  const fetchSubCategories = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/subcategories');
      if (res.data.success) {
        setSubCategories(res.data.data);
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
  
  const handleArrayChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.subCategory.length === 0) {
      toast.error('Please select at least one subcategory');
      return;
    }
    const submitData = {...formData};
    if (submitData.servingInfo && submitData.servingInfo.unit === '') {
      // Either set a default value
      submitData.servingInfo.unit = 'pieces';
      // Or remove the unit property altogether if it's empty
      // delete submitData.servingInfo.unit;
    }
    setLoading(true);
    
    try {
        // Add variants to the form data
    const dishData = {
      ...submitData,
      variations: variants, // Add this line to include variants
    };

      const url = dish
        ? `/api/menu/dishes/${dish._id}`
        : '/api/menu/dishes';
      
      const method = dish ? 'put' : 'post';
      
      const res = await axiosWithAuth[method](url, dishData);
      
      if (res.data.success) {
        toast.success(
          dish
            ? 'Dish updated successfully'
            : 'Dish created successfully'
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
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {dish ? 'Edit Dish' : 'Add New Dish'}
      </Typography>
      
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
              >
                {dietaryTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
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
          
          <Grid item xs={12} md={6}>
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
          
          <Grid item xs={12} md={6}>
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
          
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">Packaging Charges Type</FormLabel>
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
        </Grid>
        <Divider sx={{ my: 3 }} />
<VariantFormSection 
  variants={variants} 
  onChange={handleVariantsChange} 
  dishId={dish?._id}
/>
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Dish Nature Tags
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
}
export default DishForm;
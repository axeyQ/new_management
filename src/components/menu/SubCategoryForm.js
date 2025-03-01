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
  CircularProgress 
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const SubCategoryForm = ({ subCategory, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    subCategoryName: subCategory?.subCategoryName || '',
    image: subCategory?.image || '',
    category: subCategory?.category?._id || subCategory?.category || '',
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const fetchCategories = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      } else {
        toast.error('Failed to load categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error loading categories');
    } finally {
      setLoadingCategories(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error('Please select a parent category');
      return;
    }
    
    setLoading(true);
    
    try {

        const token = localStorage.getItem('token');
    
        // Create config with Authorization header
        const config = {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        };
      const url = subCategory
        ? `/api/menu/subcategories/${subCategory._id}`
        : '/api/menu/subcategories';
      
      const method = subCategory ? 'put' : 'post';
      
      const res = await axiosWithAuth[method](url, formData);
      
      if (res.data.success) {
        toast.success(
          subCategory
            ? 'Subcategory updated successfully'
            : 'Subcategory created successfully'
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
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {subCategory ? 'Edit Subcategory' : 'Add New Subcategory'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Subcategory Name"
          name="subCategoryName"
          value={formData.subCategoryName}
          onChange={handleChange}
          required
          margin="normal"
        />
        
        <TextField
          fullWidth
          label="Image URL"
          name="image"
          value={formData.image}
          onChange={handleChange}
          margin="normal"
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="category-label">Parent Category</InputLabel>
          {loadingCategories ? (
            <CircularProgress size={24} sx={{ mt: 2 }} />
          ) : (
            <Select
              labelId="category-label"
              name="category"
              value={formData.category}
              onChange={handleChange}
              label="Parent Category"
              required
            >
              {categories.map((category) => (
                <MenuItem key={category._id} value={category._id}>
                  {category.categoryName} ({category.parentCategory})
                </MenuItem>
              ))}
            </Select>
          )}
        </FormControl>
        
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
            disabled={loading || loadingCategories}
          >
            {loading ? 'Saving...' : subCategory ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default SubCategoryForm;
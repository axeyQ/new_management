// src/components/menu/CategoryForm.js
'use client';

import { useState } from 'react';
import { 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem 
} from '@mui/material';
import toast from 'react-hot-toast';
import axios from 'axios';
import axiosWithAuth from '@/lib/axiosWithAuth';

const CategoryForm = ({ category, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    categoryName: category?.categoryName || '',
    image: category?.image || '',
    parentCategory: category?.parentCategory || 'food',
  });
  
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = category
        ? `/api/menu/categories/${category._id}`
        : '/api/menu/categories';
      
      // Use the axiosWithAuth instance instead of regular axios
      const res = category
        ? await axiosWithAuth.put(url, formData)
        : await axiosWithAuth.post(url, formData);
      
      if (res.data.success) {
        toast.success(
          category
            ? 'Category updated successfully'
            : 'Category created successfully'
        );
        onSuccess(res.data.data);
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error submitting form:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {category ? 'Edit Category' : 'Add New Category'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Category Name"
          name="categoryName"
          value={formData.categoryName}
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
          <InputLabel id="parentCategory-label">Parent Category</InputLabel>
          <Select
            labelId="parentCategory-label"
            name="parentCategory"
            value={formData.parentCategory}
            onChange={handleChange}
            label="Parent Category"
          >
            <MenuItem value="food">Food</MenuItem>
            <MenuItem value="beverage">Beverage</MenuItem>
          </Select>
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
            disabled={loading}
          >
            {loading ? 'Saving...' : category ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default CategoryForm;
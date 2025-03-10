// src/components/menu/CategoryForm.js - Enhanced version
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
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudOff as OfflineIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import { useNetwork } from '@/context/NetworkContext';
import { ErrorRecoveryUI } from '@/lib/errorRecoverySystem';

const CategoryForm = ({ category, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    categoryName: category?.categoryName || '',
    image: category?.image || '',
    parentCategory: category?.parentCategory || 'food',
  });
  
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { isOnline } = useNetwork();
  
  // Reset validation errors when form data changes
  useEffect(() => {
    setValidationErrors({});
  }, [formData]);
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.categoryName.trim()) {
      errors.categoryName = 'Category name is required';
    } else if (formData.categoryName.length < 2) {
      errors.categoryName = 'Category name must be at least 2 characters';
    } else if (formData.categoryName.length > 50) {
      errors.categoryName = 'Category name must be less than 50 characters';
    }
    
    if (formData.image && !isValidUrl(formData.image)) {
      errors.image = 'Please enter a valid URL';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
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
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const url = category
        ? `/api/menu/categories/${category._id}`
        : '/api/menu/categories';
        
      // Use the enhanced axios instance
      const res = category
        ? await enhancedAxiosWithAuth.put(url, formData)
        : await enhancedAxiosWithAuth.post(url, formData);
      
      if (res.data.isOfflineOperation) {
        // If offline operation
        toast.success(
          category
            ? 'Category will be updated when you are back online'
            : 'Category will be created when you are back online'
        );
        onSuccess(res.data.data);
      } else if (res.data.success) {
        // If online operation
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
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      } else {
        toast.error(error.response?.data?.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {category ? 'Edit Category' : 'Add New Category'}
      </Typography>
      
      {!isOnline && (
        <Alert 
          severity="info" 
          icon={<OfflineIcon />}
          sx={{ mb: 3 }}
        >
          You are offline. Changes will be saved locally and synchronized when you&apos;re back online.
        </Alert>
      )}
      
      {category?.isTemp && (
        <Alert 
          severity="warning"
          sx={{ mb: 3 }}
        >
          This category is pending synchronization with the server.
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Category Name"
          name="categoryName"
          value={formData.categoryName}
          onChange={handleChange}
          required
          margin="normal"
          error={!!validationErrors.categoryName}
          helperText={validationErrors.categoryName}
        />
        
        <TextField
          fullWidth
          label="Image URL"
          name="image"
          value={formData.image}
          onChange={handleChange}
          margin="normal"
          error={!!validationErrors.image}
          helperText={validationErrors.image}
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
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : category ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default CategoryForm;
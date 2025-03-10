// src/components/menu/SubCategoryForm.js - Enhanced with offline support
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
  CircularProgress,
  Alert,
  FormHelperText
} from '@mui/material';
import { CloudOff as OfflineIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';

const SubCategoryForm = ({ subCategory, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    subCategoryName: subCategory?.subCategoryName || '',
    image: subCategory?.image || '',
    category: subCategory?.category?._id || subCategory?.category || '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const { isOnline } = useNetwork();

  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Reset validation errors when form data changes
  useEffect(() => {
    setValidationErrors({});
  }, [formData]);

  const fetchCategories = async () => {
    try {
      // Try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get('/api/menu/categories');
          if (res.data.success) {
            setCategories(res.data.data);
            setLoadingCategories(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching categories from server, falling back to IndexedDB:', error);
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedCategories = await idb.getCategories();
      
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories);
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
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.subCategoryName.trim()) {
      errors.subCategoryName = 'Subcategory name is required';
    } else if (formData.subCategoryName.length < 2) {
      errors.subCategoryName = 'Subcategory name must be at least 2 characters';
    } else if (formData.subCategoryName.length > 50) {
      errors.subCategoryName = 'Subcategory name must be less than 50 characters';
    }
    
    if (!formData.category) {
      errors.category = 'Parent category is required';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const url = subCategory
        ? `/api/menu/subcategories/${subCategory._id}`
        : '/api/menu/subcategories';
        
      // Use our enhanced axios instance
      const res = subCategory
        ? await enhancedAxiosWithAuth.put(url, formData)
        : await enhancedAxiosWithAuth.post(url, formData);
      
      if (res.data.isOfflineOperation) {
        // If offline operation
        toast.success(
          subCategory
            ? 'Subcategory will be updated when you are back online'
            : 'Subcategory will be created when you are back online'
        );
        onSuccess(res.data.data);
      } else if (res.data.success) {
        // If online operation
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
        {subCategory ? 'Edit Subcategory' : 'Add New Subcategory'}
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
      
      {subCategory?.isTemp && (
        <Alert 
          severity="warning"
          sx={{ mb: 3 }}
        >
          This subcategory is pending synchronization with the server.
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Subcategory Name"
          name="subCategoryName"
          value={formData.subCategoryName}
          onChange={handleChange}
          required
          margin="normal"
          error={!!validationErrors.subCategoryName}
          helperText={validationErrors.subCategoryName}
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
        
        <FormControl fullWidth margin="normal" error={!!validationErrors.category}>
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
          {validationErrors.category && (
            <FormHelperText>{validationErrors.category}</FormHelperText>
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
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : subCategory ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default SubCategoryForm;
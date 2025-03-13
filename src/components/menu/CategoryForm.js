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
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';

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

  const handleOfflineSubmission = async (formData, category, onSuccess) => {
    console.log('Emergency offline handler triggered for Category');
    // Generate a temporary ID
    const tempId = `temp_${Date.now()}`;
  
    // Create a temporary category object with the form data
    const tempCategory = {
      ...formData,
      _id: tempId,
      isTemp: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stockStatus: {
        isOutOfStock: false,
        autoRestock: true,
        orderModes: {}
      }
    };
    
    // Handle success message
    toast.success(
      category
        ? 'Category will be updated when you are back online'
        : 'Category will be created when you are back online'
    );
    
    // Call the onSuccess callback with the temporary data
    onSuccess(tempCategory);
    
    // Also try to manually save to IndexedDB if possible
    try {
      // Save to IndexedDB
      await idb.updateCategory(tempCategory);
      
      // Also queue the operation
      await idb.queueOperation({
        id: tempId,
        type: category ? 'UPDATE_CATEGORY' : 'CREATE_CATEGORY',
        method: category ? 'put' : 'post',
        url: category ? `/api/menu/categories/${category._id}` : '/api/menu/categories',
        data: formData,
        tempId: tempId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Queued ${category ? 'UPDATE' : 'CREATE'}_CATEGORY operation with tempId: ${tempId}`);
    } catch (e) {
      console.log('Manual IndexedDB save failed', e);
      // This is just a backup, so we don't need to handle the error
    }
  };

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

  const saveCategoryToIndexedDB = async (categoryData, isTemp = true) => {
    try {
      // Generate a temp ID if needed
      const tempId = isTemp ? `temp_${Date.now()}` : categoryData._id;
      
      // Prepare category data with required fields
      const categoryToSave = {
        ...categoryData,
        _id: tempId,
        isTemp: isTemp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stockStatus: categoryData.stockStatus || {
          isOutOfStock: false,
          autoRestock: true,
          orderModes: {}
        }
      };
      
      console.log(`Saving ${isTemp ? 'temporary' : ''} category to IndexedDB:`, categoryToSave);
      
      // Save to IndexedDB
      await idb.updateCategory(categoryToSave);
      
      // If temp category, also queue the operation for later sync
      if (isTemp) {
        await idb.queueOperation({
          id: `op_${Date.now()}`,
          type: 'CREATE_CATEGORY',
          method: 'post',
          url: '/api/menu/categories',
          data: categoryData, // Original form data
          tempId: tempId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Queued CREATE_CATEGORY operation with tempId: ${tempId}`);
      }
      
      return { success: true, data: categoryToSave };
    } catch (error) {
      console.error('Error saving category to IndexedDB:', error);
      return { success: false, error };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Check if we're offline first - handle it directly if we are
    if (!navigator.onLine) {
      handleOfflineSubmission(formData, category, onSuccess);
      return;
    }
    
    setLoading(true);
    
    // Set a timeout to prevent the form from hanging forever
    const timeoutId = setTimeout(() => {
      console.log('Form submission timeout - forcing completion');
      setLoading(false);
      
      // If we're offline, handle it directly
      if (!navigator.onLine) {
        handleOfflineSubmission(formData, category, onSuccess);
      } else {
        toast.error('The request is taking too long. Please try again.');
      }
    }, 5000); // 5 second timeout
    
    try {
      const url = category ? `/api/menu/categories/${category._id}` : '/api/menu/categories';
      const method = category ? 'put' : 'post';
      
      console.log(`Submitting form to ${url} with method ${method}`);
      
      // Use the enhanced axios instance
      const res = await enhancedAxiosWithAuth[method](url, formData);
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      console.log('Form submission response:', res.data);
      
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
      
      // Check if this is a network error during offline mode
      if (!error.response && !navigator.onLine) {
        console.log('Handling offline submission with direct IndexedDB save');
        
        // Explicitly save to IndexedDB and queue operation
        const result = await saveCategoryToIndexedDB(formData);
        
        if (result.success) {
          toast.success(
            category
              ? 'Category will be updated when you are back online'
              : 'Category will be created when you are back online'
          );
          onSuccess(result.data);
        } else {
          toast.error('Failed to save category for offline use');
        }
        
        setLoading(false);
        return;
      }
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      } else {
        toast.error(error.response?.data?.message || 'An error occurred');
      }
    } finally {
      // Make absolutely sure loading state is cleared except if we've already handled offline submission
      if (navigator.onLine) {
        setLoading(false);
      }
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
          You are offline. Changes will be saved locally and synchronized when you
          &apos;re back online.
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
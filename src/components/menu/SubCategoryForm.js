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

  const handleOfflineSubmission = async (formData, subCategory, onSuccess) => {
    console.log('Emergency offline handler triggered for SubCategory');
    
    // Generate a temporary ID
    const tempId = `temp_${Date.now()}`;
    
    // Create a temporary subcategory object with the form data
    const tempSubCategory = {
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
      subCategory
        ? 'Subcategory will be updated when you are back online'
        : 'Subcategory will be created when you are back online'
    );
    
    // Call the onSuccess callback with the temporary data
    onSuccess(tempSubCategory);
    
    // Also try to manually save to IndexedDB if possible
    try {
      // Save to IndexedDB
      await idb.updateSubcategory(tempSubCategory);
      
      // Also queue the operation
      await idb.queueOperation({
        id: tempId,
        type: subCategory ? 'UPDATE_SUBCATEGORY' : 'CREATE_SUBCATEGORY',
        method: subCategory ? 'put' : 'post',
        url: subCategory ? `/api/menu/subcategories/${subCategory._id}` : '/api/menu/subcategories',
        data: formData,
        tempId: tempId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Queued ${subCategory ? 'UPDATE' : 'CREATE'}_SUBCATEGORY operation with tempId: ${tempId}`);
    } catch (e) {
      console.log('Manual IndexedDB save failed', e);
      // This is just a backup, so we don't need to handle the error
    }
  };
  
  // Add this function for better IndexedDB saving with error recovery
  const saveSubcategoryToIndexedDB = async (subcategoryData, isTemp = true) => {
    try {
      // Generate a temp ID if needed
      const tempId = isTemp ? `temp_${Date.now()}` : subcategoryData._id;
      
      // Prepare subcategory data with required fields
      const subcategoryToSave = {
        ...subcategoryData,
        _id: tempId,
        isTemp: isTemp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stockStatus: subcategoryData.stockStatus || {
          isOutOfStock: false,
          autoRestock: true,
          orderModes: {}
        }
      };
      
      // Handle category relationship properly
      // If category is an object with _id, keep just the _id
      if (subcategoryToSave.category && typeof subcategoryToSave.category === 'object' && subcategoryToSave.category._id) {
        subcategoryToSave.originalCategory = subcategoryToSave.category;
        subcategoryToSave.category = subcategoryToSave.category._id;
      }
      
      console.log(`Saving ${isTemp ? 'temporary' : ''} subcategory to IndexedDB:`, subcategoryToSave);
      
      // Save to IndexedDB
      await idb.updateSubcategory(subcategoryToSave);
      
      // If temp subcategory, also queue the operation for later sync
      if (isTemp) {
        // Prepare clean data for sync
        const cleanData = { ...subcategoryData };
        
        // Make sure category is just an ID for the API
        if (cleanData.category && typeof cleanData.category === 'object' && cleanData.category._id) {
          cleanData.category = cleanData.category._id;
        }
        
        await idb.queueOperation({
          id: `op_${Date.now()}`,
          type: 'CREATE_SUBCATEGORY',
          method: 'post',
          url: '/api/menu/subcategories',
          data: cleanData, // Cleaned form data
          tempId: tempId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Queued CREATE_SUBCATEGORY operation with tempId: ${tempId}`);
      }
      
      return { success: true, data: subcategoryToSave };
    } catch (error) {
      console.error('Error saving subcategory to IndexedDB:', error);
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
      setLoading(true); // Start loading
      try {
        await handleOfflineSubmission(formData, subCategory, onSuccess);
      } catch (error) {
        console.error('Offline submission error:', error);
        toast.error('Failed to save subcategory for offline use');
      } finally {
        setLoading(false); // Make sure loading is reset in offline mode
      }
      return;
    }
    
    setLoading(true);
    
    // Set a timeout to prevent the form from hanging forever
    const timeoutId = setTimeout(() => {
      console.log('Form submission timeout - forcing completion');
      setLoading(false);
      
      // If we're offline, handle it directly
      if (!navigator.onLine) {
        handleOfflineSubmission(formData, subCategory, onSuccess);
      } else {
        toast.error('The request is taking too long. Please try again.');
      }
    }, 5000); // 5 second timeout
    
    try {
      const url = subCategory ? `/api/menu/subcategories/${subCategory._id}` : '/api/menu/subcategories';
      const method = subCategory ? 'put' : 'post';
      
      console.log(`Submitting form to ${url} with method ${method}`);
      
      // Use the enhanced axios instance
      const res = await enhancedAxiosWithAuth[method](url, formData);
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      console.log('Form submission response:', res.data);
      
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
      
      // Check if this is a network error during offline mode
      if (!error.response && !navigator.onLine) {
        console.log('Handling offline submission with direct IndexedDB save');
        
        // Explicitly save to IndexedDB and queue operation
        const result = await saveSubcategoryToIndexedDB(formData);
        
        if (result.success) {
          toast.success(
            subCategory
              ? 'Subcategory will be updated when you are back online'
              : 'Subcategory will be created when you are back online'
          );
          onSuccess(result.data);
        } else {
          toast.error('Failed to save subcategory for offline use');
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
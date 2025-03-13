'use client';
import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudOff as OfflineIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';

const TableTypeForm = ({ tableType, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    tableTypeName: tableType?.tableTypeName || '',
    tableTypeDescription: tableType?.tableTypeDescription || '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Get network status
  const { isOnline } = useNetwork();

  // Reset validation errors when form data changes
  useEffect(() => {
    setValidationErrors({});
  }, [formData]);

  const handleOfflineSubmission = (formData, tableType, onSuccess) => {
    console.log('Emergency offline handler triggered for TableType');
    
    // Generate a temporary ID
    const tempId = `temp_${Date.now()}`;
    
    // Create a temporary table type object with the form data
    const tempTableType = {
      ...formData,
      _id: tempId,
      isTemp: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Handle success message
    toast.success(
      tableType
        ? 'Table type will be updated when you are back online'
        : 'Table type will be created when you are back online'
    );
    
    // Call the onSuccess callback with the temporary data
    onSuccess(tempTableType);
    
    // Also try to manually save to IndexedDB if possible
    try {
      import('@/lib/indexedDBService').then(idb => {
        idb.updateTableType(tempTableType);
        
        // Also queue the operation
        idb.queueOperation({
          id: tempId,
          type: tableType ? 'UPDATE_TABLE_TYPE' : 'CREATE_TABLE_TYPE',
          method: tableType ? 'put' : 'post',
          url: tableType ? `/api/tables/types/${tableType._id}` : '/api/tables/types',
          data: formData,
          tempId: tempId,
          timestamp: new Date().toISOString()
        });
      });
    } catch (e) {
      console.log('Manual IndexedDB save failed', e);
      // This is just a backup, so we don't need to handle the error
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
    if (!formData.tableTypeName.trim()) {
      errors.tableTypeName = 'Table type name is required';
    } else if (formData.tableTypeName.length < 2) {
      errors.tableTypeName = 'Table type name must be at least 2 characters';
    } else if (formData.tableTypeName.length > 50) {
      errors.tableTypeName = 'Table type name must be less than 50 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveTableTypeToIndexedDB = async (tableTypeData, isTemp = true) => {
    try {
      // Import indexedDBService dynamically to avoid circular dependencies
      const idb = await import('@/lib/indexedDBService');
      
      // Generate a temp ID if needed
      const tempId = isTemp ? `temp_${Date.now()}` : tableTypeData._id;
      
      // Prepare table type data with required fields
      const tableTypeToSave = {
        ...tableTypeData,
        _id: tempId,
        isTemp: isTemp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log(`Saving ${isTemp ? 'temporary' : ''} table type to IndexedDB:`, tableTypeToSave);
      
      // Save to IndexedDB
      await idb.updateTableType(tableTypeToSave);
      
      // If temp table type, also queue the operation for later sync
      if (isTemp) {
        await idb.queueOperation({
          id: `op_${Date.now()}`,
          type: 'CREATE_TABLE_TYPE',
          method: 'post',
          url: '/api/tables/types',
          data: tableTypeData, // Original form data
          tempId: tempId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Queued CREATE_TABLE_TYPE operation with tempId: ${tempId}`);
      }
      
      return { success: true, data: tableTypeToSave };
    } catch (error) {
      console.error('Error saving table type to IndexedDB:', error);
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
      handleOfflineSubmission(formData, tableType, onSuccess);
      return;
    }
    
    setLoading(true);
    
    // Set a timeout to prevent the form from hanging forever
    const timeoutId = setTimeout(() => {
      console.log('Form submission timeout - forcing completion');
      setLoading(false);
      
      // If we're offline, handle it directly
      if (!navigator.onLine) {
        handleOfflineSubmission(formData, tableType, onSuccess);
      } else {
        toast.error('The request is taking too long. Please try again.');
      }
    }, 5000); // 5 second timeout
    
    try {
      const url = tableType ? `/api/tables/types/${tableType._id}` : '/api/tables/types';
      const method = tableType ? 'put' : 'post';
      
      console.log(`Submitting form to ${url} with method ${method}`);
      
      // Use the enhanced axios instance for offline support
      const res = await enhancedAxiosWithAuth[method](url, formData);
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      console.log('Form submission response:', res.data);
      
      if (res.data.isOfflineOperation) {
        // If offline operation
        toast.success(
          tableType
            ? 'Table type will be updated when you are back online'
            : 'Table type will be created when you are back online'
        );
        onSuccess(res.data.data);
      } else if (res.data.success) {
        // If online operation
        toast.success(
          tableType
            ? 'Table type updated successfully'
            : 'Table type created successfully'
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
        const result = await saveTableTypeToIndexedDB(formData);
        
        if (result.success) {
          toast.success(
            tableType
              ? 'Table type will be updated when you are back online'
              : 'Table type will be created when you are back online'
          );
          
          onSuccess(result.data);
        } else {
          toast.error('Failed to save table type for offline use');
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
        {tableType ? 'Edit Table Type' : 'Add New Table Type'}
      </Typography>
      
      {!isOnline && (
        <Alert
          severity="info"
          icon={<OfflineIcon />}
          sx={{ mb: 3 }}
        >
          You are offline. Changes will be saved locally and
          synchronized when you&apos;re back online.
        </Alert>
      )}
      
      {tableType?.isTemp && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
        >
          This table type is pending synchronization with the server.
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Type Name"
          name="tableTypeName"
          value={formData.tableTypeName}
          onChange={handleChange}
          required
          margin="normal"
          error={!!validationErrors.tableTypeName}
          helperText={validationErrors.tableTypeName}
        />
        
        <TextField
          fullWidth
          label="Description"
          name="tableTypeDescription"
          value={formData.tableTypeDescription}
          onChange={handleChange}
          multiline
          rows={3}
          margin="normal"
        />
        
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
            {loading ? 'Saving...' : tableType ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TableTypeForm;
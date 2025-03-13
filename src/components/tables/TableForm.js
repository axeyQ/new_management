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
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudOff as OfflineIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';

const TableForm = ({ table, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    tableName: table?.tableName || '',
    tableDescription: table?.tableDescription || '',
    image: table?.image || '',
    capacity: table?.capacity || 1,
    status: table?.status !== undefined ? table.status : true,
    tableType: table?.tableType?._id || table?.tableType || '',
    positionX: table?.positionX || 0,
    positionY: table?.positionY || 0,
  });

  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTableTypes, setLoadingTableTypes] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Get network status
  const { isOnline } = useNetwork();
  const handleOfflineSubmission = (formData, table, onSuccess) => {
    console.log('Emergency offline handler triggered');
    
    // Generate a temporary ID
    const tempId = `temp_${Date.now()}`;
    
    // Create a temporary table object with the form data
    const tempTable = {
      ...formData,
      _id: tempId,
      isTemp: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add any required fields for display
    if (typeof formData.tableType === 'string') {
      tempTable.tableType = formData.tableType;
    }
    
    // Handle success message
    toast.success(
      table
        ? 'Table will be updated when you are back online'
        : 'Table will be created when you are back online'
    );
    
    // Call the onSuccess callback with the temporary data
    onSuccess(tempTable);
    
    // Also try to manually save to IndexedDB if possible
    try {
      import('@/lib/indexedDBService').then(idb => {
        idb.updateTable(tempTable);
        
        // Also queue the operation
        idb.queueOperation({
          id: tempId,
          type: table ? 'UPDATE_TABLE' : 'CREATE_TABLE',
          method: table ? 'put' : 'post',
          url: table ? `/api/tables/${table._id}` : '/api/tables',
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
  useEffect(() => {
    fetchTableTypes();
  }, []);

  // Reset validation errors when form data changes
  useEffect(() => {
    setValidationErrors({});
  }, [formData]);

  const fetchTableTypes = async () => {
    try {
      // Try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get('/api/tables/types');
          if (res.data.success) {
            setTableTypes(res.data.data);
            setLoadingTableTypes(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedTableTypes = await idb.getTableTypes();
      if (cachedTableTypes.length > 0) {
        setTableTypes(cachedTableTypes);
      } else {
        toast.error('Failed to load table types');
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
      toast.error('Failed to load table types');
    } finally {
      setLoadingTableTypes(false);
    }
  };

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

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value, 10) || 0,
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.tableName.trim()) {
      errors.tableName = 'Table name is required';
    } else if (formData.tableName.length < 2) {
      errors.tableName = 'Table name must be at least 2 characters';
    } else if (formData.tableName.length > 50) {
      errors.tableName = 'Table name must be less than 50 characters';
    }
    
    if (!formData.tableType) {
      errors.tableType = 'Table type is required';
    }
    
    if (formData.capacity < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const saveTableToIndexedDB = async (tableData, isTemp = true) => {
    try {
      // Import indexedDBService dynamically to avoid circular dependencies
      const idb = await import('@/lib/indexedDBService');
      
      // Generate a temp ID if needed
      const tempId = isTemp ? `temp_${Date.now()}` : tableData._id;
      
      // Prepare table data with required fields
      const tableToSave = {
        ...tableData,
        _id: tempId,
        isTemp: isTemp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log(`Saving ${isTemp ? 'temporary' : ''} table to IndexedDB:`, tableToSave);
      
      // Save to IndexedDB
      await idb.updateTable(tableToSave);
      
      // If temp table, also queue the operation for later sync
      if (isTemp) {
        await idb.queueOperation({
          id: `op_${Date.now()}`,
          type: 'CREATE_TABLE',
          method: 'post',
          url: '/api/tables',
          data: tableData, // Original form data
          tempId: tempId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Queued CREATE_TABLE operation with tempId: ${tempId}`);
      }
      
      return { success: true, data: tableToSave };
    } catch (error) {
      console.error('Error saving table to IndexedDB:', error);
      return { success: false, error };
    }
  };
// Update the handleSubmit function in your TableForm.js component

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  // Check if we're offline first - handle it directly if we are
  if (!navigator.onLine) {
    handleOfflineSubmission(formData, table, onSuccess);
    return;
  }
  
  setLoading(true);
  
  // Set a timeout to prevent the form from hanging forever
  const timeoutId = setTimeout(() => {
    console.log('Form submission timeout - forcing completion');
    setLoading(false);
    
    // If we're offline, handle it directly
    if (!navigator.onLine) {
      handleOfflineSubmission(formData, table, onSuccess);
    } else {
      toast.error('The request is taking too long. Please try again.');
    }
  }, 5000); // 5 second timeout
  
  try {
    const url = table ? `/api/tables/${table._id}` : '/api/tables';
    const method = table ? 'put' : 'post';
    
    console.log(`Submitting form to ${url} with method ${method}`);
    
    // Use the enhanced axios instance for offline support
    const res = await enhancedAxiosWithAuth[method](url, formData);
    
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);
    
    console.log('Form submission response:', res.data);
    
    if (res.data.isOfflineOperation) {
      // If offline operation
      toast.success(
        table
          ? 'Table will be updated when you are back online'
          : 'Table will be created when you are back online'
      );
      onSuccess(res.data.data);
    } else if (res.data.success) {
      // If online operation
      toast.success(
        table
          ? 'Table updated successfully'
          : 'Table created successfully'
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
    const result = await saveTableToIndexedDB(formData);
    
    if (result.success) {
      toast.success(
        table
          ? 'Table will be updated when you are back online'
          : 'Table will be created when you are back online'
      );
      
      onSuccess(result.data);
    } else {
      toast.error('Failed to save table for offline use');
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
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {table ? 'Edit Table' : 'Add New Table'}
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
      
      {table?.isTemp && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
        >
          This table is pending synchronization with the server.
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Table Name"
          name="tableName"
          value={formData.tableName}
          onChange={handleChange}
          required
          margin="normal"
          error={!!validationErrors.tableName}
          helperText={validationErrors.tableName}
        />
        
        <TextField
          fullWidth
          label="Description"
          name="tableDescription"
          value={formData.tableDescription}
          onChange={handleChange}
          multiline
          rows={2}
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
        
        <Box display="flex" gap={2}>
          <TextField
            label="Capacity"
            name="capacity"
            type="number"
            value={formData.capacity}
            onChange={handleNumberChange}
            margin="normal"
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ flex: 1 }}
            error={!!validationErrors.capacity}
            helperText={validationErrors.capacity}
          />
          
          <FormControl 
            fullWidth 
            margin="normal" 
            sx={{ flex: 1 }}
            error={!!validationErrors.tableType}
          >
            <InputLabel id="tableType-label">Table Type</InputLabel>
            {loadingTableTypes ? (
              <CircularProgress size={24} sx={{ mt: 2 }} />
            ) : (
              <Select
                labelId="tableType-label"
                name="tableType"
                value={formData.tableType}
                onChange={handleChange}
                label="Table Type"
                required
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {tableTypes.map((type) => (
                  <MenuItem key={type._id} value={type._id}>
                    {type.tableTypeName}
                  </MenuItem>
                ))}
              </Select>
            )}
            {validationErrors.tableType && (
              <Typography color="error" variant="caption">
                {validationErrors.tableType}
              </Typography>
            )}
          </FormControl>
        </Box>
        
        <Box display="flex" gap={2}>
          <TextField
            label="Position X"
            name="positionX"
            type="number"
            value={formData.positionX}
            onChange={handleNumberChange}
            margin="normal"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Position Y"
            name="positionY"
            type="number"
            value={formData.positionY}
            onChange={handleNumberChange}
            margin="normal"
            sx={{ flex: 1 }}
          />
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              name="status"
              checked={formData.status}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Available"
          sx={{ mt: 1, display: 'block' }}
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
            disabled={loading || loadingTableTypes}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : table ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TableForm;
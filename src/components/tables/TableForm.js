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
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

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
  
  useEffect(() => {
    fetchTableTypes();
  }, []);
  
  const fetchTableTypes = async () => {
    try {
      const res = await axiosWithAuth.get('/api/tables/types');
      if (res.data.success) {
        setTableTypes(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
      toast.error('Failed to load table types');
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate table type is selected
      if (!formData.tableType) {
        toast.error('Table type is required');
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      const url = table
        ? `/api/tables/${table._id}`
        : '/api/tables';
      
      const method = table ? 'put' : 'post';
      
      console.log('Sending table data:', formData);
      
      const res = await axiosWithAuth[method](url, formData, config);
      
      if (res.data.success) {
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
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {table ? 'Edit Table' : 'Add New Table'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Table Name"
          name="tableName"
          value={formData.tableName}
          onChange={handleChange}
          required
          margin="normal"
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
          />
          
          <FormControl fullWidth margin="normal" sx={{ flex: 1 }}>
            <InputLabel id="tableType-label">Table Type</InputLabel>
            <Select
              labelId="tableType-label"
              name="tableType"
              value={formData.tableType}
              onChange={handleChange}
              label="Table Type"
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
            disabled={loading}
          >
            {loading ? 'Saving...' : table ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TableForm;
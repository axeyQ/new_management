'use client';

import { useState } from 'react';
import { TextField, Button, Paper, Typography, Box } from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const TableTypeForm = ({ tableType, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    tableTypeName: tableType?.tableTypeName || '',
    tableTypeDescription: tableType?.tableTypeDescription || '',
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
      const url = tableType
        ? `/api/tables/types/${tableType._id}`
        : '/api/tables/types';
      
      const method = tableType ? 'put' : 'post';
      
      const res = await axiosWithAuth[method](url, formData);
      
      if (res.data.success) {
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
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {tableType ? 'Edit Table Type' : 'Add New Table Type'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Type Name"
          name="tableTypeName"
          value={formData.tableTypeName}
          onChange={handleChange}
          required
          margin="normal"
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
          >
            {loading ? 'Saving...' : tableType ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TableTypeForm;
// src/components/menu/MenuForm.js
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
  MenuItem,
  FormControlLabel,
  Switch,
  FormHelperText,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const MenuForm = ({ menu, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: menu?.name || '',
    description: menu?.description || '',
    orderMode: menu?.orderMode || 'Dine-in',
    isActive: menu?.isActive !== undefined ? menu.isActive : true,
    isDefault: menu?.isDefault !== undefined ? menu.isDefault : false,
  });
  
  const [loading, setLoading] = useState(false);
  
  const orderModes = [
    'Dine-in', 
    'Takeaway', 
    'Delivery', 
    'Direct Order-TableQR', 
    'Direct Order-Takeaway', 
    'Direct Order-Delivery', 
    'Zomato'
  ];
  
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.orderMode) {
      toast.error('Menu name and order mode are required');
      return;
    }
    
    setLoading(true);
    try {
      const url = menu
        ? `/api/menu/menus/${menu._id}`
        : '/api/menu/menus';
      const method = menu ? 'put' : 'post';
      
      const res = await axiosWithAuth[method](url, formData);
      if (res.data.success) {
        toast.success(
          menu
            ? 'Menu updated successfully'
            : 'Menu created successfully'
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
  
  // Check if we're editing an existing menu with a direct order mode
  const isDirectOrderMode = (mode) => {
    return ['Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'].includes(mode);
  };
  
  const isEditingDirectOrderMenu = menu && isDirectOrderMode(menu.orderMode);
  
  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {menu ? 'Edit Menu' : 'Create New Menu'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Menu Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          margin="normal"
        />
        
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          multiline
          rows={2}
          margin="normal"
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="orderMode-label">Order Mode</InputLabel>
          <Select
            labelId="orderMode-label"
            name="orderMode"
            value={formData.orderMode}
            onChange={handleChange}
            label="Order Mode"
            required
            disabled={isEditingDirectOrderMenu}
          >
            {orderModes.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
          {isEditingDirectOrderMenu && (
            <FormHelperText>
              Cannot change the order mode for direct order menus.
            </FormHelperText>
          )}
        </FormControl>
        
        <Box mt={2}>
          <FormControlLabel
            control={
              <Switch
                name="isActive"
                checked={formData.isActive}
                onChange={handleSwitchChange}
                color="primary"
              />
            }
            label="Active"
          />
          
          <FormControlLabel
            control={
              <Switch
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleSwitchChange}
                color="primary"
              />
            }
            label="Set as Default Menu for this Mode"
          />
          {isDirectOrderMode(formData.orderMode) && (
            <FormHelperText>
              This is the only menu that will be available for {formData.orderMode} mode.
            </FormHelperText>
          )}
        </Box>
        
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
            {loading ? 'Saving...' : menu ? 'Update Menu' : 'Create Menu'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default MenuForm;
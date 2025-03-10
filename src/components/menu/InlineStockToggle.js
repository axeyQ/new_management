// src/components/menu/InlineStockToggle.js
import React, { useState } from 'react';
import { Switch, FormControlLabel, Box, CircularProgress } from '@mui/material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

/**
 * A simple inline toggle switch for managing stock status
 */
const InlineStockToggle = ({ item, itemType = 'dish', onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isOutOfStock, setIsOutOfStock] = useState(item?.stockStatus?.isOutOfStock || false);

  const handleToggle = async () => {
    const newStockStatus = !isOutOfStock;
    setLoading(true);
    
    try {
      // Determine endpoint based on item type
      const endpoint = itemType === 'dish'
        ? `/api/menu/dishes/${item._id}/stock`
        : `/api/menu/variants/${item._id}/stock`;
      
      // Simple payload - just toggling the outOfStock status
      const data = {
        isOutOfStock: newStockStatus
      };
      
      const res = await axiosWithAuth.put(endpoint, data);
      
      if (res.data.success) {
        setIsOutOfStock(newStockStatus);
        
        const statusMessage = newStockStatus
          ? `${itemType === 'dish' ? 'Dish' : 'Variant'} marked as out of stock`
          : `${itemType === 'dish' ? 'Dish' : 'Variant'} marked as in stock`;
        
        toast.success(statusMessage);
        
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        toast.error(res.data.message || 'Failed to update stock status');
      }
    } catch (error) {
      console.error('Error updating stock status:', error);
      toast.error(error.response?.data?.message || 'Error updating stock status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControlLabel
        control={
          <Switch
            checked={!isOutOfStock}
            onChange={handleToggle}
            disabled={loading}
            color={isOutOfStock ? "error" : "success"}
            size="small"
          />
        }
        label={loading ? <CircularProgress size={16} /> : (isOutOfStock ? "Out of Stock" : "In Stock")}
        sx={{ 
          m: 0,
          '.MuiFormControlLabel-label': {
            fontSize: '0.75rem',
            color: isOutOfStock ? 'error.main' : 'success.main'
          }
        }}
      />
    </Box>
  );
};

export default InlineStockToggle;
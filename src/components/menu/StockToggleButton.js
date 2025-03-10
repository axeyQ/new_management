// src/components/menu/StockToggleButton.js
import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  RemoveShoppingCart as OutOfStockIcon,
  CheckCircle as InStockIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

/**
 * A simple toggle button for managing the out of stock status of dishes and variants
 */
const StockToggleButton = ({ item, itemType = 'dish', onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOutOfStock, setIsOutOfStock] = useState(item?.stockStatus?.isOutOfStock || false);

  const handleOpen = () => {
    setIsOutOfStock(item?.stockStatus?.isOutOfStock || false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleToggle = () => {
    setIsOutOfStock(!isOutOfStock);
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      // Determine endpoint based on item type
      const endpoint = itemType === 'dish'
        ? `/api/menu/dishes/${item._id}/stock`
        : `/api/menu/variants/${item._id}/stock`;
      
      // Simplified payload - just toggling the outOfStock status
      const data = {
        isOutOfStock: isOutOfStock,
        // Set these to null/empty since we're not using time-based functionality
        outOfStockReason: '',
        restockTime: null,
        autoRestock: false
      };
      
      const res = await axiosWithAuth.put(endpoint, data);
      
      if (res.data.success) {
        const statusMessage = isOutOfStock
          ? `${itemType === 'dish' ? 'Dish' : 'Variant'} marked as out of stock`
          : `${itemType === 'dish' ? 'Dish' : 'Variant'} marked as in stock`;
        
        toast.success(statusMessage);
        
        if (onSuccess) {
          onSuccess(res.data.data);
        }
        
        handleClose();
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
    <>
      <Tooltip 
        title={item?.stockStatus?.isOutOfStock ? "Mark as in stock" : "Mark as out of stock"}
      >
        <IconButton
          color={item?.stockStatus?.isOutOfStock ? "error" : "default"}
          onClick={handleOpen}
          size="small"
        >
          {item?.stockStatus?.isOutOfStock ? <OutOfStockIcon /> : <InStockIcon />}
        </IconButton>
      </Tooltip>
      
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          {itemType === 'dish' ? 'Dish' : 'Variant'} Stock Status
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Update stock status for &quot;{item?.dishName || item?.variantName}&quot;
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={isOutOfStock}
                  onChange={handleToggle}
                  color={isOutOfStock ? "error" : "success"}
                />
              }
              label={isOutOfStock ? "Out of Stock" : "In Stock"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StockToggleButton;
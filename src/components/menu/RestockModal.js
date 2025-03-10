// src/components/menu/RestockModal.js
'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Typography,
  Alert,
  Divider
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const RestockModal = ({ 
  open, 
  onClose, 
  item, 
  itemType = 'dish', // 'dish' or 'variant'
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  
  const handleSubmit = async () => {
    if (!item) return;
    
    const data = {
      isOutOfStock: false,
      outOfStockReason: '',
      restockTime: null
    };
    
    setLoading(true);
    try {
      // Determine endpoint based on item type
      const endpoint = itemType === 'dish' 
        ? `/api/menu/dishes/${item._id}/stock` 
        : `/api/menu/variants/${item._id}/stock`;
      
      const res = await axiosWithAuth.put(endpoint, data);
      
      if (res.data.success) {
        toast.success(`${itemType === 'dish' ? 'Dish' : 'Variant'} restocked successfully`);
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      } else {
        toast.error(res.data.message || 'Failed to restock item');
      }
    } catch (error) {
      console.error('Error restocking item:', error);
      toast.error(error.response?.data?.message || 'Error restocking item');
    } finally {
      setLoading(false);
    }
  };
  
  if (!item) return null;
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? null : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Restock {itemType === 'dish' ? 'Dish' : 'Variant'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography gutterBottom variant="subtitle1">
            Item: {item?.dishName || item?.variantName || 'Loading...'}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          {item.stockStatus && item.stockStatus.outOfStockReason && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This item was marked out of stock for the following reason: 
              <Typography fontStyle="italic" component="p">
                &quot;{item.stockStatus.outOfStockReason}&quot;
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body1" gutterBottom>
            Are you sure you want to mark this item as back in stock?
          </Typography>
          
          <TextField
            fullWidth
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="Any notes about restocking this item"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Confirm Restock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RestockModal;
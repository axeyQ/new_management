// src/components/menu/EnhancedRestockModal.js
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
  Divider,
  FormControlLabel,
  Switch,
  Grid,
  Paper,
  Checkbox,
  Chip,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

// Order modes
const ORDER_MODES = [
  { value: 'dineIn', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'qrOrdering', label: 'QR Ordering' },
  { value: 'directTakeaway', label: 'Direct Takeaway' },
  { value: 'directDelivery', label: 'Direct Delivery' },
  { value: 'zomato', label: 'Zomato' }
];

const EnhancedRestockModal = ({
  open,
  onClose,
  item,
  itemType = 'dish', // 'dish' or 'variant'
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [restockAllModes, setRestockAllModes] = useState(true);
  
  // Selected order modes for restocking
  const [selectedModes, setSelectedModes] = useState(
    ORDER_MODES.reduce((acc, mode) => {
      acc[mode.value] = true;
      return acc;
    }, {})
  );

  // Get out of stock order modes
  const getOutOfStockModes = () => {
    if (!item || !item.stockStatus || !item.stockStatus.orderModes) {
      return [];
    }
    
    return ORDER_MODES.filter(mode => 
      item.stockStatus.orderModes[mode.value] && 
      item.stockStatus.orderModes[mode.value].isOutOfStock
    );
  };
  
  const outOfStockModes = getOutOfStockModes();
  
  const handleModeChange = (mode) => {
    setSelectedModes(prev => ({
      ...prev,
      [mode]: !prev[mode]
    }));
  };

  const handleSelectAllModes = (e) => {
    const checked = e.target.checked;
    setRestockAllModes(checked);
    
    if (checked) {
      // Select all modes
      setSelectedModes(
        ORDER_MODES.reduce((acc, mode) => {
          acc[mode.value] = true;
          return acc;
        }, {})
      );
    }
  };

  const handleSubmit = async () => {
    if (!item) return;
    
    // Prepare data for API
    const data = {
      isOutOfStock: false,
      outOfStockReason: '',
      restockTime: null
    };
    
    // Add order mode-specific data
    data.orderModes = {};
    
    ORDER_MODES.forEach(mode => {
      // Only include modes that are currently out of stock and selected for restocking
      const isOutOfStock = item.stockStatus?.orderModes?.[mode.value]?.isOutOfStock;
      
      if (isOutOfStock && (restockAllModes || selectedModes[mode.value])) {
        data.orderModes[mode.value] = {
          isOutOfStock: false,
          restockTime: null,
          outOfStockReason: ''
        };
      }
    });

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
  
  const hasOutOfStockModes = outOfStockModes.length > 0;

  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      maxWidth="md"
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

          {!hasOutOfStockModes ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              This item is not marked as out of stock for any order modes.
            </Alert>
          ) : (
            <>
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Currently out of stock for:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                  {outOfStockModes.map(mode => (
                    <Chip 
                      key={mode.value} 
                      label={mode.label} 
                      size="small" 
                      color="error" 
                    />
                  ))}
                </Box>
              </Box>
              
              <Box mb={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={restockAllModes}
                      onChange={handleSelectAllModes}
                      color="primary"
                    />
                  }
                  label="Restock for all order modes"
                />
                
                {!restockAllModes && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Select order modes to restock:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                      <Grid container spacing={2}>
                        {outOfStockModes.map((mode) => (
                          <Grid item xs={6} sm={4} key={mode.value}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={selectedModes[mode.value]}
                                  onChange={() => handleModeChange(mode.value)}
                                  name={mode.value}
                                  color="primary"
                                />
                              }
                              label={mode.label}
                            />
                          </Grid>
                        ))}
                      </Grid>
                      
                      <Box mt={1}>
                        {outOfStockModes.filter(mode => selectedModes[mode.value]).length === 0 ? (
                          <Typography color="error" variant="caption">
                            Please select at least one order mode
                          </Typography>
                        ) : (
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {outOfStockModes.filter(mode => selectedModes[mode.value]).map(mode => (
                              <Chip 
                                key={mode.value} 
                                label={mode.label} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Box>
            </>
          )}

          <Typography variant="body1" gutterBottom>
            {hasOutOfStockModes 
              ? 'Are you sure you want to mark this item as back in stock?' 
              : 'This item is already marked as in stock for all order modes.'}
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
          disabled={loading || !hasOutOfStockModes || (!restockAllModes && outOfStockModes.filter(mode => selectedModes[mode.value]).length === 0)}
        >
          {loading ? <CircularProgress size={24} /> : 'Confirm Restock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedRestockModal;
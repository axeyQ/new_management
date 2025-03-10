// src/components/menu/CategoryRestockModal.js
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material';
import { format, isValid, parseISO } from 'date-fns';
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

const CategoryRestockModal = ({
  open,
  onClose,
  category,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedModes, setSelectedModes] = useState([]);

  // Format restock time 
  const formatRestockTime = (timeString) => {
    if (!timeString) return null;
    
    try {
      const restockTime = parseISO(timeString);
      if (!isValid(restockTime)) return null;
      
      return format(restockTime, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting restock time:', error);
      return null;
    }
  };

  // Get out of stock order modes
  const getOutOfStockModes = () => {
    if (!category || !category.stockStatus || !category.stockStatus.orderModes) {
      return [];
    }
    return ORDER_MODES.filter(mode =>
      category.stockStatus.orderModes[mode.value]?.isOutOfStock
    ).map(mode => mode.value);
  };

  // Reset selected modes when modal opens
  useEffect(() => {
    if (open && category) {
      const outOfStockModes = getOutOfStockModes();
      setSelectedModes(outOfStockModes);
    }
  }, [open, category]);

  const handleModesChange = (event, newModes) => {
    // Ensure at least one mode is selected if there are out of stock modes
    if (newModes.length || getOutOfStockModes().length === 0) {
      setSelectedModes(newModes);
    }
  };

  const handleSelectAll = () => {
    setSelectedModes(getOutOfStockModes());
  };

  const handleClearSelection = () => {
    setSelectedModes([]);
  };

  const handleSubmit = async () => {
    if (!category || selectedModes.length === 0) return;
    
    setLoading(true);
    try {
      // Prepare data for API
      const data = {
        orderModes: {}
      };
      
      // If restocking all modes and global flag is set, also reset the global flag
      if (category.stockStatus.isOutOfStock && 
          selectedModes.length === getOutOfStockModes().length &&
          getOutOfStockModes().length === ORDER_MODES.length) {
        data.isOutOfStock = false;
      }
      
      // Add order mode-specific data
      selectedModes.forEach(mode => {
        data.orderModes[mode] = {
          isOutOfStock: false,
          restockTime: null,
          outOfStockReason: ''
        };
      });
      
      const res = await axiosWithAuth.put(`/api/menu/categories/${category._id}/stock`, data);
      
      if (res.data.success) {
        // Manually update the category to avoid unnecessary fetches
        const updatedCategory = {
          ...category,
          stockStatus: {
            ...category.stockStatus,
            orderModes: { ...(category.stockStatus?.orderModes || {}) }
          }
        };
        
        // Update isOutOfStock global flag if all modes are restocked
        if (data.isOutOfStock === false) {
          updatedCategory.stockStatus.isOutOfStock = false;
        }
        
        // Update each selected mode
        selectedModes.forEach(mode => {
          updatedCategory.stockStatus.orderModes[mode] = {
            isOutOfStock: false,
            restockTime: null,
            outOfStockReason: ''
          };
        });
        
        toast.success(`${selectedModes.length} mode(s) restocked successfully`);
        if (onSuccess) onSuccess(updatedCategory);
        onClose();
      } else {
        toast.error(res.data.message || 'Failed to restock');
      }
    } catch (error) {
      console.error('Error restocking:', error);
      toast.error(error.response?.data?.message || 'Error restocking');
    } finally {
      setLoading(false);
    }
  };

  if (!category) return null;
  
  const outOfStockModes = getOutOfStockModes();
  const hasOutOfStockModes = outOfStockModes.length > 0;
  
  // Get restock time for a specific mode
  const getModeRestockTime = (modeKey) => {
    if (!category?.stockStatus?.orderModes?.[modeKey]?.restockTime) {
      return null;
    }
    return formatRestockTime(category.stockStatus.orderModes[modeKey].restockTime);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Restock Category: {category.categoryName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Divider sx={{ my: 2 }} />
          {!hasOutOfStockModes ? (
            <Typography color="text.secondary">
              All modes are already in stock.
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Select order modes to restock:
              </Typography>
              
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
                <Button 
                  size="small" 
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              </Box>
              
              <ToggleButtonGroup
                value={selectedModes}
                onChange={handleModesChange}
                aria-label="order modes to restock"
                color="primary"
                size="small"
                sx={{ flexWrap: 'wrap', mt: 1, mb: 3 }}
                multiple
              >
                {outOfStockModes.map((mode) => {
                  const modeObj = ORDER_MODES.find(m => m.value === mode);
                  const restockTime = getModeRestockTime(mode);
                  
                  return (
                    <ToggleButton 
                      key={mode} 
                      value={mode} 
                      aria-label={modeObj?.label} 
                      sx={{ m: 0.5, flexDirection: 'column', alignItems: 'flex-start', py: 1 }}
                    >
                      <Typography variant="body2">{modeObj?.label || mode}</Typography>
                      {restockTime && (
                        <Typography variant="caption" color="text.secondary">
                          Restock: {restockTime}
                        </Typography>
                      )}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </>
          )}
          
          {category.stockStatus && category.stockStatus.outOfStockReason && (
            <Box mt={1}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                <strong>Out of Stock Reason:</strong> {category.stockStatus.outOfStockReason}
              </Typography>
            </Box>
          )}
          
          {selectedModes.length > 0 && (
            <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
              <Typography variant="body2">
                Restocking {selectedModes.length} out of {outOfStockModes.length} order modes:
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedModes.map(mode => {
                  const modeObj = ORDER_MODES.find(m => m.value === mode);
                  return (
                    <Chip 
                      key={mode} 
                      label={modeObj?.label || mode} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            </Box>
          )}
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
          disabled={loading || !hasOutOfStockModes || selectedModes.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Confirm Restock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryRestockModal;
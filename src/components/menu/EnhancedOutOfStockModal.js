// src/components/menu/EnhancedOutOfStockModal.js
'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Box,
  CircularProgress,
  Typography,
  Switch,
  FormHelperText,
  Divider,
  Checkbox,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import { addHours, endOfDay, format } from 'date-fns';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

// Pre-defined restock times
const RESTOCK_OPTIONS = {
  ONE_HOUR: '1hour',
  TWO_HOURS: '2hours',
  TODAY_END: 'today',
  CUSTOM: 'custom',
  INDEFINITE: 'indefinite'
};

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

const EnhancedOutOfStockModal = ({
  open,
  onClose,
  item,
  itemType = 'dish', // 'dish' or 'variant'
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [applyToAllModes, setApplyToAllModes] = useState(true);
  const [restockOption, setRestockOption] = useState(RESTOCK_OPTIONS.ONE_HOUR);
  const [customRestockTime, setCustomRestockTime] = useState(addHours(new Date(), 1));
  const [outOfStockReason, setOutOfStockReason] = useState('');
  const [autoRestock, setAutoRestock] = useState(true);
  
  // Selected order modes
  const [selectedModes, setSelectedModes] = useState(
    ORDER_MODES.reduce((acc, mode) => {
      acc[mode.value] = true;
      return acc;
    }, {})
  );

  useEffect(() => {
    if (open && item) {
      // Reset form when modal opens
      setRestockOption(RESTOCK_OPTIONS.ONE_HOUR);
      setCustomRestockTime(addHours(new Date(), 1));
      setOutOfStockReason('');
      setAutoRestock(true);
      setApplyToAllModes(true);
      
      // Reset all modes to selected
      setSelectedModes(
        ORDER_MODES.reduce((acc, mode) => {
          acc[mode.value] = true;
          return acc;
        }, {})
      );

      // If item is already out of stock, populate form with existing values
      if (item.stockStatus && item.stockStatus.isOutOfStock) {
        if (item.stockStatus.restockTime) {
          // Determine which option to select based on restock time
          setCustomRestockTime(new Date(item.stockStatus.restockTime));
          setRestockOption(RESTOCK_OPTIONS.CUSTOM);
        } else {
          setRestockOption(RESTOCK_OPTIONS.INDEFINITE);
        }
        if (item.stockStatus.outOfStockReason) {
          setOutOfStockReason(item.stockStatus.outOfStockReason);
        }
        if (item.stockStatus.autoRestock !== undefined) {
          setAutoRestock(item.stockStatus.autoRestock);
        }
      }
    }
  }, [open, item]);

  const handleRestockOptionChange = (event) => {
    const value = event.target.value;
    setRestockOption(value);
    
    // Update custom time based on selection
    if (value === RESTOCK_OPTIONS.ONE_HOUR) {
      setCustomRestockTime(addHours(new Date(), 1));
    } else if (value === RESTOCK_OPTIONS.TWO_HOURS) {
      setCustomRestockTime(addHours(new Date(), 2));
    } else if (value === RESTOCK_OPTIONS.TODAY_END) {
      setCustomRestockTime(endOfDay(new Date()));
    }
  };

  const handleModeChange = (mode) => {
    setSelectedModes(prev => ({
      ...prev,
      [mode]: !prev[mode]
    }));
  };

  const handleSelectAllModes = (e) => {
    const checked = e.target.checked;
    setApplyToAllModes(checked);
    
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
    
    // Calculate restock time based on selected option
    let restockTime = null;
    if (restockOption !== RESTOCK_OPTIONS.INDEFINITE) {
      if (restockOption === RESTOCK_OPTIONS.CUSTOM) {
        restockTime = customRestockTime;
      } else if (restockOption === RESTOCK_OPTIONS.ONE_HOUR) {
        restockTime = addHours(new Date(), 1);
      } else if (restockOption === RESTOCK_OPTIONS.TWO_HOURS) {
        restockTime = addHours(new Date(), 2);
      } else if (restockOption === RESTOCK_OPTIONS.TODAY_END) {
        restockTime = endOfDay(new Date());
      }
    }

    // Prepare data for API
    const data = {
      autoRestock
    };
    
    // Add global flag if applying to all modes
    if (applyToAllModes) {
      data.isOutOfStock = true;
      data.restockTime = restockTime ? restockTime.toISOString() : null;
      data.outOfStockReason = outOfStockReason;
    }
    
    // Add order mode-specific data
    data.orderModes = {};
    
    ORDER_MODES.forEach(mode => {
      if (applyToAllModes || selectedModes[mode.value]) {
        data.orderModes[mode.value] = {
          isOutOfStock: true,
          restockTime: restockTime ? restockTime.toISOString() : null,
          outOfStockReason: outOfStockReason
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
        toast.success(`${itemType === 'dish' ? 'Dish' : 'Variant'} marked as out of stock`);
        if (onSuccess) onSuccess(res.data.data);
        onClose();
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
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Mark {itemType === 'dish' ? 'Dish' : 'Variant'} as Out of Stock
      </DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography gutterBottom variant="subtitle1">
            Item: {item?.dishName || item?.variantName || 'Loading...'}
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <Box mb={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={applyToAllModes}
                  onChange={handleSelectAllModes}
                  color="primary"
                />
              }
              label="Apply to all order modes"
            />
            {!applyToAllModes && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Select order modes to mark as out of stock:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                  <Grid container spacing={2}>
                    {ORDER_MODES.map((mode) => (
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
                    {ORDER_MODES.filter(mode => selectedModes[mode.value]).length === 0 ? (
                      <Typography color="error" variant="caption">
                        Please select at least one order mode
                      </Typography>
                    ) : (
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {ORDER_MODES.filter(mode => selectedModes[mode.value]).map(mode => (
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
          
          <FormControl fullWidth margin="normal">
            <FormLabel id="restock-time-label">When will this item be back in stock?</FormLabel>
            <RadioGroup
              aria-labelledby="restock-time-label"
              name="restock-option"
              value={restockOption}
              onChange={handleRestockOptionChange}
            >
              <FormControlLabel
                value={RESTOCK_OPTIONS.ONE_HOUR}
                control={<Radio />}
                label="In 1 hour"
              />
              <FormControlLabel
                value={RESTOCK_OPTIONS.TWO_HOURS}
                control={<Radio />}
                label="In 2 hours"
              />
              <FormControlLabel
                value={RESTOCK_OPTIONS.TODAY_END}
                control={<Radio />}
                label="End of today"
              />
              <FormControlLabel
                value={RESTOCK_OPTIONS.CUSTOM}
                control={<Radio />}
                label="Custom time"
              />
              <FormControlLabel
                value={RESTOCK_OPTIONS.INDEFINITE}
                control={<Radio />}
                label="Indefinite (manual restock required)"
              />
            </RadioGroup>
          </FormControl>
          
          {restockOption === RESTOCK_OPTIONS.CUSTOM && (
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Custom Restock Time"
                type="datetime-local"
                value={format(customRestockTime, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setCustomRestockTime(newDate);
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
            </Box>
          )}
          
          <TextField
            fullWidth
            label="Reason (Optional)"
            value={outOfStockReason}
            onChange={(e) => setOutOfStockReason(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="Why is this item out of stock?"
          />

          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRestock}
                  onChange={(e) => setAutoRestock(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto Restock"
            />
            <FormHelperText>
              {autoRestock
                ? "Item will automatically return to stock at the specified time"
                : "Item will remain out of stock until manually restocked"}
            </FormHelperText>
          </Box>
          
          {restockOption !== RESTOCK_OPTIONS.INDEFINITE && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                This item will be marked as out of stock until:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {restockOption === RESTOCK_OPTIONS.CUSTOM
                  ? format(customRestockTime, 'PPpp')
                  : restockOption === RESTOCK_OPTIONS.ONE_HOUR
                  ? format(addHours(new Date(), 1), 'PPpp')
                  : restockOption === RESTOCK_OPTIONS.TWO_HOURS
                  ? format(addHours(new Date(), 2), 'PPpp')
                  : format(endOfDay(new Date()), 'PPpp')}
              </Typography>
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
          disabled={loading || (!applyToAllModes && ORDER_MODES.filter(mode => selectedModes[mode.value]).length === 0)}
        >
          {loading ? <CircularProgress size={24} /> : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedOutOfStockModal;
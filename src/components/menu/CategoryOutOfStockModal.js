// src/components/menu/CategoryOutOfStockModal.js
'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup
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

const CategoryOutOfStockModal = ({
  open,
  onClose,
  category,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [restockOption, setRestockOption] = useState(RESTOCK_OPTIONS.ONE_HOUR);
  const [customRestockTime, setCustomRestockTime] = useState(addHours(new Date(), 1));
  const [outOfStockReason, setOutOfStockReason] = useState('');
  
  // Selected order modes - initially all modes selected
  const [selectedModes, setSelectedModes] = useState(
    ORDER_MODES.map(mode => mode.value)
  );

  useEffect(() => {
    if (open && category) {
      // Reset form when modal opens
      setRestockOption(RESTOCK_OPTIONS.ONE_HOUR);
      setCustomRestockTime(addHours(new Date(), 1));
      setOutOfStockReason('');
      setSelectedModes(ORDER_MODES.map(mode => mode.value));
    }
  }, [open, category]);

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

  const handleModesChange = (event, newModes) => {
    // Ensure at least one mode is selected
    if (newModes.length) {
      setSelectedModes(newModes);
    }
  };

  const handleSubmit = async () => {
    if (!category) return;
    
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
      orderModes: {}
    };
    
    // If all modes are selected, also set the global flag
    if (selectedModes.length === ORDER_MODES.length) {
      data.isOutOfStock = true;
      data.outOfStockReason = outOfStockReason;
      data.restockTime = restockTime ? restockTime.toISOString() : null;
    }
    
    // Add order mode-specific data
    selectedModes.forEach(mode => {
      data.orderModes[mode] = {
        isOutOfStock: true,
        restockTime: restockTime ? restockTime.toISOString() : null,
        outOfStockReason: outOfStockReason
      };
    });

    setLoading(true);
    try {
      const res = await axiosWithAuth.put(`/api/menu/categories/${category._id}/stock`, data);
      
      if (res.data.success) {
        toast.success(`Category marked as out of stock`);
        if (onSuccess) onSuccess(res.data.data);
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
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Mark Category as Out of Stock
      </DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography gutterBottom variant="subtitle1">
            Category: {category?.categoryName || 'Loading...'}
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Select order modes to mark as out of stock:
            </Typography>
            <ToggleButtonGroup
              value={selectedModes}
              onChange={handleModesChange}
              aria-label="order modes"
              color="primary"
              size="small"
              sx={{ flexWrap: 'wrap', mt: 1 }}
              multiple
            >
              {ORDER_MODES.map((mode) => (
                <ToggleButton key={mode.value} value={mode.value} aria-label={mode.label} sx={{ m: 0.5 }}>
                  {mode.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
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
            placeholder="Why is this category out of stock?"
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
          disabled={loading || selectedModes.length === 0}
        >
          {loading ? "Processing..." : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryOutOfStockModal;
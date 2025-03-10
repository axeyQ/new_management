// src/components/menu/OutOfStockDialog.js
'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Box,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Select,
  InputLabel
} from '@mui/material';

/**
 * Dialog component for setting Out of Stock status
 * Simplified version without date-fns or DateTimePicker
 */
const OutOfStockDialog = ({ open, onClose, onSave, currentSettings = {}, itemType }) => {
  const [outOfStockType, setOutOfStockType] = useState(currentSettings.outOfStockType || 'auto');
  const [autoOption, setAutoOption] = useState('2hours');
  const [isOutOfStock, setIsOutOfStock] = useState(currentSettings.outOfStock || false);
  
  // Custom date inputs (simplified approach without date picker)
  const [customDate, setCustomDate] = useState(new Date());
  const [customDay, setCustomDay] = useState('1');
  const [customHour, setCustomHour] = useState('12');
  const [customMinute, setCustomMinute] = useState('00');
  const [customAmPm, setCustomAmPm] = useState('PM');
  
  useEffect(() => {
    if (open) {
      // Initialize from current settings
      setIsOutOfStock(currentSettings.outOfStock || false);
      setOutOfStockType(currentSettings.outOfStockType || 'auto');
      
      // If we have a current date, initialize custom options
      if (currentSettings.outOfStockUntil) {
        const date = new Date(currentSettings.outOfStockUntil);
        setCustomDate(date);
        
        // Extract day, hour, minute for custom fields
        setCustomDay(String(Math.min(7, Math.max(1, date.getDate() - new Date().getDate()))));
        
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        
        setCustomHour(String(hours));
        setCustomMinute(String(date.getMinutes()).padStart(2, '0'));
        setCustomAmPm(ampm);
        
        // Determine auto option if possible
        const now = new Date();
        const hoursFromNow = Math.round((date - now) / (60 * 60 * 1000));
        
        if (hoursFromNow === 2) {
          setAutoOption('2hours');
        } else if (hoursFromNow === 4) {
          setAutoOption('4hours');
        } else if (
          date.getDate() === now.getDate() + 1 &&
          date.getHours() < 12
        ) {
          setAutoOption('nextday');
        } else {
          setAutoOption('custom');
        }
      } else {
        setAutoOption('2hours');
        resetCustomDateToDefault();
      }
    }
  }, [open, currentSettings]);
  
  // Reset custom date fields to default values
  const resetCustomDateToDefault = () => {
    setCustomDay('1');
    setCustomHour('12');
    setCustomMinute('00');
    setCustomAmPm('PM');
  };
  
  // Calculate the end date based on selected option
  const getEndDate = () => {
    const now = new Date();
    
    switch (autoOption) {
      case '2hours': {
        const date = new Date(now);
        date.setHours(date.getHours() + 2);
        return date;
      }
      case '4hours': {
        const date = new Date(now);
        date.setHours(date.getHours() + 4);
        return date;
      }
      case 'nextday': {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0); // 9:00 AM next day
        return date;
      }
      case 'custom': {
        const date = new Date(now);
        date.setDate(date.getDate() + parseInt(customDay, 10));
        
        let hours = parseInt(customHour, 10);
        if (customAmPm === 'PM' && hours < 12) hours += 12;
        if (customAmPm === 'AM' && hours === 12) hours = 0;
        
        date.setHours(hours, parseInt(customMinute, 10), 0, 0);
        return date;
      }
      default:
        return new Date(now.getTime() + 2 * 60 * 60 * 1000); // Default: 2 hours
    }
  };

  // Format date for display
  const formatDate = (date) => {
    const d = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${hours}:${minutes} ${ampm}`;
  };
  
  const handleSave = () => {
    // Don't save if turning off out-of-stock status
    if (!isOutOfStock) {
      onSave({
        outOfStock: false,
        outOfStockType: null,
        outOfStockUntil: null,
        outOfStockReason: ''
      });
      return;
    }
    
    // Prepare data for saving
    const data = {
      outOfStock: true,
      outOfStockType: outOfStockType,
      outOfStockReason: outOfStockType === 'manual' ? "I will turn it On myself" : "",
      outOfStockUntil: outOfStockType === 'auto' ? getEndDate() : null
    };
    
    onSave(data);
  };
  
  // Generate days options (1-7)
  const daysOptions = Array.from({ length: 7 }, (_, i) => i + 1);
  
  // Generate hours options (1-12)
  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minutes options (00-59)
  const minutesOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {itemType} Out of Stock Settings
      </DialogTitle>
      <DialogContent>
        <Box mt={2}>
          <FormControl component="fieldset" fullWidth margin="normal">
            <Typography variant="body1" gutterBottom>
              Out of Stock Status
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip 
                label="In Stock" 
                color={!isOutOfStock ? "success" : "default"} 
                variant={!isOutOfStock ? "filled" : "outlined"}
                onClick={() => setIsOutOfStock(false)}
                clickable
              />
              <Chip 
                label="Out of Stock" 
                color={isOutOfStock ? "error" : "default"} 
                variant={isOutOfStock ? "filled" : "outlined"}
                onClick={() => setIsOutOfStock(true)}
                clickable
              />
            </Stack>
          </FormControl>
          
          {isOutOfStock && (
            <>
              <FormControl component="fieldset" fullWidth margin="normal">
                <Typography variant="body1" gutterBottom>
                  How would you like to manage out of stock status?
                </Typography>
                <RadioGroup
                  value={outOfStockType}
                  onChange={(e) => setOutOfStockType(e.target.value)}
                >
                  <FormControlLabel
                    value="auto"
                    control={<Radio />}
                    label="Automatically turn back on after a set time"
                  />
                  <FormControlLabel
                    value="manual"
                    control={<Radio />}
                    label="Manually (I will turn it On myself)"
                  />
                </RadioGroup>
              </FormControl>
              
              {outOfStockType === 'auto' && (
                <Box sx={{ ml: 4, mt: 2 }}>
                  <FormControl component="fieldset" fullWidth margin="normal">
                    <Typography variant="body2" gutterBottom>
                      When should the item be available again?
                    </Typography>
                    <RadioGroup
                      value={autoOption}
                      onChange={(e) => setAutoOption(e.target.value)}
                    >
                      <FormControlLabel
                        value="2hours"
                        control={<Radio />}
                        label={`After 2 hours (${formatDate(new Date(new Date().getTime() + 2 * 60 * 60 * 1000))})`}
                      />
                      <FormControlLabel
                        value="4hours"
                        control={<Radio />}
                        label={`After 4 hours (${formatDate(new Date(new Date().getTime() + 4 * 60 * 60 * 1000))})`}
                      />
                      <FormControlLabel
                        value="nextday"
                        control={<Radio />}
                        label={`Next business day (${formatDate(new Date(new Date().setHours(24 + 9, 0, 0, 0)))})`}
                      />
                      <FormControlLabel
                        value="custom"
                        control={<Radio />}
                        label="Custom date and time (up to 7 days)"
                      />
                    </RadioGroup>
                    
                    {autoOption === 'custom' && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Set a custom time (up to 7 days from now):
                        </Typography>
                        
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                          <FormControl sx={{ minWidth: 80 }}>
                            <InputLabel id="days-label">Days</InputLabel>
                            <Select
                              labelId="days-label"
                              value={customDay}
                              onChange={(e) => setCustomDay(e.target.value)}
                              label="Days"
                            >
                              {daysOptions.map((day) => (
                                <MenuItem key={day} value={day.toString()}>
                                  {day}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <FormControl sx={{ minWidth: 80 }}>
                            <InputLabel id="hour-label">Hour</InputLabel>
                            <Select
                              labelId="hour-label"
                              value={customHour}
                              onChange={(e) => setCustomHour(e.target.value)}
                              label="Hour"
                            >
                              {hoursOptions.map((hour) => (
                                <MenuItem key={hour} value={hour.toString()}>
                                  {hour}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <FormControl sx={{ minWidth: 80 }}>
                            <InputLabel id="minute-label">Minute</InputLabel>
                            <Select
                              labelId="minute-label"
                              value={customMinute}
                              onChange={(e) => setCustomMinute(e.target.value)}
                              label="Minute"
                            >
                              {minutesOptions.filter((_, i) => i % 5 === 0).map((minute) => (
                                <MenuItem key={minute} value={minute}>
                                  {minute}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <FormControl sx={{ minWidth: 80 }}>
                            <InputLabel id="ampm-label">AM/PM</InputLabel>
                            <Select
                              labelId="ampm-label"
                              value={customAmPm}
                              onChange={(e) => setCustomAmPm(e.target.value)}
                              label="AM/PM"
                            >
                              <MenuItem value="AM">AM</MenuItem>
                              <MenuItem value="PM">PM</MenuItem>
                            </Select>
                          </FormControl>
                        </Stack>
                        
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                          Will be back in stock on: {formatDate(getEndDate())}
                        </Typography>
                      </Box>
                    )}
                  </FormControl>
                </Box>
              )}
              
              {outOfStockType === 'manual' && (
                <Box sx={{ ml: 4, mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    You will need to manually set the item back in stock.
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    A note saying &quot;I will turn it On myself&quot; will be recorded.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          color="primary"
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OutOfStockDialog;
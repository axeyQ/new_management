// src/components/outlets/OutletHoursForm.js
import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const days = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
];

// Helper to convert time string to Date
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  date.setSeconds(0);
  return date;
};

// Helper to convert Date to time string
const formatTimeToString = (date) => {
  if (!date) return null;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Time slot component
const TimeSlot = ({ 
  slot, 
  index, 
  onUpdate, 
  onDelete, 
  errors = {},
  isLegacy = false
}) => {
  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: isLegacy ? '#f5f5f5' : 'transparent', borderRadius: 1 }}>
      {isLegacy && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Current Hours
        </Typography>
      )}
      
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5}>
          <TimePicker
            label="Open Time"
            value={slot.openTime}
            onChange={(newTime) => onUpdate(index, 'openTime', newTime)}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                size="small"
                error={!!errors[`${index}-openTime`]}
                helperText={errors[`${index}-openTime`]}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TimePicker
            label="Close Time"
            value={slot.closeTime}
            onChange={(newTime) => onUpdate(index, 'closeTime', newTime)}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                size="small"
                error={!!errors[`${index}-closeTime`]}
                helperText={errors[`${index}-closeTime`]}
              />
            )}
          />
        </Grid>
        {!isLegacy && (
          <Grid item xs={12} sm={2}>
            <Tooltip title="Remove time slot">
              <IconButton onClick={() => onDelete(index)} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// Day hours component
const DayHours = ({ 
  day, 
  dayData, 
  onUpdateDay, 
  onAddTimeSlot,
  validationErrors 
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasTimeSlots = dayData.timeSlots && dayData.timeSlots.length > 0;
  const hasLegacyHours = dayData.openTime && dayData.closeTime;
  const isUsingNewFormat = hasTimeSlots;
  
  const toggleExpanded = () => setExpanded(!expanded);
  
  const handleUpdateTimeSlot = (slotIndex, field, value) => {
    const updatedTimeSlots = [...dayData.timeSlots];
    
    if (field === 'openTime' || field === 'closeTime') {
      updatedTimeSlots[slotIndex][field] = formatTimeToString(value);
    } else {
      updatedTimeSlots[slotIndex][field] = value;
    }
    
    onUpdateDay(day.value, { timeSlots: updatedTimeSlots });
  };
  
  const handleDeleteTimeSlot = (slotIndex) => {
    const updatedTimeSlots = [...dayData.timeSlots];
    updatedTimeSlots.splice(slotIndex, 1);
    onUpdateDay(day.value, { timeSlots: updatedTimeSlots });
  };
  
  const handleAddTimeSlot = () => {
    // Default new slot time to current day hours or standard business hours
    const defaultOpenTime = '09:00';
    const defaultCloseTime = '17:00';
    
    onAddTimeSlot(day.value, {
      openTime: defaultOpenTime,
      closeTime: defaultCloseTime
    });
  };
  
  const handleUpdateLegacyHours = (field, value) => {
    // For openTime and closeTime fields
    onUpdateDay(day.value, { [field]: formatTimeToString(value) });
  };
  
  // Filter errors for this day's slots
  const filterErrorsForDay = () => {
    const errors = {};
    Object.keys(validationErrors || {}).forEach(key => {
      if (key.startsWith(`${day.value}-`)) {
        errors[key.replace(`${day.value}-`, '')] = validationErrors[key];
      }
    });
    return errors;
  };
  
  const dayErrors = filterErrorsForDay();
  
  return (
    <Box sx={{ mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <FormControlLabel
          control={
            <Switch
              checked={dayData.isOpen}
              onChange={(e) => onUpdateDay(day.value, { isOpen: e.target.checked })}
              color="primary"
            />
          }
          label={day.name}
        />
        
        {dayData.isOpen && (
          <IconButton onClick={toggleExpanded} size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>
      
      <Collapse in={dayData.isOpen && expanded}>
        <Box sx={{ pl: 4, pr: 2, pt: 2, pb: 1 }}>
          {/* Legacy hours display if present */}
          {hasLegacyHours && !isUsingNewFormat && (
            <TimeSlot 
              slot={{
                openTime: parseTimeString(dayData.openTime),
                closeTime: parseTimeString(dayData.closeTime)
              }}
              index="legacy"
              onUpdate={(_, field, value) => handleUpdateLegacyHours(field, value)}
              onDelete={() => {}}
              errors={dayErrors}
              isLegacy={true}
            />
          )}
          
          {/* Time slots display */}
          {hasTimeSlots && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Time Slots
              </Typography>
              
              {dayData.timeSlots.map((slot, index) => (
                <TimeSlot
                  key={slot._id || index}
                  slot={{
                    openTime: parseTimeString(slot.openTime),
                    closeTime: parseTimeString(slot.closeTime)
                  }}
                  index={index}
                  onUpdate={handleUpdateTimeSlot}
                  onDelete={handleDeleteTimeSlot}
                  errors={dayErrors}
                />
              ))}
            </Box>
          )}
          
          {/* Add new time slot button */}
          <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddTimeSlot}
              variant="outlined"
              size="small"
            >
              Add Time Slot
            </Button>
          </Box>
        </Box>
      </Collapse>
      
      {dayData.isOpen && !expanded && (
        <Box pl={4} pt={1}>
          <Typography variant="body2" color="text.secondary">
            {isUsingNewFormat 
              ? `${dayData.timeSlots.length} time slot(s) configured`
              : hasLegacyHours 
                ? `Hours: ${dayData.openTime} - ${dayData.closeTime}` 
                : 'No hours configured'
            }
          </Typography>
        </Box>
      )}
      
      {day.value < days.length - 1 && <Divider sx={{ mt: 2 }} />}
    </Box>
  );
};

const OutletHoursForm = ({ outletId }) => {
  const [hoursData, setHoursData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchOperationalHours();
  }, [outletId]);

  const fetchOperationalHours = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get(`/api/outlets/${outletId}/hours`);
      if (res.data.success) {
        // Initialize hours for all days
        const initializedHours = days.map(day => {
          // Find existing hours for this day
          const existingHour = res.data.data.find(h => h.dayOfWeek === day.value);
          if (existingHour) {
            return {
              ...existingHour,
              timeSlots: existingHour.timeSlots || []
            };
          }
          
          // Default hours for this day
          return {
            dayOfWeek: day.value,
            isOpen: true,
            openTime: '09:00',
            closeTime: '22:00',
            timeSlots: []
          };
        });
        
        setHoursData(initializedHours);
      } else {
        setError(res.data.message || 'Failed to fetch operational hours');
      }
    } catch (error) {
      console.error('Error fetching operational hours:', error);
      setError('Error loading operational hours');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDay = (dayOfWeek, updates) => {
    const updatedHours = [...hoursData];
    const dayIndex = updatedHours.findIndex(day => day.dayOfWeek === dayOfWeek);
    
    if (dayIndex !== -1) {
      updatedHours[dayIndex] = {
        ...updatedHours[dayIndex],
        ...updates
      };
      
      // Clear validation errors for this day
      const newErrors = { ...validationErrors };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${dayOfWeek}-`)) {
          delete newErrors[key];
        }
      });
      
      setValidationErrors(newErrors);
      setHoursData(updatedHours);
    }
  };
  
  const handleAddTimeSlot = (dayOfWeek, timeSlot) => {
    const updatedHours = [...hoursData];
    const dayIndex = updatedHours.findIndex(day => day.dayOfWeek === dayOfWeek);
    
    if (dayIndex !== -1) {
      // Initialize timeSlots array if it doesn't exist
      if (!updatedHours[dayIndex].timeSlots) {
        updatedHours[dayIndex].timeSlots = [];
      }
      
      // Add new time slot
      updatedHours[dayIndex].timeSlots.push(timeSlot);
      setHoursData(updatedHours);
    }
  };

  const validateHours = () => {
    const errors = {};
    let isValid = true;
    
    hoursData.forEach((day) => {
      // Skip validation for closed days
      if (!day.isOpen) return;
      
      const dayOfWeek = day.dayOfWeek;
      
      // Check if using time slots or legacy format
      const isUsingTimeSlots = day.timeSlots && day.timeSlots.length > 0;
      const isUsingLegacy = day.openTime && day.closeTime;
      
      if (!isUsingTimeSlots && !isUsingLegacy) {
        errors[`${dayOfWeek}-general`] = 'No hours configured for this day';
        isValid = false;
        return;
      }
      
      // Validate legacy format if used
      if (isUsingLegacy && !isUsingTimeSlots) {
        if (!day.openTime) {
          errors[`${dayOfWeek}-openTime`] = 'Open time is required';
          isValid = false;
        }
        
        if (!day.closeTime) {
          errors[`${dayOfWeek}-closeTime`] = 'Close time is required';
          isValid = false;
        }
        
        if (day.openTime && day.closeTime && day.openTime >= day.closeTime) {
          errors[`${dayOfWeek}-closeTime`] = 'Close time must be after open time';
          isValid = false;
        }
      }
      
      // Validate time slots if used
      if (isUsingTimeSlots) {
        day.timeSlots.forEach((slot, index) => {
          if (!slot.openTime) {
            errors[`${dayOfWeek}-${index}-openTime`] = 'Open time is required';
            isValid = false;
          }
          
          if (!slot.closeTime) {
            errors[`${dayOfWeek}-${index}-closeTime`] = 'Close time is required';
            isValid = false;
          }
          
          if (slot.openTime && slot.closeTime && slot.openTime >= slot.closeTime) {
            errors[`${dayOfWeek}-${index}-closeTime`] = 'Close time must be after open time';
            isValid = false;
          }
        });
        
        // Check for overlapping time slots
        if (day.timeSlots.length > 1) {
          // Sort slots by open time
          const sortedSlots = [...day.timeSlots].sort((a, b) => 
            a.openTime.localeCompare(b.openTime)
          );
          
          for (let i = 0; i < sortedSlots.length - 1; i++) {
            if (sortedSlots[i].closeTime > sortedSlots[i + 1].openTime) {
              errors[`${dayOfWeek}-overlap`] = 'Time slots cannot overlap';
              isValid = false;
              break;
            }
          }
        }
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleSaveHours = async () => {
    if (!validateHours()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setSaving(true);
    try {
      // Format the hours data for API
      const formattedHours = hoursData.map(day => {
        const formattedDay = {
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen
        };
        
        // Check if we're using the new time slots format
        const isUsingTimeSlots = day.timeSlots && day.timeSlots.length > 0;
        
        if (isUsingTimeSlots) {
          formattedDay.timeSlots = day.timeSlots;
        } else {
          // Use legacy format
          formattedDay.openTime = day.openTime;
          formattedDay.closeTime = day.closeTime;
        }
        
        return formattedDay;
      });
      
      const res = await axiosWithAuth.put(`/api/outlets/${outletId}/hours`, {
        hours: formattedHours
      });
      
      if (res.data.success) {
        toast.success('Operational hours saved successfully');
      } else {
        toast.error(res.data.message || 'Failed to save operational hours');
      }
    } catch (error) {
      console.error('Error saving operational hours:', error);
      toast.error(error.response?.data?.message || 'Error saving operational hours');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Operational Hours
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Set the operational hours for this outlet. You can specify different hours for each day and add multiple time slots if your outlet opens and closes multiple times in a day.
      </Alert>
      
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {days.map((day) => {
          const dayData = hoursData.find(h => h.dayOfWeek === day.value) || {
            dayOfWeek: day.value,
            isOpen: false,
            timeSlots: []
          };
          
          return (
            <DayHours
              key={day.value}
              day={day}
              dayData={dayData}
              onUpdateDay={handleUpdateDay}
              onAddTimeSlot={handleAddTimeSlot}
              validationErrors={validationErrors}
            />
          );
        })}
      </LocalizationProvider>
      
      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveHours}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Hours'}
        </Button>
      </Box>
    </Paper>
  );
};

export default OutletHoursForm;
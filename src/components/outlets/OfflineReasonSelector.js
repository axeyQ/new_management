// src/components/outlets/OfflineReasonSelector.js
import { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormHelperText,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import axiosWithAuth from '@/lib/axiosWithAuth';

const OfflineReasonSelector = ({ value, onChange, error }) => {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    fetchReasons();
  }, []);

  // Set initial custom reason if value doesn't match predefined reasons
  useEffect(() => {
    if (value && !loading && !isPredefined) {
      setCustomReason(value);
    }
  }, [value, loading, reasons]);

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get('/api/offline-reasons?isActive=true');
      if (res.data.success) {
        setReasons(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching offline reasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    console.log('Selected value:', selectedValue);
    
    if (selectedValue === 'custom') {
      // If custom is selected, don't update the parent yet
      // Wait for the custom reason to be entered
      setCustomReason('');
    } else {
      // Otherwise, update with predefined reason
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (e) => {
    const newValue = e.target.value;
    setCustomReason(newValue);
    onChange(newValue); // Update parent with custom value
  };

  // Check if current value is a predefined reason
  const isPredefined = reasons.some(reason => reason.reason === value);
  const selectedValue = isPredefined ? value : 'custom';
  
  // Only show custom field if 'custom' is selected
  const showCustomField = selectedValue === 'custom';

  return (
    <Box>
      <FormControl fullWidth error={!!error} sx={{ mb: 2 }}>
        <InputLabel id="offline-reason-label">Offline Reason</InputLabel>
        <Select
          labelId="offline-reason-label"
          value={loading ? '' : selectedValue}
          onChange={handleChange}
          label="Offline Reason"
          disabled={loading}
        >
          {loading ? (
            <MenuItem value="">
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading reasons...
            </MenuItem>
          ) : (
            <>
              {reasons.map((reason) => (
                <MenuItem key={reason._id} value={reason.reason}>
                  {reason.reason}
                </MenuItem>
              ))}
              <MenuItem value="custom">
                <em>Custom reason...</em>
              </MenuItem>
            </>
          )}
        </Select>
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
      
      {showCustomField && (
        <TextField
          fullWidth
          label="Enter custom reason"
          value={customReason}
          onChange={handleCustomChange}
          error={!!error}
          helperText={error || "Enter a specific reason not in the list above"}
        />
      )}
    </Box>
  );
};

export default OfflineReasonSelector;
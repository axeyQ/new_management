// src/components/outlets/OutletStatusForm.js
import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Box,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';
import OfflineReasonSelector from './OfflineReasonSelector';

const OutletStatusForm = ({ outlet, open, onClose, onSuccess }) => {
  const [status, setStatus] = useState(outlet?.currentStatus || 'online');
  const [reason, setReason] = useState(outlet?.currentOfflineReason || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Update local state when the outlet prop changes
  useEffect(() => {
    if (outlet) {
      setStatus(outlet.currentStatus || 'online');
      setReason(outlet.currentOfflineReason || '');
    }
  }, [outlet, open]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    // Clear reason if setting to online
    if (e.target.value === 'online') {
      setReason('');
      setError('');
    }
  };

  const handleReasonChange = (value) => {
    console.log('Reason changed to:', value);
    setReason(value);
    if (value) setError('');
  };

  const handleSubmit = async () => {
    // Validate
    if (status === 'offline' && !reason) {
      setError('Reason is required when setting outlet to offline');
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting status update:', { 
        status, 
        reason: status === 'offline' ? reason : undefined 
      });
      
      const res = await axiosWithAuth.put(`/api/outlets/${outlet._id}/status`, {
        status,
        reason: status === 'offline' ? reason : undefined,
      });
      
      if (res.data.success) {
        toast.success(`Outlet status updated to ${status}`);
        onSuccess(res.data.data);
        onClose();
      } else {
        toast.error(res.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating outlet status:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Outlet Status</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 1 }}>
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Status</FormLabel>
            <RadioGroup
              row
              name="status"
              value={status}
              onChange={handleStatusChange}
            >
              <FormControlLabel value="online" control={<Radio />} label="Online" />
              <FormControlLabel value="offline" control={<Radio />} label="Offline" />
            </RadioGroup>
          </FormControl>
          {status === 'offline' && (
            <OfflineReasonSelector
              value={reason}
              onChange={handleReasonChange}
              error={error}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OutletStatusForm;
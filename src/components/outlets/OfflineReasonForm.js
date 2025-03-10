// src/components/outlets/OfflineReasonForm.js
import { useState } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  FormControlLabel,
  Switch,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const OfflineReasonForm = ({ reason, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    reason: reason?.reason || '',
    description: reason?.description || '',
    isActive: reason?.isActive !== undefined ? reason.isActive : true,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.error('Reason is required');
      return;
    }

    setLoading(true);
    try {
      const url = reason
        ? `/api/offline-reasons/${reason._id}`
        : '/api/offline-reasons';
      const method = reason ? 'put' : 'post';
      const res = await axiosWithAuth[method](url, formData);
      
      if (res.data.success) {
        toast.success(
          reason
            ? 'Reason updated successfully'
            : 'Reason created successfully'
        );
        onSuccess(res.data.data);
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        {reason ? 'Edit Offline Reason' : 'Add Offline Reason'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          required
          margin="normal"
        />
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          multiline
          rows={3}
          margin="normal"
        />
        <FormControlLabel
          control={
            <Switch
              name="isActive"
              checked={formData.isActive}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Active"
          sx={{ mt: 1, display: 'block' }}
        />
        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : reason ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default OfflineReasonForm;
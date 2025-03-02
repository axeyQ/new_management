'use client';
import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const AddOnGroupForm = ({ addonGroup, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: addonGroup?.name || '',
    availabilityStatus: addonGroup?.availabilityStatus || true,
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
    setLoading(true);
    try {
      const url = addonGroup
        ? `/api/menu/addongroups/${addonGroup._id}`
        : '/api/menu/addongroups';
      const method = addonGroup ? 'put' : 'post';

      const res = await axiosWithAuth[method](url, formData);
      if (res.data.success) {
        toast.success(
          addonGroup
            ? 'Add-on group updated successfully'
            : 'Add-on group created successfully'
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
        {addonGroup ? 'Edit Add-on Group' : 'Add New Add-on Group'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Group Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          margin="normal"
        />
        <FormControlLabel
          control={
            <Switch
              name="availabilityStatus"
              checked={formData.availabilityStatus}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Available"
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
            {loading ? 'Saving...' : addonGroup ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default AddOnGroupForm;
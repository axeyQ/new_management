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
  Autocomplete,
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const AddOnForm = ({ addon, addonGroups, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    selectedDish: null,
    price: addon?.price || '',
    addonGroupId: '',
    availabilityStatus: addon?.availabilityStatus || true,
  });
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);

  useEffect(() => {
    fetchDishes();
    // If editing an addon, find which group it belongs to and set initial dish
    if (addon) {
      for (const group of addonGroups) {
        if (group.addOns?.includes(addon._id)) {
          setFormData(prev => ({
            ...prev,
            addonGroupId: group._id
          }));
          break;
        }
      }
      // If dish reference exists, find the dish
      if (addon.dishReference) {
        fetchInitialDish(addon.dishReference);
      }
    }
  }, [addon, addonGroups]);

  const fetchDishes = async () => {
    setLoadingDishes(true);
    try {
      const res = await axiosWithAuth.get('/api/menu/dishes');
      if (res.data.success) {
        setDishes(res.data.data);
      } else {
        toast.error('Failed to load dishes');
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Error loading dishes');
    } finally {
      setLoadingDishes(false);
    }
  };

  const fetchInitialDish = async (dishId) => {
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}`);
      if (res.data.success) {
        setFormData(prev => ({
          ...prev,
          selectedDish: res.data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching initial dish:', error);
    }
  };

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

  const handlePriceChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      price: value === '' ? '' : parseFloat(value) || 0,
    }));
  };

  const handleDishChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      selectedDish: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.addonGroupId) {
      toast.error('Please select an add-on group');
      return;
    }

    if (!formData.selectedDish) {
      toast.error('Please select a dish');
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API
      const apiData = {
        name: formData.selectedDish.dishName, // Use dish name for add-on name
        price: formData.price,
        addonGroupId: formData.addonGroupId,
        availabilityStatus: formData.availabilityStatus,
        dishReference: formData.selectedDish._id,
      };

      const url = addon
        ? `/api/menu/addons/${addon._id}`
        : '/api/menu/addons';
      const method = addon ? 'put' : 'post';

      const res = await axiosWithAuth[method](url, apiData);
      if (res.data.success) {
        toast.success(
          addon
            ? 'Add-on updated successfully'
            : 'Add-on created successfully'
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
        {addon ? 'Edit Add-on' : 'Add New Add-on'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Autocomplete
          options={dishes}
          getOptionLabel={(option) => option.dishName}
          value={formData.selectedDish}
          onChange={handleDishChange}
          loading={loadingDishes}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Dish *"
              margin="normal"
              fullWidth
              required
            />
          )}
        />
        <TextField
          fullWidth
          label="Price"
          name="price"
          type="number"
          value={formData.price}
          onChange={handlePriceChange}
          InputProps={{
            startAdornment: <span>₹</span>,
          }}
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel id="addon-group-label">Add-on Group *</InputLabel>
          <Select
            labelId="addon-group-label"
            name="addonGroupId"
            value={formData.addonGroupId}
            onChange={handleChange}
            label="Add-on Group *"
            required
          >
            <MenuItem value="">
              <em>Select a group</em>
            </MenuItem>
            {addonGroups.map((group) => (
              <MenuItem key={group._id} value={group._id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
            {loading ? 'Saving...' : addon ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default AddOnForm;
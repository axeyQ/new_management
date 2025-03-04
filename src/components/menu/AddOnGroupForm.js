import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  Grid
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const AddOnGroupForm = ({ addonGroup, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: addonGroup?.name || '',
    availabilityStatus: addonGroup?.availabilityStatus !== undefined ? addonGroup.availabilityStatus : true,
    isCompulsory: addonGroup?.isCompulsory !== undefined ? addonGroup.isCompulsory : false,
    minSelection: addonGroup?.minSelection !== undefined ? addonGroup.minSelection : 0,
    maxSelection: addonGroup?.maxSelection !== undefined ? addonGroup.maxSelection : 0,
    allowMultiple: addonGroup?.allowMultiple !== undefined ? addonGroup.allowMultiple : false,
    maxQuantityPerItem: addonGroup?.maxQuantityPerItem !== undefined ? addonGroup.maxQuantityPerItem : 1
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
    
    // If isCompulsory is turned on, ensure minSelection is at least 1
    if (name === 'isCompulsory' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        minSelection: prev.minSelection < 1 ? 1 : prev.minSelection
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    
    // Validate that maxSelection is greater than or equal to minSelection if set
    if (formData.maxSelection > 0 && formData.maxSelection < formData.minSelection) {
      toast.error('Maximum selection must be greater than or equal to minimum selection');
      return;
    }
    
    // If compulsory, minSelection must be at least 1
    if (formData.isCompulsory && formData.minSelection < 1) {
      toast.error('If selection is compulsory, minimum selection must be at least 1');
      return;
    }
    
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
      console.error("Form submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
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
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          Selection Requirements
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              name="isCompulsory"
              checked={formData.isCompulsory}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Customer Selection is Compulsory"
          sx={{ mt: 1, display: 'block' }}
        />
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Minimum Selection"
              name="minSelection"
              type="number"
              value={formData.minSelection}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0 } }}
              disabled={!formData.isCompulsory}
              helperText={formData.isCompulsory ? "Must be at least 1 if compulsory" : "Not applicable when selection is optional"}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Maximum Selection"
              name="maxSelection"
              type="number"
              value={formData.maxSelection}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0 } }}
              helperText="0 means unlimited selection"
            />
          </Grid>
        </Grid>
        
        <FormControlLabel
          control={
            <Switch
              name="allowMultiple"
              checked={formData.allowMultiple}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Allow Multiple Units of Same Item"
          sx={{ mt: 2, display: 'block' }}
        />
        
        <TextField
          fullWidth
          label="Maximum Quantity Per Item"
          name="maxQuantityPerItem"
          type="number"
          value={formData.maxQuantityPerItem}
          onChange={handleChange}
          InputProps={{ inputProps: { min: 1 } }}
          margin="normal"
          disabled={!formData.allowMultiple}
          helperText={formData.allowMultiple ? "Maximum units of the same add-on" : "Not applicable when multiple units are not allowed"}
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
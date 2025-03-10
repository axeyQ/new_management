import { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Clear as ClearIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';
import { useRouter } from 'next/navigation';

const OutletForm = ({ outletId, onSuccess }) => {
  const router = useRouter();
  const isEditMode = !!outletId;
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    vatNumber: '',
    gstNumber: '',
    logoUrl: '',
    isActive: true,
    deliveryRadius: 5, // in kilometers
    deliveryMinimumOrder: 0,
    deliveryFee: 0,
  });

  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (isEditMode) {
      fetchOutletDetails();
    }
  }, [outletId, isEditMode]);

  const fetchOutletDetails = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get(`/api/outlets/${outletId}`);
      if (res.data.success) {
        // Map API data to form data
        const outlet = res.data.data;
        setFormData({
          name: outlet.name || '',
          address: outlet.address || '',
          city: outlet.city || '',
          state: outlet.state || '',
          postalCode: outlet.postalCode || '',
          country: outlet.country || '',
          phone: outlet.phone || '',
          email: outlet.email || '',
          website: outlet.website || '',
          vatNumber: outlet.vatNumber || '',
          gstNumber: outlet.gstNumber || '',
          logoUrl: outlet.logoUrl || '',
          isActive: outlet.isActive !== false,
          deliveryRadius: outlet.deliveryRadius || 5,
          deliveryMinimumOrder: outlet.deliveryMinimumOrder || 0,
          deliveryFee: outlet.deliveryFee || 0,
        });
      } else {
        setError(res.data.message || 'Failed to fetch outlet details');
      }
    } catch (error) {
      console.error('Error fetching outlet details:', error);
      setError('Error loading outlet details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  // Convert file to base64 for preview and fallback
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLogoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      try {
        // Preview the image immediately using base64
        const base64Data = await fileToBase64(file);
        setFormData(prev => ({
          ...prev,
          logoUrl: base64Data // For preview only
        }));
      } catch (error) {
        console.error('Error creating preview:', error);
        toast.error('Could not preview the selected image');
      }
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      logoUrl: ''
    }));
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (file) => {
    setUploadingLogo(true);
    try {
      // First try the standard file upload approach
      const formData = new FormData();
      formData.append('logo', file);
      
      const uploadRes = await axiosWithAuth.post('/api/upload', formData);
      if (uploadRes.data.success) {
        return uploadRes.data.url;
      }
      throw new Error('Upload failed');
    } catch (uploadError) {
      console.error('Standard upload failed, trying base64 fallback:', uploadError);
      
      // Fallback to base64 approach
      try {
        const base64Data = await fileToBase64(file);
        const mimeType = file.type;
        const fileName = file.name;
        
        const uploadRes = await axiosWithAuth.post('/api/upload', {
          base64Data,
          mimeType,
          fileName
        });
        
        if (uploadRes.data.success) {
          return uploadRes.data.url;
        }
        
        // Last resort - just use the base64 data directly
        return base64Data;
      } catch (base64Error) {
        console.error('Base64 upload failed:', base64Error);
        throw new Error('Failed to upload logo using all available methods');
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Outlet name is required');
      return;
    }
    
    setSaving(true);
    let logoUrl = formData.logoUrl;
    
    try {
      // Handle logo upload if there's a new file
      if (logoFile) {
        try {
          logoUrl = await uploadLogo(logoFile);
        } catch (logoError) {
          console.error('Logo upload error:', logoError);
          toast.error('Failed to upload logo, but continuing with other data');
          // Continue with form submission even if logo upload fails
        }
      }
      
      // Prepare data for submission
      const updatedData = {
        ...formData,
        logoUrl
      };
      
      // Send the data to the server
      const method = isEditMode ? 'put' : 'post';
      const url = isEditMode ? `/api/outlets/${outletId}` : '/api/outlets';
      const res = await axiosWithAuth[method](url, updatedData);
      
      if (res.data.success) {
        toast.success(
          isEditMode
            ? 'Outlet updated successfully'
            : 'Outlet created successfully'
        );
        if (onSuccess) {
          onSuccess(res.data.data);
        } else {
          // Redirect to outlet page
          router.push('/dashboard/outlet');
        }
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error saving outlet:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
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
      <Typography variant="h5" gutterBottom>
        {isEditMode ? 'Edit Outlet' : 'Create New Outlet'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6">Basic Information</Typography>
          </Grid>
          
          {/* Restaurant Logo */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Restaurant Logo</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {formData.logoUrl && (
                <Box position="relative" width={100} height={100} border="1px solid #ddd" borderRadius={1} overflow="hidden">
                  <img 
                    src={formData.logoUrl} 
                    alt="Restaurant logo" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                  <IconButton 
                    size="small" 
                    sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.7)' }}
                    onClick={handleRemoveLogo}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <Box>
                <Tooltip title="Maximum size: 2MB. Allowed formats: JPG, PNG, GIF, WebP">
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={uploadingLogo ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploadingLogo}
                  >
                    {formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleLogoChange}
                      ref={fileInputRef}
                    />
                  </Button>
                </Tooltip>
                <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                  Maximum size: 2MB. Formats: JPG, PNG, GIF, WebP
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Outlet Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://www.example.com"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="VAT Number"
              name="vatNumber"
              value={formData.vatNumber}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="GST Number"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" mt={2}>Address</Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="State/Province"
              name="state"
              value={formData.state}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Postal Code"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" mt={2}>Delivery Settings</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Delivery Radius (km)"
              name="deliveryRadius"
              type="number"
              value={formData.deliveryRadius}
              onChange={handleNumberChange}
              InputProps={{ inputProps: { min: 0, step: 0.1 } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Minimum Order Value"
              name="deliveryMinimumOrder"
              type="number"
              value={formData.deliveryMinimumOrder}
              onChange={handleNumberChange}
              InputProps={{ inputProps: { min: 0, step: 10 } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Delivery Fee"
              name="deliveryFee"
              type="number"
              value={formData.deliveryFee}
              onChange={handleNumberChange}
              InputProps={{ inputProps: { min: 0, step: 5 } }}
            />
          </Grid>
          <Grid item xs={12}>
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
            />
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={() => router.push('/dashboard/outlet')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saving || uploadingLogo}
            startIcon={saving && <CircularProgress size={20} color="inherit" />}
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Outlet' : 'Create Outlet'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default OutletForm;
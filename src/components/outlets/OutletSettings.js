'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

export default function OutletSettings() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [outletId, setOutletId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState(null);
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
    deliveryRadius: 5,
    deliveryMinimumOrder: 0,
    deliveryFee: 0,
  });
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isAuthenticated) {
      fetchOutlet();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchOutlet = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get('/api/outlets');
      if (res.data.success && res.data.data.length > 0) {
        const outlet = res.data.data[0];
        setOutletId(outlet._id);
        
        // Log the raw data to verify phone is coming through
        console.log("Fetched outlet data:", outlet);
        
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
        setError('No outlet found. Please contact your administrator.');
      }
    } catch (error) {
      console.error('Error fetching outlet:', error);
      setError('Error loading outlet information');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/outlet');
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
      
      // Log what we're sending to the server
      console.log("Submitting outlet data:", updatedData);
      
      // Send the data to the server
      const url = `/api/outlets/${outletId}`;
      const res = await axiosWithAuth.put(url, updatedData);
      
      if (res.data.success) {
        toast.success('Outlet updated successfully');
        
        // Instead of refetching, update the state directly with the response data
        if (res.data.data) {
          console.log("Server response data:", res.data.data);
          const updatedOutlet = res.data.data;
          
          // Update form data with the response from the server
          setFormData(prev => ({
            ...prev,
            name: updatedOutlet.name || prev.name,
            address: updatedOutlet.address || prev.address,
            city: updatedOutlet.city || prev.city,
            state: updatedOutlet.state || prev.state,
            postalCode: updatedOutlet.postalCode || prev.postalCode,
            country: updatedOutlet.country || prev.country,
            phone: updatedOutlet.phone || prev.phone,
            email: updatedOutlet.email || prev.email,
            website: updatedOutlet.website || prev.website,
            vatNumber: updatedOutlet.vatNumber || prev.vatNumber,
            gstNumber: updatedOutlet.gstNumber || prev.gstNumber,
            logoUrl: updatedOutlet.logoUrl || prev.logoUrl,
            isActive: updatedOutlet.isActive !== false,
            deliveryRadius: updatedOutlet.deliveryRadius || prev.deliveryRadius,
            deliveryMinimumOrder: updatedOutlet.deliveryMinimumOrder || prev.deliveryMinimumOrder,
            deliveryFee: updatedOutlet.deliveryFee || prev.deliveryFee,
          }));
        } else {
          // If no data in response, fetch fresh data
          fetchOutlet();
        }
      } else {
        toast.error(res.data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error saving outlet:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setSaving(false);
      setLogoFile(null); // Reset logo file after save
    }
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Outlet Settings</Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>Edit Outlet</Typography>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Basic Information</Typography>

          {/* Restaurant Logo */}
          <Box mb={3}>
            <Typography variant="body1" fontWeight="medium" gutterBottom>Restaurant Logo</Typography>
            <Box display="flex" alignItems="flex-start" gap={2}>
              {formData.logoUrl ? (
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
              ) : (
                <Box
                  width={100}
                  height={100}
                  border="1px dashed #ccc"
                  borderRadius={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="#f9f9f9"
                >
                  <Typography variant="caption" color="text.secondary" align="center">
                    No logo
                  </Typography>
                </Box>
              )}
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploadingLogo ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  disabled={uploadingLogo}
                  sx={{ textTransform: 'uppercase' }}
                >
                  Upload Logo
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoChange}
                    ref={fileInputRef}
                  />
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                  Maximum size: 2MB. Formats: JPG, PNG, GIF, WebP
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Outlet Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                placeholder="https://www.example.com"
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="VAT Number"
                name="vatNumber"
                value={formData.vatNumber || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GST Number"
                name="gstNumber"
                value={formData.gstNumber || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>Address</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State/Province"
                name="state"
                value={formData.state || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Postal Code"
                name="postalCode"
                value={formData.postalCode || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>Delivery Settings</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Delivery Radius (km)"
                name="deliveryRadius"
                type="number"
                value={formData.deliveryRadius}
                onChange={handleNumberChange}
                InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                margin="normal"
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
                margin="normal"
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
                margin="normal"
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
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
            <Button
              variant="outlined"
              onClick={handleBack}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
'use client';
import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Tab,
  Tabs,
  Link,
} from '@mui/material';
import {
  Store as StoreIcon,
  AccessTime as AccessTimeIcon,
  PowerSettingsNew as PowerIcon,
  Language as LanguageIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import OutletStatusForm from './OutletStatusForm';
import OutletStatusHistory from './OutletStatusHistory';
import OfflineReasonStats from './OfflineReasonStats';

const OutletDetails = ({ outletId }) => {
  const [outlet, setOutlet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openStatusForm, setOpenStatusForm] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchOutletDetails();
  }, [outletId]);

  const fetchOutletDetails = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get(`/api/outlets/${outletId}`);
      if (res.data.success) {
        setOutlet(res.data.data);
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

  const handleStatusUpdate = (updatedOutlet) => {
    setOutlet(updatedOutlet);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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

  if (!outlet) {
    return <Alert severity="warning">Outlet not found</Alert>;
  }

  const isOffline = outlet.currentStatus === 'offline';

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <StoreIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h5">{outlet.name}</Typography>
          </Box>
          <Button
            variant="contained"
            color={isOffline ? "success" : "error"}
            startIcon={<PowerIcon />}
            onClick={() => setOpenStatusForm(true)}
          >
            {isOffline ? "Set Online" : "Set Offline"}
          </Button>
        </Box>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Logo */}
          {outlet.logoUrl && (
            <Grid item xs={12} sm={3}>
              <Box 
                sx={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1, 
                  p: 1, 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 140
                }}
              >
                <img 
                  src={outlet.logoUrl} 
                  alt={`${outlet.name} Logo`} 
                  style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} 
                />
              </Box>
            </Grid>
          )}
          
          {/* Basic Info */}
          <Grid item xs={12} sm={outlet.logoUrl ? 9 : 12} md={outlet.logoUrl ? 5 : 6}>
            <Typography variant="body1" gutterBottom>
              <strong>Address:</strong> {outlet.address || 'No address provided'}
            </Typography>
            {outlet.city && outlet.postalCode && (
              <Typography variant="body1" gutterBottom>
                {`${outlet.city}, ${outlet.state || ''} ${outlet.postalCode}`}
                {outlet.country && `, ${outlet.country}`}
              </Typography>
            )}
            <Typography variant="body1" gutterBottom>
              <strong>Phone:</strong> {outlet.phone || 'No phone provided'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Email:</strong> {outlet.email || 'No email provided'}
            </Typography>
            {outlet.website && (
              <Typography variant="body1" gutterBottom display="flex" alignItems="center" gap={0.5}>
                <LanguageIcon fontSize="small" color="action" />
                <Link href={outlet.website} target="_blank" rel="noopener noreferrer" underline="hover">
                  {outlet.website}
                </Link>
              </Typography>
            )}
            <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
              <strong>Status:</strong>{' '}
              <Chip
                label={outlet.currentStatus}
                color={isOffline ? 'error' : 'success'}
                size="small"
              />
            </Typography>
          </Grid>
          
          {/* Tax Info & Status */}
          <Grid item xs={12} md={4}>
            {(outlet.vatNumber || outlet.gstNumber) && (
              <Box mb={2} p={2} border="1px solid #e0e0e0" borderRadius={1}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight="bold" 
                  gutterBottom 
                  display="flex" 
                  alignItems="center" 
                  gap={0.5}
                >
                  <ReceiptIcon fontSize="small" color="primary" />
                  Tax Information
                </Typography>
                {outlet.vatNumber && (
                  <Typography variant="body2" gutterBottom>
                    <strong>VAT Number:</strong> {outlet.vatNumber}
                  </Typography>
                )}
                {outlet.gstNumber && (
                  <Typography variant="body2" gutterBottom>
                    <strong>GST Number:</strong> {outlet.gstNumber}
                  </Typography>
                )}
              </Box>
            )}
            
            {isOffline && (
              <Card variant="outlined" sx={{ bgcolor: '#fff4f4' }}>
                <CardContent>
                  <Typography color="error" variant="subtitle2">
                    Offline Since: {new Date(outlet.offlineTimestamp).toLocaleString()}
                  </Typography>
                  <Typography color="error" variant="subtitle1" fontWeight="bold">
                    Reason: {outlet.currentOfflineReason}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Status History" />
          <Tab label="Offline Reasons" />
        </Tabs>
      </Paper>

      {activeTab === 0 && <OutletStatusHistory outletId={outletId} />}
      {activeTab === 1 && <OfflineReasonStats outletId={outletId} />}

      {/* Status Update Dialog */}
      <OutletStatusForm
        outlet={outlet}
        open={openStatusForm}
        onClose={() => setOpenStatusForm(false)}
        onSuccess={handleStatusUpdate}
      />
    </Box>
  );
};

export default OutletDetails;
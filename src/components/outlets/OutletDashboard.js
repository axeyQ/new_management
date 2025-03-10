// src/components/outlets/OutletDashboard.js
'use client';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Paper,
} from '@mui/material';
import {
  Store as StoreIcon,
  Edit as EditIcon,
  PowerSettingsNew as PowerIcon,
  AccessTime as AccessTimeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import OutletStatusForm from './OutletStatusForm';
import OutletForm from './OutletForm';
import { useAuth } from '@/context/AuthContext';
import { Add as AddIcon } from '@mui/icons-material';

const OutletDashboard = () => {
    const router = useRouter();
  const [outlet, setOutlet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openStatusForm, setOpenStatusForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuth();


  useEffect(() => {
    fetchOutlet();
  }, []);

  const fetchOutlet = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get('/api/outlets');
      if (res.data.success && res.data.data.length > 0) {
        setOutlet(res.data.data[0]);
        setShowCreateForm(false);
      } else {
        setOutlet(null);
        // Only allow admins to see the create form
        setShowCreateForm(user?.role === 'admin');
      }
    } catch (error) {
      console.error('Error fetching outlet:', error);
      toast.error('Error loading outlet information');
      setOutlet(null);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateOutlet = () => {
    router.push('/dashboard/outlets/create');
  };
  const handleOutletCreated = (newOutlet) => {
    setOutlet(newOutlet);
    setShowCreateForm(false);
    toast.success('Outlet created successfully');
  };

  const handleStatusUpdate = (updatedOutlet) => {
    setOutlet(updatedOutlet);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  const getStatusDuration = (outlet) => {
    if (outlet.currentStatus !== 'offline' || !outlet.offlineTimestamp) {
      return null;
    }
    
    const offlineTime = new Date(outlet.offlineTimestamp);
    const now = new Date();
    const diffMs = now - offlineTime;
    
    // Convert to hours and minutes
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!outlet) {
    return (
      <Alert severity="warning">
        No outlet found. Please contact your administrator.
      </Alert>
    );
  }

  if (!outlet) {
    return (
      <Box>
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            user?.role === 'admin' ? (
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleCreateOutlet}
                startIcon={<AddIcon />}
              >
                Create Outlet
              </Button>
            ) : null
          }
        >
          No outlet found. {user?.role === 'admin' ? 'Please create an outlet to continue.' : 'Please contact your administrator.'}
        </Alert>
      </Box>
    );
  }

  if (showCreateForm) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create Restaurant Outlet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please create your restaurant outlet to continue. This information will be used for all aspects of your restaurant management.
        </Typography>
        <OutletForm onSuccess={handleOutletCreated} singleOutletMode={true} />
      </Paper>
    );
  }

  const isOffline = outlet.currentStatus === 'offline';
  const offlineDuration = getStatusDuration(outlet);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Outlet Status</Typography>
      
      <Card sx={{ mb: 4, border: isOffline ? '1px solid #ffcccc' : 'none', bgcolor: isOffline ? '#fff9f9' : 'white' }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" mb={2}>
                <StoreIcon sx={{ mr: 1, fontSize: 40, color: isOffline ? 'error.main' : 'primary.main' }} />
                <Box>
                  <Typography variant="h5">{outlet.name}</Typography>
                  <Typography variant="body2">{outlet.address || 'No address available'}</Typography>
                </Box>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> 
                  <Chip
                    label={outlet.currentStatus}
                    color={isOffline ? 'error' : 'success'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                
                {isOffline && (
                  <Box mt={1}>
                    <Typography variant="body2" color="error">
                      <strong>Offline since:</strong> {formatDateTime(outlet.offlineTimestamp)}
                      {offlineDuration && ` (${offlineDuration})`}
                    </Typography>
                    <Typography variant="body2" color="error">
                      <strong>Reason:</strong> {outlet.currentOfflineReason || 'No reason provided'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" gap={2} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                <Button
                  variant="contained"
                  color={isOffline ? "success" : "error"}
                  startIcon={<PowerIcon />}
                  onClick={() => setOpenStatusForm(true)}
                >
                  {isOffline ? "Set Online" : "Set Offline"}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => router.push('/dashboard/outlet/hours')}
                >
                  Manage Hours
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => router.push('/dashboard/outlet/settings')}
                >
                  Outlet Settings
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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

export default OutletDashboard;
// src/app/dashboard/outlet/hours/page.js
'use client';
import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Button,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axiosWithAuth from '@/lib/axiosWithAuth';
import OutletHoursForm from '@/components/outlets/OutletHoursForm';

export default function OutletHoursPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [outletId, setOutletId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setOutletId(res.data.data[0]._id);
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
        <Typography variant="h5">Outlet Operational Hours</Typography>
      </Box>

      {outletId ? (
        <OutletHoursForm outletId={outletId} />
      ) : (
        <Alert severity="warning">
          No outlet found. Please contact your administrator.
        </Alert>
      )}
    </Container>
  );
}
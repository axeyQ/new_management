// src/app/dashboard/outlets/create/page.js
'use client';
import { Container, Box, Typography, Paper, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import OutletForm from '@/components/outlets/OutletForm';

export default function CreateOutletPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!loading && isAuthenticated && user?.role !== 'admin') {
      // Only admins can create outlets
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router, user]);

  const handleGoBack = () => {
    router.push('/dashboard/outlets');
  };

  const handleOutletCreated = () => {
    router.push('/dashboard/outlets');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={handleGoBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Create Restaurant Outlet</Typography>
      </Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" paragraph>
          Set up your restaurant outlet information below. This is required to use the system.
        </Typography>
        <OutletForm onSuccess={handleOutletCreated} />
      </Paper>
    </Container>
  );
}
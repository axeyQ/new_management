// src/app/dashboard/outlets/[id]/page.js
'use client';
import { Container, Box, Button, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import OutletDetails from '@/components/outlets/OutletDetails';

export default function OutletDetailPage({ params }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleGoBack = () => {
    router.push('/dashboard/outlets');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={3}>
        <IconButton onClick={handleGoBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Button variant="outlined" onClick={handleGoBack}>
          Back to Outlets
        </Button>
      </Box>
      <OutletDetails outletId={id} />
    </Container>
  );
}
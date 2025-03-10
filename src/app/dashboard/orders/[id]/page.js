// src/app/dashboard/orders/[id]/page.js
'use client';
import { Box, Paper, Container, Typography, Button } from '@mui/material';
import OrderDetail from '@/components/orders/OrderDetail';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowBack as BackIcon } from '@mui/icons-material';

export default function OrderDetailPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract the order ID from params
  const orderId = params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }

    // Check if orderId is valid
    if (!orderId) {
      setError('Invalid Order ID');
      setLoading(false);
    } else {
      console.log(`OrderDetailPage received order ID: ${orderId}`);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, router, orderId]);

  const handleBack = () => {
    router.push('/dashboard/orders');
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box component={Paper} p={3} textAlign="center">
          <Typography variant="h6">Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box component={Paper} p={3} textAlign="center">
          <Typography variant="h6" color="error">{error}</Typography>
          <Button 
            variant="outlined" 
            startIcon={<BackIcon />} 
            onClick={handleBack}
            sx={{ mt: 2 }}
          >
            Back to Orders
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box component={Paper} p={3}>
        <OrderDetail orderId={orderId} />
      </Box>
    </Container>
  );
}
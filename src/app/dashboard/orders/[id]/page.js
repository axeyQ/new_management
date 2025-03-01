// src/app/dashboard/orders/[id]/page.js
'use client';
import { Box, Paper, Container } from '@mui/material';
import OrderDetail from '@/components/orders/OrderDetail';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OrderDetailPage({ params }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box component={Paper} p={3}>
        <OrderDetail orderId={params.id} />
      </Box>
    </Container>
  );
}
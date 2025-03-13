'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, Container } from '@mui/material';
import OrderManagementDashboard from '@/components/dashboard/OrderManagementDashboard';

export default function OrderManagementPage() {
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
      <Box sx={{ height: 'calc(100vh - 100px)', overflow: 'auto' }}>
        <OrderManagementDashboard />
      </Box>
    </Container>
  );
}
'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, Container, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';

// Import TableView with SSR disabled to prevent "navigator is not defined" error
const TableView = dynamic(
  () => import('@/components/salesregister/TableView'),
  { ssr: false }
);

export default function TableViewPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
        {/* TableView will only be loaded on the client side */}
        <TableView />
      </Box>
    </Container>
  );
}
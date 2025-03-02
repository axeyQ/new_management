// src/app/dashboard/menu/menus/[id]/page.js
'use client';
import { Box, Paper, Container } from '@mui/material';
import MenuDetails from '@/components/menu/MenuDetails';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MenuDetailPage({ params }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { id } = params;
  
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box component={Paper} p={3}>
        <MenuDetails menuId={id} />
      </Box>
    </Container>
  );
}
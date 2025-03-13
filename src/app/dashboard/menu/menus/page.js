// src/app/dashboard/menu/menus/page.js
'use client';
import { Box, Paper, Container, Typography, LinearProgress } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
const MenuList = dynamic(() => import('@/components/menu/MenuList'), {
  ssr: false,
  loading: () => (
    <Box sx={{ width: '100%', mt: 4 }}>
      <LinearProgress />
      <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
        Loading menu data...
      </Typography>
    </Box>
  ),
});
export default function MenusPage() {
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box component={Paper} p={3}>
        <MenuList />
      </Box>
    </Container>
  );
}
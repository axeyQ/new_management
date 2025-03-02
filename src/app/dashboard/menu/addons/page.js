// src/app/dashboard/menu/addons/page.js
'use client';
import { Box, Paper, Container, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import AddOnGroupList from '@/components/menu/AddOnGroupList';
import AddOnList from '@/components/menu/AddOnList';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddOnsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Add-on Groups" />
          <Tab label="Add-ons" />
        </Tabs>
      </Paper>
      
      <Box component={Paper} p={3}>
        {activeTab === 0 && <AddOnGroupList />}
        {activeTab === 1 && <AddOnList />}
      </Box>
    </Container>
  );
}
// src/app/dashboard/outlets/offline-reasons/page.js
'use client';
import { useState } from 'react';
import { Box, Container, Paper, Tabs, Tab } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import OfflineReasonList from '@/components/outlets/OfflineReasonList';
import OfflineReasonStats from '@/components/outlets/OfflineReasonStats';

export default function OfflineReasonsPage() {
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
          <Tab label="Manage Reasons" />
          <Tab label="Usage Statistics" />
        </Tabs>
      </Paper>
      <Box component={Paper} p={3}>
        {activeTab === 0 && <OfflineReasonList />}
        {activeTab === 1 && <OfflineReasonStats />}
      </Box>
    </Container>
  );
}
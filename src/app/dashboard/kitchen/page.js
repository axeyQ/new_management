'use client';
import { useState } from 'react';
import { Box, Container, Paper, Tab, Tabs } from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Restaurant as RestaurantIcon,
  InsertChart as ChartIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import KitchenDisplay from '@/components/kitchen/KitchenDisplay';
import KitchenMetrics from '@/components/kitchen/KitchenMetrics';

export default function KitchenDisplayPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper square>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="kitchen display tabs"
        >
          <Tab icon={<RestaurantIcon />} label="KITCHEN DISPLAY" />
          <Tab icon={<ChartIcon />} label="METRICS & PERFORMANCE" />
        </Tabs>
      </Paper>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {tabValue === 0 && <KitchenDisplay />}
        {tabValue === 1 && <KitchenMetrics />}
      </Box>
    </Box>
  );
}
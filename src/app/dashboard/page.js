'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Container,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  TableRestaurant as TableIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import axios from 'axios';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    categories: 0,
    dishes: 0,
    tables: 0,
    orders: 0,
    customers: 0,
  });

  useEffect(() => {
    // In a real implementation, you would fetch actual statistics from your API
    const fetchStats = async () => {
      try {
        // For now, we'll just use placeholder data
        // In the future, you would implement API endpoints for these statistics
        setStats({
          categories: 8,
          dishes: 42,
          tables: 15,
          orders: 124,
          customers: 350,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  const DashboardCard = ({ title, icon, count, link, color }) => {
    const Icon = icon;
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box
              sx={{
                backgroundColor: `${color}.light`,
                borderRadius: '50%',
                p: 1,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ fontSize: 40, color: `${color}.main` }} />
            </Box>
            <Typography variant="h5" component="div">
              {title}
            </Typography>
          </Box>
          <Typography variant="h3" component="div" sx={{ textAlign: 'center', my: 3 }}>
            {count}
          </Typography>
        </CardContent>
        <CardActions>
          <Button
            component={Link}
            href={link}
            size="small"
            color="primary"
            sx={{ ml: 'auto' }}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.username}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Here&apos;s an overview of your restaurant management system
      </Typography>

      <Grid container spacing={3} mt={3}>
        <Grid item xs={12} sm={6} lg={4}>
          <DashboardCard
            title="Menu Items"
            icon={RestaurantIcon}
            count={stats.dishes}
            link="/dashboard/menu/dishes"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <DashboardCard
            title="Tables"
            icon={TableIcon}
            count={stats.tables}
            link="/dashboard/tables"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <DashboardCard
            title="Orders"
            icon={ReceiptIcon}
            count={stats.orders}
            link="/dashboard/orders"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={6}>
          <DashboardCard
            title="Customers"
            icon={PeopleIcon}
            count={stats.customers}
            link="/dashboard/customers"
            color="info"
          />
        </Grid>
      </Grid>

      <Box mt={5}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2} mt={1}>
            <Grid item>
              <Button
                variant="contained"
                component={Link}
                href="/dashboard/tables/layout"
              >
                Manage Table Layout
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="success"
                component={Link}
                href="/dashboard/orders/new"
              >
                Create New Order
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                href="/dashboard/menu/dishes"
              >
                Manage Menu
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
}
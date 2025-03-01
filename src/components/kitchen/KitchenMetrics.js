'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Speed as SpeedIcon,
  BarChart as BarChartIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

// Helper function to calculate average prep time
const calculateAvgPrepTime = (orders) => {
  if (!orders || orders.length === 0) return 0;
  
  // Calculate prep time for orders with both start and completion times
  const completedOrders = orders.filter(order => 
    order.preparationStartTime && order.completionTime
  );
  
  if (completedOrders.length === 0) return 0;
  
  const totalPrepTime = completedOrders.reduce((sum, order) => {
    const startTime = new Date(order.preparationStartTime).getTime();
    const endTime = new Date(order.completionTime).getTime();
    const prepTimeMinutes = (endTime - startTime) / (1000 * 60);
    return sum + prepTimeMinutes;
  }, 0);
  
  return Math.round(totalPrepTime / completedOrders.length);
};

const KitchenMetrics = () => {
  const [metrics, setMetrics] = useState({
    activeOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    avgPrepTime: 0,
    stationMetrics: {
      'grill': { count: 0, avgTime: 0 },
      'fry': { count: 0, avgTime: 0 },
      'salad': { count: 0, avgTime: 0 },
      'dessert': { count: 0, avgTime: 0 },
      'bar': { count: 0, avgTime: 0 }
    }
  });
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(true);
  
  // Fetch kitchen metrics
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be an actual API endpoint
      // This is mock data for demonstration
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      const mockMetrics = {
        activeOrders: Math.floor(Math.random() * 15) + 5,
        pendingOrders: Math.floor(Math.random() * 10),
        completedOrders: Math.floor(Math.random() * 50) + 20,
        avgPrepTime: Math.floor(Math.random() * 15) + 5,
        stationMetrics: {
          'grill': { 
            count: Math.floor(Math.random() * 20) + 10, 
            avgTime: Math.floor(Math.random() * 15) + 8 
          },
          'fry': { 
            count: Math.floor(Math.random() * 15) + 5, 
            avgTime: Math.floor(Math.random() * 10) + 5 
          },
          'salad': { 
            count: Math.floor(Math.random() * 12) + 3, 
            avgTime: Math.floor(Math.random() * 8) + 3 
          },
          'dessert': { 
            count: Math.floor(Math.random() * 10) + 2, 
            avgTime: Math.floor(Math.random() * 12) + 4 
          },
          'bar': { 
            count: Math.floor(Math.random() * 18) + 7, 
            avgTime: Math.floor(Math.random() * 5) + 2 
          }
        }
      };
      
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching kitchen metrics:', error);
      toast.error('Error loading metrics');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchMetrics();
    
    // Refresh metrics every 5 minutes
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [timeRange]);
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Get efficiency level based on average time
  const getEfficiencyLevel = (avgTime) => {
    if (avgTime < 8) return { level: 'High', color: 'success.main' };
    if (avgTime < 15) return { level: 'Medium', color: 'warning.main' };
    return { level: 'Low', color: 'error.main' };
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Kitchen Performance Metrics
        </Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            value={timeRange}
            onChange={handleTimeRangeChange}
            label="Time Range"
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Active Orders
                    </Typography>
                  </Box>
                  <Typography variant="h3" component="div" color="primary.main">
                    {metrics.activeOrders}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metrics.pendingOrders} pending, {metrics.activeOrders - metrics.pendingOrders} in progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AccessTimeIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Avg. Prep Time
                    </Typography>
                  </Box>
                  <Typography variant="h3" component="div" color="secondary.main">
                    {metrics.avgPrepTime}m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metrics.completedOrders} orders completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SpeedIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Fastest Station
                    </Typography>
                  </Box>
                  <Typography variant="h3" component="div" color="success.main">
                    {Object.entries(metrics.stationMetrics)
                      .sort((a, b) => a[1].avgTime - b[1].avgTime)[0][0]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Object.entries(metrics.stationMetrics)
                      .sort((a, b) => a[1].avgTime - b[1].avgTime)[0][1].avgTime}m avg. time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <BarChartIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Busiest Station
                    </Typography>
                  </Box>
                  <Typography variant="h3" component="div" color="info.main">
                    {Object.entries(metrics.stationMetrics)
                      .sort((a, b) => b[1].count - a[1].count)[0][0]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Object.entries(metrics.stationMetrics)
                      .sort((a, b) => b[1].count - a[1].count)[0][1].count} orders
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Station Performance */}
          <Typography variant="h6" gutterBottom>
            Station Performance
          </Typography>
          <Grid container spacing={3}>
            {Object.entries(metrics.stationMetrics).map(([station, data]) => {
              const efficiency = getEfficiencyLevel(data.avgTime);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={station}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                      {station} Station
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Orders Processed:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {data.count}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Average Time:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {data.avgTime} minutes
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Efficiency:</Typography>
                      <Chip 
                        label={efficiency.level} 
                        size="small"
                        sx={{ 
                          bgcolor: efficiency.color,
                          color: 'white'
                        }}
                      />
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={((20 - Math.min(data.avgTime, 20)) / 20) * 100}
                      color={
                        efficiency.level === 'High' ? 'success' :
                        efficiency.level === 'Medium' ? 'warning' : 'error'
                      }
                      sx={{ mt: 2, height: 8, borderRadius: 4 }}
                    />
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default KitchenMetrics;
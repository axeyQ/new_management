// src/components/outlets/OfflineReasonStats.js
'use client';
import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import axiosWithAuth from '@/lib/axiosWithAuth';

const OfflineReasonStats = ({ outletId }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [outletId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const url = outletId 
        ? `/api/outlets/${outletId}/status/reasons` 
        : '/api/outlets/status/reasons';
      
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setStats(res.data.data);
      } else {
        setError(res.data.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching reason stats:', error);
      setError('Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {outletId ? 'Outlet Offline Reason Usage' : 'Most Used Offline Reasons'}
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : stats.length === 0 ? (
        <Alert severity="info">No offline reason usage data available</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Usage Count</TableCell>
                <TableCell align="right">Last Used</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.map((stat, index) => (
                <TableRow key={index}>
                  <TableCell>{stat.reason}</TableCell>
                  <TableCell align="right">{stat.count}</TableCell>
                  <TableCell align="right">{formatDate(stat.lastUsed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default OfflineReasonStats;
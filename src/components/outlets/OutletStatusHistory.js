// src/components/outlets/OutletStatusHistory.js
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
  Chip,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Refresh as RefreshIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';

const OutletStatusHistory = ({ outletId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchStatusHistory();
  }, [outletId, startDate, endDate]);

  const fetchStatusHistory = async () => {
    setLoading(true);
    try {
      let url = `/api/outlets/${outletId}/status/history`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setHistory(res.data.data);
      } else {
        setError(res.data.message || 'Failed to fetch status history');
      }
    } catch (error) {
      console.error('Error fetching outlet status history:', error);
      setError('Error loading status history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStatusHistory();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Status History</Typography>
        <IconButton onClick={handleRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
        </LocalizationProvider>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : history.length === 0 ? (
        <Alert severity="info">No status history available</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Changed By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                  <TableCell>
                    <Chip
                      label={entry.status}
                      color={entry.status === 'online' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{entry.reason || '-'}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                      {entry.createdBy?.username || 'Unknown'}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default OutletStatusHistory;
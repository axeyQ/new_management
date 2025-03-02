// src/components/menu/DishVariants.js
'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import axiosWithAuth from '@/lib/axiosWithAuth';

const DishVariants = ({ dishId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dishId) {
      fetchVariants();
    }
  }, [dishId]);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
      if (res.data.success) {
        setVariants(res.data.data);
      } else {
        setError(res.data.message || 'Failed to fetch variants');
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setError('Error loading variants. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" padding={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (variants.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No variants available for this dish.
      </Typography>
    );
  }

  return (
    <Box mt={2}>
      <Typography variant="subtitle1" gutterBottom>
        Variants ({variants.length})
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variant Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant._id}>
                <TableCell>{variant.variantName}</TableCell>
                <TableCell>{variant.description || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={variant.isAvailable ? 'Available' : 'Unavailable'}
                    color={variant.isAvailable ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DishVariants;
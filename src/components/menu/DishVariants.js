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
import axios from 'axios';

const DishVariants = ({ dishId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVariants = async () => {
      if (!dishId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Using axios directly without the axiosWithAuth wrapper to simplify
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/menu/dishes/${dishId}/variants`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          setVariants(response.data.data);
        } else {
          setError(response.data.message || 'Failed to load variants');
        }
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError('Error loading variants. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVariants();
  }, [dishId]);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  if (variants.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
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
                    label={variant.isAvailable !== false ? 'Available' : 'Unavailable'}
                    color={variant.isAvailable !== false ? 'success' : 'default'}
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
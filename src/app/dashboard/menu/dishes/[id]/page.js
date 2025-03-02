// src/app/dashboard/menu/dishes/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Button,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import DishVariants from '@/components/menu/DishVariants'; // Import the variants component

export default function DishDetailPage({ params }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = params;
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isAuthenticated) {
      fetchDish();
    }
  }, [isAuthenticated, authLoading, id, router]);

  const fetchDish = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${id}`);
      if (res.data.success) {
        setDish(res.data.data);
      } else {
        setError(res.data.message || 'Failed to fetch dish details');
      }
    } catch (error) {
      console.error('Error fetching dish:', error);
      setError('Error loading dish details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/menu/dishes/edit/${id}`);
  };

  const handleBack = () => {
    router.push('/dashboard/menu/dishes');
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!dish) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Dish not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            {dish.dishName}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit Dish
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {dish.image && (
              <Box
                component="img"
                src={dish.image}
                alt={dish.dishName}
                sx={{
                  width: '100%',
                  height: 300,
                  objectFit: 'cover',
                  borderRadius: 1,
                  mb: 2,
                }}
              />
            )}

            <Typography variant="body1" gutterBottom>
              {dish.description || 'No description available.'}
            </Typography>

            <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
              <Chip
                label={dish.dieteryTag}
                color={
                  dish.dieteryTag === 'veg'
                    ? 'success'
                    : dish.dieteryTag === 'non veg'
                    ? 'error'
                    : 'warning'
                }
                size="small"
              />
              {dish.specialTag && (
                <Chip label={dish.specialTag} color="secondary" size="small" />
              )}
              {dish.spiceLevel && (
                <Chip label={dish.spiceLevel} size="small" />
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Details
            </Typography>
            <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1 }}>
              <Typography component="dt" variant="body2" fontWeight="bold">
                Categories:
              </Typography>
              <Typography component="dd" variant="body2">
                {dish.subCategory?.map(cat => cat.subCategoryName).join(', ') || 'None'}
              </Typography>

              <Typography component="dt" variant="body2" fontWeight="bold">
                Short Code:
              </Typography>
              <Typography component="dd" variant="body2">
                {dish.shortCode || '-'}
              </Typography>

              {/* Other dish details */}
            </Box>

            <Divider sx={{ my: 2 }} />
            
            {/* Add the variants component here */}
            <DishVariants dishId={id} />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
// src/components/menu/DishList.js
'use client';
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  TextField,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Fastfood as DishIcon,
  Search as SearchIcon,
  ViewList as ListView,
  ViewModule as GridView,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import Link from 'next/link';

const DishList = () => {
  const router = useRouter();
  
  const [dishes, setDishes] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [dishToDelete, setDishToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  // State for variants expansion
  const [expandedDish, setExpandedDish] = useState(null);
  const [dishVariants, setDishVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    fetchSubCategories();
    fetchDishes();
  }, []);

  useEffect(() => {
    fetchDishes();
  }, [selectedSubCategory]);

  const fetchSubCategories = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/subcategories');
      if (res.data.success) {
        setSubCategories(res.data.data);
      } else {
        toast.error('Failed to load subcategories');
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Error loading subcategories');
    }
  };

  const fetchDishes = async () => {
    setLoading(true);
    try {
      const url = selectedSubCategory
        ? `/api/menu/dishes?subcategory=${selectedSubCategory}`
        : '/api/menu/dishes';
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setDishes(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch dishes');
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Error loading dishes');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToDishForm = (dish = null) => {
    if (dish) {
      router.push(`/dashboard/menu/dishes/edit/${dish._id}`);
    } else {
      router.push('/dashboard/menu/dishes/new');
    }
  };

  const handleDeleteClick = (dish) => {
    setDishToDelete(dish);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDishToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/menu/dishes/${dishToDelete._id}`);
      if (res.data.success) {
        toast.success('Dish deleted successfully');
        fetchDishes();
      } else {
        toast.error(res.data.message || 'Failed to delete dish');
      }
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast.error(error.response?.data?.message || 'Error deleting dish');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleSubCategoryFilterChange = (event) => {
    setSelectedSubCategory(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Function to handle expanding a row to show variants
  const handleExpandDish = async (dishId) => {
    // If already expanded, collapse it
    if (expandedDish === dishId) {
      setExpandedDish(null);
      return;
    }
    
    // Otherwise, expand and fetch variants
    setExpandedDish(dishId);
    setLoadingVariants(true);
    
    try {
      const res = await axiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
      if (res.data.success) {
        setDishVariants(res.data.data);
      } else {
        setDishVariants([]);
        toast.error('Failed to load variants');
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setDishVariants([]);
      toast.error('Error loading variants');
    } finally {
      setLoadingVariants(false);
    }
  };

  const filteredDishes = dishes.filter(dish =>
    dish.dishName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDietaryTagColor = (tag) => {
    switch (tag) {
      case 'veg':
        return 'success';
      case 'non veg':
        return 'error';
      case 'egg':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Dishes</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleNavigateToDishForm()}
        >
          Add Dish
        </Button>
      </Box>
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="subcategory-filter-label">Filter by Subcategory</InputLabel>
              <Select
                labelId="subcategory-filter-label"
                value={selectedSubCategory}
                onChange={handleSubCategoryFilterChange}
                label="Filter by Subcategory"
              >
                <MenuItem value="">
                  <em>All Subcategories</em>
                </MenuItem>
                {subCategories.map((subCategory) => (
                  <MenuItem key={subCategory._id} value={subCategory._id}>
                    {subCategory.subCategoryName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Dishes"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" justifyContent="flex-end">
              <IconButton
                color={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              >
                <ListView />
              </IconButton>
              <IconButton
                color={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              >
                <GridView />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredDishes.length === 0 ? (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography>No dishes found</Typography>
        </Box>
      ) : viewMode === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Dietary</TableCell>
                <TableCell>Image</TableCell>
                <TableCell width="150">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDishes.map((dish) => (
                <React.Fragment key={dish._id}>
                  <TableRow>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <IconButton
                          size="small"
                          onClick={() => handleExpandDish(dish._id)}
                        >
                          {expandedDish === dish._id ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                        <DishIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body1">{dish.dishName}</Typography>
                      </Box>
                      {dish.description && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 250 }}>
                          {dish.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {dish.subCategory && dish.subCategory.map(sc => (
                        <Chip
                          key={sc._id}
                          label={sc.subCategoryName}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={dish.dieteryTag}
                        color={getDietaryTagColor(dish.dieteryTag)}
                        size="small"
                      />
                      {dish.specialTag && (
                        <Chip
                          label={dish.specialTag}
                          color="secondary"
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {dish.image ? (
                        <Box
                          component="img"
                          src={dish.image}
                          alt={dish.dishName}
                          sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/50?text=No+Image';
                          }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleNavigateToDishForm(dish)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(dish)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded row for variants */}
                  {expandedDish === dish._id && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0 }}>
                        <Collapse in={expandedDish === dish._id} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 4 }}>
                            <Typography variant="subtitle2" gutterBottom component="div">
                              Variants
                            </Typography>
                            {loadingVariants ? (
                              <Box display="flex" justifyContent="center" p={2}>
                                <CircularProgress size={24} />
                              </Box>
                            ) : dishVariants.length > 0 ? (
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
                                    {dishVariants.map((variant) => (
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
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No variants available for this dish.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Grid container spacing={3}>
          {filteredDishes.map((dish) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={dish._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={dish.image || 'https://via.placeholder.com/300x140?text=No+Image'}
                  alt={dish.dishName}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x140?text=No+Image';
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography gutterBottom variant="h6" component="div">
                      {dish.dishName}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleExpandDish(dish._id)}
                    >
                      {expandedDish === dish._id ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Box display="flex" mb={1}>
                    <Chip
                      label={dish.dieteryTag}
                      color={getDietaryTagColor(dish.dieteryTag)}
                      size="small"
                      sx={{ mr: 0.5 }}
                    />
                    {dish.specialTag && (
                      <Chip
                        label={dish.specialTag}
                        color="secondary"
                        size="small"
                      />
                    )}
                  </Box>
                  {dish.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {dish.description.length > 100
                        ? `${dish.description.substring(0, 100)}...`
                        : dish.description}
                    </Typography>
                  )}
                  <Box>
                    {dish.subCategory && dish.subCategory.map(sc => (
                      <Chip
                        key={sc._id}
                        label={sc.subCategoryName}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  
                  {/* Variants collapse section in card view */}
                  <Collapse in={expandedDish === dish._id} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Variants
                      </Typography>
                      {loadingVariants ? (
                        <Box display="flex" justifyContent="center" p={1}>
                          <CircularProgress size={20} />
                        </Box>
                      ) : dishVariants.length > 0 ? (
                        dishVariants.map((variant) => (
                          <Box key={variant._id} sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {variant.variantName}
                              <Chip
                                label={variant.isAvailable !== false ? 'Available' : 'Unavailable'}
                                color={variant.isAvailable !== false ? 'success' : 'default'}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Typography>
                            {variant.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {variant.description}
                              </Typography>
                            )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No variants available.
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleNavigateToDishForm(dish)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDeleteClick(dish)}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the dish &quot;{dishToDelete?.dishName}&quot;? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DishList;
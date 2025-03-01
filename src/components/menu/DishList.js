'use client';

import { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  Fastfood as DishIcon,
  Search as SearchIcon,
  ViewList as ListView,
  ViewModule as GridView
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import DishForm from './DishForm';
import Link from 'next/link';

const DishList = () => {
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

  const handleOpenForm = (dish = null) => {
    setSelectedDish(dish);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedDish(null);
  };

  const handleFormSuccess = () => {
    fetchDishes();
    handleCloseForm();
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
          onClick={() => handleOpenForm()}
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
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
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
          <Typography>Loading dishes...</Typography>
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
                <TableRow key={dish._id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
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
                      onClick={() => handleOpenForm(dish)}
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
                  <Typography gutterBottom variant="h6" component="div">
                    {dish.dishName}
                  </Typography>
                  
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
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenForm(dish)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDeleteClick(dish)}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dish Form Dialog */}
      <Dialog 
        open={openForm} 
        onClose={handleCloseForm}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <DishForm
            dish={selectedDish}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the dish &quot;{dishToDelete?.dishName}&quot;? This action cannot be undone.
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
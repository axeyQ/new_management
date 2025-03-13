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
  InputAdornment,
  Collapse,
  CircularProgress,
  Alert,
  Tooltip,
  Badge,
  FormControlLabel,
  Switch,
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
  Visibility as VisibilityIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
// Replace axiosWithAuth with enhancedAxiosWithAuth
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import toast from 'react-hot-toast';
import DishForm from './DishForm';
import InlineStockToggle from './InlineStockToggle';
import { useNetwork } from '@/context/NetworkContext';
import { initializeSync } from '@/lib/syncManager';
import { syncStatus } from '@/lib/syncTracker';
import { showNotification } from '@/lib/notificationService';
import AdvancedConflictModal from '@/components/menu/AdvancedConflictModal';

// ExpandableVariantsRow Component
const ExpandableVariantsRow = ({ dishId, isExpanded, onVariantAction }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editVariantData, setEditVariantData] = useState({
    variantName: '',
    description: '',
    isAvailable: true
  });
  const { isOnline } = useNetwork();
  useEffect(() => {
    const fetchVariants = async () => {
      if (!isExpanded) return; // Only fetch when expanded
      setLoading(true);
      try {
        const response = await enhancedAxiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
        if (response.data.success) {
          setVariants(response.data.data);
          // Check if this is offline data
          if (response.data.isOfflineData) {
            console.log('Displaying cached variant data');
          }
        } else {
          setError(response.data.message || 'Failed to load variants');
        }
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError('Error loading variants');
      } finally {
        setLoading(false);
      }
    };
    fetchVariants();
  }, [dishId, isExpanded]);

  // Handler to refetch variants after an action
  const refetchVariants = async () => {
    try {
      const response = await enhancedAxiosWithAuth.get(`/api/menu/dishes/${dishId}/variants`);
      if (response.data.success) {
        setVariants(response.data.data);
      }
    } catch (err) {
      console.error('Error refetching variants:', err);
    }
  };

  // Handlers for variant actions
  const handleViewVariant = (variant) => {
    if (onVariantAction) {
      onVariantAction('view', variant);
    }
  };

  const handleEditVariant = (variant) => {
    setSelectedVariant(variant);
    setEditVariantData({
      variantName: variant.variantName,
      description: variant.description || '',
      isAvailable: variant.isAvailable !== false
    });
    setOpenEditDialog(true);
  };

  const handleDeleteVariant = (variant) => {
    setSelectedVariant(variant);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await enhancedAxiosWithAuth.delete(`/api/menu/variants/${selectedVariant._id}`);
      if (response.data.success) {
        if (response.data.isOfflineOperation) {
          toast.success('Variant will be deleted when you are back online');
        } else {
          toast.success('Variant deleted successfully');
        }
        if (onVariantAction) {
          onVariantAction('delete', selectedVariant);
        }
        await refetchVariants();
        setOpenDeleteDialog(false);
      } else {
        toast.error(response.data.message || 'Failed to delete variant');
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Error deleting variant');
    }
  };

  const handleSaveVariant = async () => {
    if (!editVariantData.variantName) {
      toast.error('Variant name is required');
      return;
    }
    try {
      const response = await enhancedAxiosWithAuth.put(`/api/menu/variants/${selectedVariant._id}`, {
        ...editVariantData,
        dishReference: dishId
      });
      if (response.data.success) {
        if (response.data.isOfflineOperation) {
          toast.success('Variant will be updated when you are back online');
        } else {
          toast.success('Variant updated successfully');
        }
        if (onVariantAction) {
          onVariantAction('edit', response.data.data);
        }
        await refetchVariants();
        setOpenEditDialog(false);
      } else {
        toast.error(response.data.message || 'Failed to update variant');
      }
    } catch (error) {
      console.error('Error updating variant:', error);
      toast.error('Error updating variant');
    }
  };

  const handleStockSuccess = (updatedVariant) => {
    // Update variant in state
    setVariants(variants.map(variant =>
      variant._id === updatedVariant._id ? updatedVariant : variant
    ));
    if (onVariantAction) {
      onVariantAction('stock', updatedVariant);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditVariantData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setEditVariantData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  if (!isExpanded) return null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (variants.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No variants available for this dish.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2, px: 4 }}>
      <Typography variant="subtitle2" gutterBottom component="div">
        Variants
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variant Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variants.map((variant) => (
              <TableRow
                key={variant._id}
                sx={{
                  opacity: variant.stockStatus?.isOutOfStock ? 0.7 : 1
                }}
              >
                <TableCell>
                  {variant.variantName}
                  {variant.stockStatus && variant.stockStatus.isOutOfStock && (
                    <Chip
                      label="Out of Stock"
                      color="error"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell>{variant.description || '-'}</TableCell>
                <TableCell>
                  <InlineStockToggle
                    item={variant}
                    itemType="variant"
                    onSuccess={handleStockSuccess}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleViewVariant(variant)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditVariant(variant)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteVariant(variant)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the variant
            &quot;{selectedVariant?.variantName}&quot;?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Variant Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Variant</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Variant Name"
            name="variantName"
            value={editVariantData.variantName}
            onChange={handleInputChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            name="description"
            value={editVariantData.description}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editVariantData.isAvailable}
                onChange={handleSwitchChange}
                name="isAvailable"
                color="primary"
              />
            }
            label="Available"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveVariant} color="primary" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

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
  const [viewMode, setViewMode] = useState('list');
  const [expandedDish, setExpandedDish] = useState(null);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);
  const [detectedConflicts, setDetectedConflicts] = useState([]);
  const [openAdvancedConflictModal, setOpenAdvancedConflictModal] = useState(false);

  const { isOnline } = useNetwork();
  useEffect(() => {
    const subscription = syncStatus.subscribe(status => {
      setSyncProgress(status);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchSubCategories();
    fetchDishes();
    fetchPendingOperationsCount();
    
    // Set up an interval to refresh data
    const intervalId = setInterval(() => {
      if (isOnline) { // Only auto-refresh if online
        fetchDishes(false); // silent refresh (no loading indicator)
      }
      // Always refresh pending operations count
      fetchPendingOperationsCount();
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && isOfflineData) {
      fetchDishes();
    }
  }, [isOnline]);

  useEffect(() => {
    fetchDishes();
  }, [selectedSubCategory]);

  const fetchPendingOperationsCount = async () => {
    try {
      const operations = await idb.getPendingOperations();
      const dishOps = operations.filter(op =>
        op.type?.includes('DISH') || 
        op.type?.includes('VARIANT') ||
        op.url?.includes('/dishes') ||
        op.url?.includes('/variants')
      );
      setPendingOperations(dishOps.length);
    } catch (error) {
      console.error('Error fetching pending operations:', error);
    }
  };

  // Format date for display
  const formatLastSync = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleExpandDish = (dishId) => {
    setExpandedDish(expandedDish === dishId ? null : dishId);
  };

  // Handler for viewing dish details
  const handleViewDish = (dishId) => {
    router.push(`/dashboard/menu/dishes/${dishId}`);
  };

  // Handler for stock status changes
  const handleStockSuccess = (updatedDish) => {
    // Update the dish in the list
    const updatedDishes = dishes.map(dish =>
      dish._id === updatedDish._id ? updatedDish : dish
    );
    setDishes(updatedDishes);
    // Also update filtered dishes
    setFilteredDishes(
      filteredDishes.map(dish =>
        dish._id === updatedDish._id ? updatedDish : dish
      )
    );
  };

  // Handler for variant actions
  const handleVariantAction = async (action, variant) => {
    if (action === 'view') {
      toast.info(`Viewing variant: ${variant.variantName}`);
    } else if (action === 'edit' || action === 'delete' || action === 'stock') {
      // After variant is modified, we may need to refresh the dish data
      await fetchDishes();
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await enhancedAxiosWithAuth.get('/api/menu/subcategories');
      if (res.data.success) {
        setSubCategories(res.data.data);
        // Check if this is offline data
        if (res.data.isOfflineData) {
          console.log('Displaying cached subcategory data');
        }
      } else {
        toast.error('Failed to load subcategories');
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Error loading subcategories');
    }
  };

  const fetchDishes = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const url = selectedSubCategory
        ? `/api/menu/dishes?subcategory=${selectedSubCategory}`
        : '/api/menu/dishes';
      const res = await enhancedAxiosWithAuth.get(url);
      if (res.data.success) {
        setDishes(res.data.data);
        setFilteredDishes(res.data.data);
        
        // Set offline data flag and last sync time if this is cached data
        if (res.data.isOfflineData) {
          setIsOfflineData(true);
          setLastSyncTime(res.data.lastSyncTime);
        } else {
          setIsOfflineData(false);
        }
      } else {
        toast.error(res.data.message || 'Failed to fetch dishes');
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Error loading dishes');
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    
    toast.loading('Syncing data with server...');
    setLoading(true);
    
    try {
      // First check for potential conflicts
      const serverDishesRes = await enhancedAxiosWithAuth.get('/api/menu/dishes');
      
      if (serverDishesRes.data.success) {
        // Use the conflict detection from indexedDBService
        const conflicts = await idb.detectDishConflicts(serverDishesRes.data.data);
        
        // Also check for variant conflicts
        const serverVariantsRes = await enhancedAxiosWithAuth.get('/api/menu/variants');
        let variantConflicts = [];
        
        if (serverVariantsRes.data.success) {
          variantConflicts = await idb.detectVariantConflicts(serverVariantsRes.data.data);
        }
        
        // Combine dish and variant conflicts
        const allConflicts = [
          ...conflicts.map(c => ({...c, itemName: c.localData.dishName || 'Unknown Dish'})),
          ...variantConflicts.map(c => ({...c, itemName: c.localData.variantName || 'Unknown Variant'}))
        ];
        
        if (allConflicts.length > 0) {
          setDetectedConflicts(allConflicts);
          setOpenAdvancedConflictModal(true);
          toast.dismiss();
          setLoading(false);
          return;
        }
      }
      
      // Continue with regular sync if no conflicts
      const result = await initializeSync();
      
      // Refresh data
      await fetchSubCategories();
      await fetchDishes(false);
      await fetchPendingOperationsCount();
      
      toast.dismiss();
      
      // Show notification for sync result
      if (result.success) {
        toast.success('Sync completed successfully');
        showNotification('Sync Complete', {
          body: 'Dishes and variants synchronized successfully'
        });
      } else if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} operations`);
        showNotification('Sync Issues', {
          body: `${result.failed} operations failed to sync`,
          requireInteraction: true
        });
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.dismiss();
      toast.error('Sync failed. Please try again.');
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
      const res = await enhancedAxiosWithAuth.delete(`/api/menu/dishes/${dishToDelete._id}`);
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

  // Filter dishes based on search and category
  useEffect(() => {
    if (!dishes || dishes.length === 0) return;
    let filtered = [...dishes];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(dish =>
        dish.dishName.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredDishes(filtered);
  }, [searchTerm, dishes]);

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
        <Box display="flex" alignItems="center" gap={2}>
          {syncProgress?.inProgress && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body2">
                {Math.round(syncProgress.progress)}%
              </Typography>
            </Box>
          )}
          
          {pendingOperations > 0 && (
            <Tooltip title={`${pendingOperations} operation(s) pending sync`}>
              <Badge badgeContent={pendingOperations} color="warning">
                <Button
                  startIcon={<SyncIcon />}
                  variant="outlined"
                  color="warning"
                  onClick={handleForceSync}
                  disabled={!isOnline || loading}
                  size="small"
                >
                  Sync Now
                </Button>
              </Badge>
            </Tooltip>
          )}
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            Add Dish
          </Button>
        </Box>
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
      {isOfflineData && (
        <Alert
          severity="info"
          icon={<OfflineIcon />}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<SyncIcon />}
              onClick={handleForceSync}
              disabled={!isOnline || loading}
            >
              Sync
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {isOnline
            ? `You're viewing cached data from ${formatLastSync(lastSyncTime)}`
            : "You're offline. Changes will be saved locally and synced when you're back online."
          }
        </Alert>
      )}
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
                <TableCell>Status</TableCell>
                <TableCell>Image</TableCell>
                <TableCell width="170">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDishes.map((dish) => (
                <React.Fragment key={dish._id}>
                  <TableRow
                    sx={{
                      opacity: dish.stockStatus?.isOutOfStock ? 0.7 : 1
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <IconButton
                          size="small"
                          onClick={() => handleExpandDish(dish._id)}
                        >
                          {expandedDish === dish._id ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                        <DishIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body1">
                          {dish.dishName}
                        </Typography>
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
                      {dish.dieteryTag === 'non veg' && dish.meatTypes && dish.meatTypes.length > 0 && (
                        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                          {dish.meatTypes.slice(0, 3).map(type => (
                            <Chip
                              key={type}
                              label={type}
                              color="default"
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {dish.meatTypes.length > 3 && (
                            <Tooltip title={dish.meatTypes.slice(3).join(', ')}>
                              <Chip
                                label={`+${dish.meatTypes.length - 3} more`}
                                color="default"
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      )}
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
                      <InlineStockToggle
                        item={dish}
                        itemType="dish"
                        onSuccess={handleStockSuccess}
                      />
                    </TableCell>
                    <TableCell>
                      {dish.image ? (
                        <Box
                          component="img"
                          src={dish.image}
                          alt={dish.dishName}
                          sx={{
                            width: 50,
                            height: 50,
                            objectFit: 'cover',
                            borderRadius: 1,
                            opacity: dish.stockStatus?.isOutOfStock ? 0.5 : 1
                          }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/50?text=No+Image';
                          }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="nowrap">
                        <Tooltip title="View Details">
                          <IconButton
                            color="info"
                            onClick={() => handleViewDish(dish._id)}
                            size="small"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenForm(dish)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(dish)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {/* Expandable Variants Row */}
                  {expandedDish === dish._id && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={expandedDish === dish._id} timeout="auto" unmountOnExit>
                          <ExpandableVariantsRow
                            dishId={dish._id}
                            isExpanded={expandedDish === dish._id}
                            onVariantAction={handleVariantAction}
                          />
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
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: dish.stockStatus?.isOutOfStock ? 0.7 : 1
              }}>
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
                  <Box display="flex" flexWrap="wrap" mb={1}>
                    <Chip
                      label={dish.dieteryTag}
                      color={getDietaryTagColor(dish.dieteryTag)}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                    {dish.dieteryTag === 'non veg' && dish.meatTypes && dish.meatTypes.length > 0 && (
                      dish.meatTypes.slice(0, 2).map(type => (
                        <Chip
                          key={type}
                          label={type}
                          color="default"
                          variant="outlined"
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))
                    )}
                    {dish.dieteryTag === 'non veg' && dish.meatTypes && dish.meatTypes.length > 2 && (
                      <Tooltip title={dish.meatTypes.slice(2).join(', ')}>
                        <Chip
                          label={`+${dish.meatTypes.length - 2} more`}
                          color="default"
                          size="small"
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                      </Tooltip>
                    )}
                    {dish.specialTag && (
                      <Chip
                        label={dish.specialTag}
                        color="secondary"
                        size="small"
                        sx={{ mb: 0.5 }}
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
                <Box display="flex" justifyContent="space-between" alignItems="center" p={2}
                  pt={0}>
                  <Typography variant="body2">Status:</Typography>
                  <InlineStockToggle
                    item={dish}
                    itemType="dish"
                    onSuccess={handleStockSuccess}
                  />
                </Box>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewDish(dish._id)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenForm(dish)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(dish)}
                  >
                    Delete
                  </Button>
                </CardActions>
                <Box px={2} pb={2}>
                  <Button
                    size="small"
                    onClick={() => handleExpandDish(dish._id)}
                    fullWidth
                    variant="outlined"
                  >
                    {expandedDish === dish._id ? 'Hide Variants' : 'Show Variants'}
                  </Button>
                </Box>
                {expandedDish === dish._id && (
                  <Box p={2}>
                    <ExpandableVariantsRow
                      dishId={dish._id}
                      isExpanded={true}
                      onVariantAction={handleVariantAction}
                    />
                  </Box>
                )}
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
            Are you sure you want to delete the dish &quot;{dishToDelete?.dishName}&quot;?
            This action cannot be undone.
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
      <AdvancedConflictModal
        open={openAdvancedConflictModal}
        onClose={() => setOpenAdvancedConflictModal(false)}
        conflicts={detectedConflicts}
        onResolved={(resolvedItems) => {
          setOpenAdvancedConflictModal(false);
          fetchDishes();
          // Show notification
          showNotification('Conflicts Resolved', {
            body: `Successfully resolved ${resolvedItems.length} conflicts`
          });
        }}
      />
    </Box>
  );
};

export default DishList;
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
  Chip,
  Stack,
  Tooltip,
  Divider,
  Alert,
  Badge,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Restaurant as FoodIcon,
  LocalBar as BeverageIcon,
  RemoveShoppingCart as OutOfStockIcon,
  Autorenew as AutoRenewIcon,
  AccessTime as TimeIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import CategoryForm from './CategoryForm';
import OutOfStockDialog from './OutOfStockDialog';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { format, isPast } from 'date-fns';
import { useNetwork } from '@/context/NetworkContext';
import { initializeSync } from '@/lib/syncManager';
import { syncStatus } from '@/lib/syncTracker';
import { showNotification } from '@/lib/notificationService';
import OfflineSearch from '@/components/common/OfflineSearch';
import AdvancedConflictModal from '@/components/menu/AdvancedConflictModal';
import { ErrorRecoveryUI } from '@/lib/errorRecoverySystem';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [openOutOfStockDialog, setOpenOutOfStockDialog] = useState(false);
  const [selectedOutOfStockCategory, setSelectedOutOfStockCategory] = useState(null);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(0);
const [syncProgress, setSyncProgress] = useState(null);
const [detectedConflicts, setDetectedConflicts] = useState([]);
const [recoveryPlans, setRecoveryPlans] = useState({});
const [openAdvancedConflictModal, setOpenAdvancedConflictModal] = useState(false);
  
  // Get network status from context
  const { isOnline } = useNetwork();

  // Subscribe to sync status updates
useEffect(() => {
  const subscription = syncStatus.subscribe(status => {
    setSyncProgress(status);
  });
  
  return () => subscription.unsubscribe();
}, []);

// Load recovery plans if any
useEffect(() => {
  const loadRecoveryPlans = async () => {
    const plans = await ErrorRecoveryUI.getRecoveryPlans();
    const categoryPlans = Object.values(plans).filter(
      plan => plan.originalOperation.type.includes('CATEGORY')
    );
    
    if (categoryPlans.length > 0) {
      setRecoveryPlans(plans);
    }
  };
  
  loadRecoveryPlans();
}, []);

  // Fetch pending operations count
  const fetchPendingOperationsCount = async () => {
    try {
      const operations = await idb.getPendingOperations();
      setPendingOperations(operations.length);
    } catch (error) {
      console.error('Error fetching pending operations:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchPendingOperationsCount();
    
    // Set up an interval to refresh categories to update out of stock status
    const intervalId = setInterval(() => {
      if (isOnline) { // Only auto-refresh if online
        fetchCategories(false); // silent refresh (no loading indicator)
      }
      
      // Always refresh pending operations count
      fetchPendingOperationsCount();
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline]); // Re-run when online status changes

  // Force sync when coming back online
  useEffect(() => {
    if (isOnline && isOfflineData) {
      fetchCategories();
    }
  }, [isOnline]);

  const fetchCategories = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get('/api/menu/categories');
          
          if (res.data.success) {
            processCategoriesData(res.data.data, false);
            return;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
          // Fall back to local data
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedCategories = await idb.getCategories();
      const lastSyncTime = await idb.getLastSyncTime('category');
      
      if (cachedCategories.length > 0) {
        processCategoriesData(cachedCategories, true);
        setLastSyncTime(lastSyncTime);
      } else {
        setCategories([]);
        setIsOfflineData(true);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      if (showLoading) {
        toast.error('Error loading categories');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Process categories data with appropriate transformations
  const processCategoriesData = (data, isOffline) => {
    setIsOfflineData(isOffline);
    
    const updatedCategories = data.map(category => {
      // Check if auto out-of-stock items should be back in stock
      if (
        category.stockStatus?.isOutOfStock &&
        category.stockStatus?.autoRestock &&
        category.stockStatus?.restockTime &&
        isPast(new Date(category.stockStatus.restockTime))
      ) {
        return {
          ...category,
          stockStatus: {
            ...category.stockStatus,
            isOutOfStock: false,
            restockTime: null,
            outOfStockReason: ''
          }
        };
      }
      return category;
    });
    
    setCategories(updatedCategories);

    // If any categories were auto-updated, save them back to storage
    const categoriesToUpdate = updatedCategories.filter((category, index) => {
      const originalCategory = data[index];
      return (
        category._id === originalCategory._id &&
        category.stockStatus?.isOutOfStock !== originalCategory.stockStatus?.isOutOfStock
      );
    });
    
    if (categoriesToUpdate.length > 0) {
      // Update in IndexedDB
      Promise.all(categoriesToUpdate.map(category => idb.updateCategory(category)))
        .then(() => {
          console.log('Updated auto-restocked categories in IndexedDB');
        });
      
      // Update on server if online
      if (isOnline) {
        Promise.all(
          categoriesToUpdate.map(category =>
            enhancedAxiosWithAuth.put(`/api/menu/categories/${category._id}/stock`, {
              isOutOfStock: false,
              restockTime: null,
              outOfStockReason: '',
              autoRestock: true
            })
          )
        ).then(() => {
          console.log('Updated auto-restocked categories on server');
        });
      }
    }
  };

  const handleOpenForm = (category = null) => {
    setSelectedCategory(category);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedCategory(null);
  };

  const handleFormSuccess = (updatedCategory) => {
    if (updatedCategory) {
      // Optimistic UI update for the local categories list
      setCategories(prevCategories => {
        // For update operations
        if (selectedCategory) {
          return prevCategories.map(cat => 
            cat._id === updatedCategory._id ? updatedCategory : cat
          );
        } 
        // For create operations
        else {
          return [...prevCategories, updatedCategory];
        }
      });
    }
    
    // Also refresh from storage to ensure we have the latest data
    fetchCategories(false);
    fetchPendingOperationsCount();
    handleCloseForm();
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setCategoryToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Optimistic UI update - remove immediately from UI
      setCategories(prevCategories => 
        prevCategories.filter(cat => cat._id !== categoryToDelete._id)
      );
      
      const res = await enhancedAxiosWithAuth.delete(`/api/menu/categories/${categoryToDelete._id}`);
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        toast.success('Category will be deleted when you are back online');
      } else if (res.data.success) {
        toast.success('Category deleted successfully');
      } else {
        toast.error(res.data.message || 'Failed to delete category');
        // Revert optimistic update if needed
        fetchCategories();
      }
      
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Error deleting category');
      // Revert optimistic update on error
      fetchCategories();
    } finally {
      handleCloseDeleteDialog();
    }
  };

  // Out of Stock Dialog Handlers
  const handleOpenOutOfStockDialog = (category) => {
    setSelectedOutOfStockCategory(category);
    setOpenOutOfStockDialog(true);
  };

  const handleCloseOutOfStockDialog = () => {
    setOpenOutOfStockDialog(false);
    setSelectedOutOfStockCategory(null);
  };

  const handleOutOfStockSave = async (outOfStockData) => {
    try {
      // Optimistic UI update for stock status
      const updatedCategory = {
        ...selectedOutOfStockCategory,
        stockStatus: {
          ...selectedOutOfStockCategory.stockStatus,
          isOutOfStock: outOfStockData.outOfStock,
          outOfStockReason: outOfStockData.outOfStockReason,
          restockTime: outOfStockData.outOfStockUntil,
          autoRestock: outOfStockData.outOfStockType !== 'manual'
        }
      };
      
      // Update UI immediately
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat._id === updatedCategory._id ? updatedCategory : cat
        )
      );
      
      // Use the specialized stock endpoint instead of the general update endpoint
      const res = await enhancedAxiosWithAuth.put(
        `/api/menu/categories/${selectedOutOfStockCategory._id}/stock`,
        {
          isOutOfStock: outOfStockData.outOfStock,
          outOfStockReason: outOfStockData.outOfStockReason,
          restockTime: outOfStockData.outOfStockUntil,
          // If using manual restocking
          autoRestock: outOfStockData.outOfStockType !== 'manual'
        }
      );
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        const statusMessage = outOfStockData.outOfStock
          ? 'Category will be marked as out of stock when you are back online'
          : 'Category will be marked as in stock when you are back online';
        toast.success(statusMessage);
      } else if (res.data.success) {
        const statusMessage = outOfStockData.outOfStock
          ? 'Category marked as out of stock'
          : 'Category marked as in stock';
        toast.success(statusMessage);
      } else {
        toast.error(res.data.message || 'Failed to update out of stock status');
        // Revert optimistic update
        fetchCategories();
      }
      
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error updating out of stock status:', error);
      toast.error(error.response?.data?.message || 'Error updating out of stock status');
      // Revert optimistic update on error
      fetchCategories();
    } finally {
      handleCloseOutOfStockDialog();
    }
  };

  // Helper function to format OutOfStock display
  const getOutOfStockInfo = (category) => {
    if (!category.stockStatus?.isOutOfStock) return null;
    
    if (category.stockStatus.restockTime) {
      const date = new Date(category.stockStatus.restockTime);
      const dateString = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      return {
        label: `Back in stock ${dateString}`,
        icon: <AutoRenewIcon fontSize="small" />,
        color: 'warning'
      };
    } else if (!category.stockStatus.autoRestock) {
      return {
        label: 'Manual restock required',
        icon: <TimeIcon fontSize="small" />,
        color: 'error'
      };
    } else {
      return {
        label: 'Out of Stock',
        icon: <OutOfStockIcon fontSize="small" />,
        color: 'error'
      };
    }
  };

  // Format date for display
  const formatLastSync = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleForceSync = async () => {
    if (isOnline) {
      toast.success('Syncing data with server...');
      setLoading(true);
      
      try {
        // First check for potential conflicts
        const serverCategories = await enhancedAxiosWithAuth.get('/api/menu/categories');
        if (serverCategories.data.success) {
          // Use the new conflict detection from indexedDBService
          const conflicts = await idb.detectCategoryConflicts(serverCategories.data.data);
          
          if (conflicts.length > 0) {
            // Prepare conflicts for the modal with item names
            const namedConflicts = conflicts.map(conflict => ({
              ...conflict,
              itemName: conflict.localData.categoryName || 'Unknown Category'
            }));
            
            setDetectedConflicts(namedConflicts);
            setOpenAdvancedConflictModal(true);
            setLoading(false);
            return;
          }
        }
        
        // Continue with regular sync if no conflicts
        const result = await initializeSync();
        await fetchCategories(false);
        await fetchPendingOperationsCount();
        
        // Show notification for sync result
        if (result.success) {
          showNotification('Sync Complete', {
            body: 'Categories synchronized successfully'
          });
        } else if (result.failed > 0) {
          showNotification('Sync Issues', {
            body: `${result.failed} operations failed to sync`,
            requireInteraction: true
          });
        }
        
      } catch (error) {
        console.error('Error during sync:', error);
        toast.error('Sync failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      toast.error('Cannot sync while offline');
    }
  };
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Categories</Typography>
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

          <AdvancedConflictModal
  open={openAdvancedConflictModal}
  onClose={() => setOpenAdvancedConflictModal(false)}
  conflicts={detectedConflicts}
  onResolved={(resolvedItems) => {
    setOpenAdvancedConflictModal(false);
    fetchCategories();
    // Show notification
    showNotification('Conflicts Resolved', {
      body: `Successfully resolved ${resolvedItems.length} conflicts`
    });
  }}
/>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            Add Category
          </Button>
        </Box>
      </Box>
      
      {/* Offline data indicators */}
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
            : "You're offline. Changes will be saved locally and synced when you're back online."}
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Parent Category</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Loading...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {isOnline ? 'No categories found' : 'No offline data available'}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => {
                const outOfStockInfo = getOutOfStockInfo(category);
                const isTemp = category.isTemp === true;
                
                return (
                  <TableRow
                    key={category._id}
                    sx={{
                      ...(category.stockStatus?.isOutOfStock ? { backgroundColor: 'rgba(244, 67, 54, 0.08)' } : {}),
                      ...(isTemp ? { backgroundColor: 'rgba(255, 193, 7, 0.12)' } : {})
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {category.categoryName}
                        
                        {isTemp && (
                          <Tooltip title="Pending synchronization">
                            <Chip
                              size="small"
                              label="Pending"
                              color="warning"
                              icon={<HistoryIcon fontSize="small" />}
                              sx={{ ml: 1 }}
                            />
                          </Tooltip>
                        )}
                        
                        {category.stockStatus?.isOutOfStock && (
                          <Chip
                            size="small"
                            label="Out of Stock"
                            color="error"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={category.parentCategory === 'food' ? <FoodIcon /> : <BeverageIcon />}
                        label={category.parentCategory === 'food' ? 'Food' : 'Beverage'}
                        color={category.parentCategory === 'food' ? 'success' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {category.image ? (
                        <Box
                          component="img"
                          src={category.image}
                          alt={category.categoryName}
                          sx={{
                            width: 50,
                            height: 50,
                            objectFit: 'cover',
                            borderRadius: 1,
                            opacity: category.stockStatus?.isOutOfStock ? 0.5 : 1
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
                      {category.stockStatus?.isOutOfStock ? (
                        <Tooltip title={category.stockStatus.outOfStockReason || ''}>
                          <Chip
                            icon={outOfStockInfo?.icon || <OutOfStockIcon fontSize="small" />}
                            label={outOfStockInfo?.label || "Out of Stock"}
                            color={outOfStockInfo?.color || "error"}
                            size="small"
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="In Stock"
                          color="success"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          color={category.stockStatus?.isOutOfStock ? "warning" : "default"}
                          onClick={() => handleOpenOutOfStockDialog(category)}
                          size="small"
                          title={category.stockStatus?.isOutOfStock ? "Update out of stock status" : "Mark as out of stock"}
                        >
                          <OutOfStockIcon />
                        </IconButton>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenForm(category)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(category)}
                          size="small"
                          disabled={isTemp} // Disable deleting items that are pending sync
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Category Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <CategoryForm
            category={selectedCategory}
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
            Are you sure you want to delete the category
            &quot;{categoryToDelete?.categoryName}&quot;? This action
            cannot be undone.
            {!isOnline && (
              <Box mt={2}>
                <Alert severity="info" icon={<OfflineIcon />}>
                  You are offline. This action will be queued and completed when you&apos;re back online.
                </Alert>
              </Box>
            )}
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
      
      {/* Out of Stock Dialog */}
      {selectedOutOfStockCategory && (
        <OutOfStockDialog
          open={openOutOfStockDialog}
          onClose={handleCloseOutOfStockDialog}
          onSave={handleOutOfStockSave}
          currentSettings={{
            outOfStock: selectedOutOfStockCategory.stockStatus?.isOutOfStock || false,
            outOfStockType: selectedOutOfStockCategory.stockStatus?.autoRestock === false ? 'manual' : 'auto',
            outOfStockUntil: selectedOutOfStockCategory.stockStatus?.restockTime || null,
            outOfStockReason: selectedOutOfStockCategory.stockStatus?.outOfStockReason || ''
          }}
          itemType="Category"
          isOffline={!isOnline}
        />
      )}
    </Box>
  );
};

export default CategoryList;
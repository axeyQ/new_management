// src/components/menu/SubCategoryList.js - Updated with offline support
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
  Stack,
  Tooltip,
  CircularProgress,
  Alert,
  Badge
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  RemoveShoppingCart as OutOfStockIcon,
  Autorenew as AutoRenewIcon,
  AccessTime as TimeIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import SubCategoryForm from './SubCategoryForm';
import OutOfStockDialog from './OutOfStockDialog';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';
import { initializeSync } from '@/lib/syncManager';
import { syncStatus } from '@/lib/syncTracker';
import { showNotification } from '@/lib/notificationService';
import OfflineSearch from '@/components/common/OfflineSearch';
import AdvancedConflictModal from '@/components/menu/AdvancedConflictModal';
import { ErrorRecoveryUI } from '@/lib/errorRecoverySystem';


const SubCategoryList = () => {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState(null);
  const [openOutOfStockDialog, setOpenOutOfStockDialog] = useState(false);
  const [selectedOutOfStockSubCategory, setSelectedOutOfStockSubCategory] = useState(null);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [conflictData, setConflictData] = useState(null);
  const [openConflictModal, setOpenConflictModal] = useState(false);
  // Add to your existing state variables
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
      const subcategoryOps = operations.filter(op => 
        op.type.includes('SUBCATEGORY') || 
        op.url.includes('/subcategories')
      );
      setPendingOperations(subcategoryOps.length);
    } catch (error) {
      console.error('Error fetching pending operations:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
    fetchPendingOperationsCount();
    
    // Set up an interval to refresh subcategories to update out of stock status
    const intervalId = setInterval(() => {
      if (isOnline) { // Only auto-refresh if online
        fetchSubCategories(false); // silent refresh (no loading indicator)
      }
      
      // Always refresh pending operations count
      fetchPendingOperationsCount();
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline]); // Re-run when online status changes

  // Force sync when coming back online
  useEffect(() => {
    if (isOnline && isOfflineData) {
      fetchSubCategories();
    }
  }, [isOnline]);

  // Refresh subcategories when selected category changes
  useEffect(() => {
    fetchSubCategories();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get('/api/menu/categories');
          
          if (res.data.success) {
            setCategories(res.data.data);
            return;
          }
        } catch (error) {
          console.error('Error fetching categories from server, falling back to IndexedDB:', error);
          // Fall back to local data
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedCategories = await idb.getCategories();
      
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error loading categories');
    }
  };

  const fetchSubCategories = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Build the URL based on whether a category is selected
      const url = selectedCategory
        ? `/api/menu/subcategories?category=${selectedCategory}`
        : '/api/menu/subcategories';
      
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get(url);
          
          if (res.data.success) {
            processSubCategoriesData(res.data.data, false);
            return;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
          // Fall back to local data
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      let cachedSubCategories = selectedCategory
        ? await idb.getSubcategoriesByCategory(selectedCategory)
        : await idb.getSubcategories();
      
      const lastSyncTime = await idb.getLastSyncTime('subcategory');
      
      if (cachedSubCategories.length > 0) {
        processSubCategoriesData(cachedSubCategories, true);
        setLastSyncTime(lastSyncTime);
      } else {
        setSubCategories([]);
        setIsOfflineData(true);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      if (showLoading) {
        toast.error('Error loading subcategories');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Process subcategories data with appropriate transformations
  const processSubCategoriesData = (data, isOffline) => {
    setIsOfflineData(isOffline);
    
    const updatedSubCategories = data.map(subCategory => {
      // Check if auto out-of-stock items should be back in stock
      if (
        subCategory.stockStatus?.isOutOfStock &&
        subCategory.stockStatus?.autoRestock &&
        subCategory.stockStatus?.restockTime &&
        new Date(subCategory.stockStatus.restockTime) <= new Date()
      ) {
        return {
          ...subCategory,
          stockStatus: {
            ...subCategory.stockStatus,
            isOutOfStock: false,
            restockTime: null,
            outOfStockReason: ''
          }
        };
      }
      return subCategory;
    });
    
    setSubCategories(updatedSubCategories);

    // If any subcategories were auto-updated, save them back to storage
    const subCategoriesToUpdate = updatedSubCategories.filter((subCategory, index) => {
      const originalSubCategory = data[index];
      return (
        subCategory._id === originalSubCategory._id &&
        subCategory.stockStatus?.isOutOfStock !== originalSubCategory.stockStatus?.isOutOfStock
      );
    });
    
    if (subCategoriesToUpdate.length > 0) {
      // Update in IndexedDB
      Promise.all(subCategoriesToUpdate.map(subCategory => idb.updateSubcategory(subCategory)))
        .then(() => {
          console.log('Updated auto-restocked subcategories in IndexedDB');
        });
      
      // Update on server if online
      if (isOnline) {
        Promise.all(
          subCategoriesToUpdate.map(subCategory =>
            enhancedAxiosWithAuth.put(`/api/menu/subcategories/${subCategory._id}/stock`, {
              isOutOfStock: false,
              restockTime: null,
              outOfStockReason: '',
              autoRestock: true
            })
          )
        ).then(() => {
          console.log('Updated auto-restocked subcategories on server');
        });
      }
    }
  };

  const handleOpenForm = (subCategory = null) => {
    setSelectedSubCategory(subCategory);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedSubCategory(null);
  };

  const handleFormSuccess = (updatedSubCategory) => {
    if (updatedSubCategory) {
      // Optimistic UI update for the local subcategories list
      setSubCategories(prevSubCategories => {
        // For update operations
        if (selectedSubCategory) {
          return prevSubCategories.map(sc => 
            sc._id === updatedSubCategory._id ? updatedSubCategory : sc
          );
        } 
        // For create operations
        else {
          return [...prevSubCategories, updatedSubCategory];
        }
      });
    }
    
    // Also refresh from storage to ensure we have the latest data
    fetchSubCategories(false);
    fetchPendingOperationsCount();
    handleCloseForm();
  };

  const handleDeleteClick = (subCategory) => {
    setSubCategoryToDelete(subCategory);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSubCategoryToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Optimistic UI update - remove immediately from UI
      setSubCategories(prevSubCategories => 
        prevSubCategories.filter(sc => sc._id !== subCategoryToDelete._id)
      );
      
      const res = await enhancedAxiosWithAuth.delete(`/api/menu/subcategories/${subCategoryToDelete._id}`);
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        toast.success('Subcategory will be deleted when you are back online');
      } else if (res.data.success) {
        toast.success('Subcategory deleted successfully');
      } else {
        toast.error(res.data.message || 'Failed to delete subcategory');
        // Revert optimistic update if needed
        fetchSubCategories();
      }
      
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error(error.response?.data?.message || 'Error deleting subcategory');
      // Revert optimistic update on error
      fetchSubCategories();
    } finally {
      handleCloseDeleteDialog();
    }
  };

  // Out of Stock Dialog Handlers
  const handleOpenOutOfStockDialog = (subCategory) => {
    setSelectedOutOfStockSubCategory(subCategory);
    setOpenOutOfStockDialog(true);
  };

  const handleCloseOutOfStockDialog = () => {
    setOpenOutOfStockDialog(false);
    setSelectedOutOfStockSubCategory(null);
  };

  const handleOutOfStockSave = async (outOfStockData) => {
    try {
      // Optimistic UI update for stock status
      const updatedSubCategory = {
        ...selectedOutOfStockSubCategory,
        stockStatus: {
          ...selectedOutOfStockSubCategory.stockStatus,
          isOutOfStock: outOfStockData.outOfStock,
          outOfStockReason: outOfStockData.outOfStockReason,
          restockTime: outOfStockData.outOfStockUntil,
          autoRestock: outOfStockData.outOfStockType !== 'manual'
        }
      };
      
      // Update UI immediately
      setSubCategories(prevSubCategories => 
        prevSubCategories.map(sc => 
          sc._id === updatedSubCategory._id ? updatedSubCategory : sc
        )
      );
      
      // Use the specialized stock endpoint
      const res = await enhancedAxiosWithAuth.put(
        `/api/menu/subcategories/${selectedOutOfStockSubCategory._id}/stock`,
        {
          isOutOfStock: outOfStockData.outOfStock,
          outOfStockReason: outOfStockData.outOfStockReason,
          restockTime: outOfStockData.outOfStockUntil,
          autoRestock: outOfStockData.outOfStockType !== 'manual'
        }
      );
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        const statusMessage = outOfStockData.outOfStock
          ? 'Subcategory will be marked as out of stock when you are back online'
          : 'Subcategory will be marked as in stock when you are back online';
        toast.success(statusMessage);
      } else if (res.data.success) {
        const statusMessage = outOfStockData.outOfStock
          ? 'Subcategory marked as out of stock'
          : 'Subcategory marked as in stock';
        toast.success(statusMessage);
      } else {
        toast.error(res.data.message || 'Failed to update out of stock status');
        // Revert optimistic update
        fetchSubCategories();
      }
      
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error updating out of stock status:', error);
      toast.error(error.response?.data?.message || 'Error updating out of stock status');
      // Revert optimistic update on error
      fetchSubCategories();
    } finally {
      handleCloseOutOfStockDialog();
    }
  };

  const handleCategoryFilterChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  // Helper function to format OutOfStock display
  const getOutOfStockInfo = (subCategory) => {
    if (!subCategory.stockStatus?.isOutOfStock) return null;
    
    if (subCategory.stockStatus.restockTime) {
      const date = new Date(subCategory.stockStatus.restockTime);
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
    } else if (!subCategory.stockStatus.autoRestock) {
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

  // Force sync data with server
  const handleForceSync = async () => {
    if (isOnline) {
      toast.success('Syncing data with server...');
      setLoading(true);
      
      try {
        // First check for potential conflicts
        const serverCategories = await enhancedAxiosWithAuth.get('/api/menu/subcategories');
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

  // Handle conflict resolution
  const handleConflictDetected = (conflict) => {
    setConflictData(conflict);
    setOpenConflictModal(true);
  };

  const handleConflictResolved = () => {
    setOpenConflictModal(false);
    setConflictData(null);
    fetchSubCategories();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Subcategories</Typography>
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
            Add Subcategory
          </Button>
        </Box>
      </Box>
      
      <Box mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-filter-label">Filter by Category</InputLabel>
          <Select
            labelId="category-filter-label"
            value={selectedCategory}
            onChange={handleCategoryFilterChange}
            label="Filter by Category"
          >
            <MenuItem value="">
              <em>All Categories</em>
            </MenuItem>
            {categories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.categoryName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
              <TableCell>Category</TableCell>
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
            ) : subCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {isOnline ? 'No subcategories found' : 'No offline data available'}
                </TableCell>
              </TableRow>
            ) : (
              subCategories.map((subCategory) => {
                const outOfStockInfo = getOutOfStockInfo(subCategory);
                const isTemp = subCategory.isTemp === true;
                
                return (
                  <TableRow
                    key={subCategory._id}
                    sx={{
                      ...(subCategory.stockStatus?.isOutOfStock ? { backgroundColor: 'rgba(244, 67, 54, 0.08)' } : {}),
                      ...(isTemp ? { backgroundColor: 'rgba(255, 193, 7, 0.12)' } : {})
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {subCategory.subCategoryName}
                        
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
                        
                        {subCategory.stockStatus?.isOutOfStock && (
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
                      {typeof subCategory.category === 'object' 
                        ? subCategory.category?.categoryName 
                        : categories.find(c => c._id === subCategory.category)?.categoryName || '-'}
                    </TableCell>
                    <TableCell>
                      {subCategory.image ? (
                        <Box
                          component="img"
                          src={subCategory.image}
                          alt={subCategory.subCategoryName}
                          sx={{
                            width: 50,
                            height: 50,
                            objectFit: 'cover',
                            borderRadius: 1,
                            opacity: subCategory.stockStatus?.isOutOfStock ? 0.5 : 1
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
                      {subCategory.stockStatus?.isOutOfStock ? (
                        <Tooltip title={subCategory.stockStatus.outOfStockReason || ''}>
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
                          color={subCategory.stockStatus?.isOutOfStock ? "warning" : "default"}
                          onClick={() => handleOpenOutOfStockDialog(subCategory)}
                          size="small"
                          title={subCategory.stockStatus?.isOutOfStock ? "Update out of stock status" : "Mark as out of stock"}
                        >
                          <OutOfStockIcon />
                        </IconButton>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenForm(subCategory)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(subCategory)}
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
      
      {/* SubCategory Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <SubCategoryForm
            subCategory={selectedSubCategory}
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
            Are you sure you want to delete the subcategory
            &quot;{subCategoryToDelete?.subCategoryName}&quot;? This action
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
      {selectedOutOfStockSubCategory && (
        <OutOfStockDialog
          open={openOutOfStockDialog}
          onClose={handleCloseOutOfStockDialog}
          onSave={handleOutOfStockSave}
          currentSettings={{
            outOfStock: selectedOutOfStockSubCategory.stockStatus?.isOutOfStock || false,
            outOfStockType: selectedOutOfStockSubCategory.stockStatus?.autoRestock === false ? 'manual' : 'auto',
            outOfStockUntil: selectedOutOfStockSubCategory.stockStatus?.restockTime || null,
            outOfStockReason: selectedOutOfStockSubCategory.stockStatus?.outOfStockReason || ''
          }}
          itemType="Subcategory"
          isOffline={!isOnline}
        />
      )}
      
      {/* Conflict Resolution Modal */}
      {openConflictModal && (
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
      )}
    </Box>
  );
};

export default SubCategoryList;
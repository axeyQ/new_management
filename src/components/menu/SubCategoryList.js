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
import SubCategoryForm from './SubCategoryForm';
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

const SubCategoryList = () => {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
  const [openOutOfStockDialog, setOpenOutOfStockDialog] = useState(false);
  const [selectedOutOfStockSubcategory, setSelectedOutOfStockSubcategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);
  const [detectedConflicts, setDetectedConflicts] = useState([]);
  const [recoveryPlans, setRecoveryPlans] = useState({});
  const [openAdvancedConflictModal, setOpenAdvancedConflictModal] = useState(false);
  const [justAddedOffline, setJustAddedOffline] = useState(false);
  
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
      const subcategoryPlans = Object.values(plans).filter(
        plan => plan.originalOperation.type.includes('SUBCATEGORY')
      );
      if (subcategoryPlans.length > 0) {
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
        op.type.includes('SUBCATEGORY')
      );
      setPendingOperations(subcategoryOps.length);
    } catch (error) {
      console.error('Error fetching pending operations:', error);
    }
  };
  
  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchPendingOperationsCount();
    
    // Set up an interval to refresh subcategories to update out of stock status
    const intervalId = setInterval(() => {
      if (isOnline) { // Only auto-refresh if online
        fetchSubcategories(false); // silent refresh (no loading indicator)
      }
      // Always refresh pending operations count
      fetchPendingOperationsCount();
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline, selectedCategory]); // Re-run when online status or selected category changes
  
  // Force sync when coming back online
  useEffect(() => {
    if (isOnline && isOfflineData) {
      fetchSubcategories();
    }
  }, [isOnline]);
  
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
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedCategories = await idb.getCategories();
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  const fetchSubcategories = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const url = selectedCategory
        ? `/api/menu/subcategories?category=${selectedCategory}`
        : '/api/menu/subcategories';
        
      let serverSubcategories = [];
      let fetchedFromServer = false;
      
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get(url);
          if (res.data.success) {
            serverSubcategories = res.data.data;
            fetchedFromServer = true;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
        }
      }
      
      // Get from IndexedDB, even if we got server data (to include pending items)
      let cachedSubcategories = [];
      if (selectedCategory) {
        cachedSubcategories = await idb.getSubcategoriesByCategory(selectedCategory);
      } else {
        cachedSubcategories = await idb.getSubcategories();
      }
      
      const lastSyncTime = await idb.getLastSyncTime('subcategory');
      setLastSyncTime(lastSyncTime);
      
      // Determine final list to display:
      // - If we have server data, use it but add any temp items from IndexedDB
      // - If we only have cached data, use that
      let finalSubcategories = [];
      
      if (fetchedFromServer) {
        // Start with server data
        finalSubcategories = [...serverSubcategories];
        
        // Add any temp items from cache that aren't in the server data
        const tempItems = cachedSubcategories.filter(item => 
          item.isTemp === true && 
          !finalSubcategories.some(serverItem => serverItem._id === item._id)
        );
        
        finalSubcategories = [...finalSubcategories, ...tempItems];
        setIsOfflineData(false);
      } else if (cachedSubcategories.length > 0) {
        // If only cached data available
        finalSubcategories = cachedSubcategories;
        setIsOfflineData(true);
      } else {
        // No data available
        finalSubcategories = [];
        setIsOfflineData(true);
      }
      
      // Process the list for auto-restocking if needed
      processSubcategoriesData(finalSubcategories, !fetchedFromServer);
      
      // Reset the just added flag after processing
      if (justAddedOffline) {
        setJustAddedOffline(false);
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
  const processSubcategoriesData = (data, isOffline) => {
    setIsOfflineData(isOffline);
    
    const updatedSubcategories = data.map(subcategory => {
      // Check if auto out-of-stock items should be back in stock
      if (
        subcategory.stockStatus?.isOutOfStock &&
        subcategory.stockStatus?.autoRestock &&
        subcategory.stockStatus?.restockTime &&
        isPast(new Date(subcategory.stockStatus.restockTime))
      ) {
        return {
          ...subcategory,
          stockStatus: {
            ...subcategory.stockStatus,
            isOutOfStock: false,
            restockTime: null,
            outOfStockReason: ''
          }
        };
      }
      return subcategory;
    });
    
    setSubcategories(updatedSubcategories);
    
    // If any subcategories were auto-updated, save them back to storage
    const subcategoriesToUpdate = updatedSubcategories.filter((subcategory, index) => {
      const originalSubcategory = data[index];
      return (
        subcategory._id === originalSubcategory._id &&
        subcategory.stockStatus?.isOutOfStock !== originalSubcategory.stockStatus?.isOutOfStock
      );
    });
    
    if (subcategoriesToUpdate.length > 0) {
      // Update in IndexedDB
      Promise.all(subcategoriesToUpdate.map(subcategory => 
        idb.updateSubcategory(subcategory)))
        .then(() => {
          console.log('Updated auto-restocked subcategories in IndexedDB');
        });
        
      // Update on server if online
      if (isOnline) {
        Promise.all(
          subcategoriesToUpdate.map(subcategory =>
            enhancedAxiosWithAuth.put(`/api/menu/subcategories/${subcategory._id}/stock`, {
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
  
  // Helper function to get the category name, handles both object and ID reference
  const getCategoryName = (subcategory) => {
    if (!subcategory.category) return 'Unknown';
    
    // For temporary items, category might be just an ID string
    if (typeof subcategory.category === 'string') {
      // Look up category name from categories list
      const category = categories.find(c => c._id === subcategory.category);
      return category ? category.categoryName : 'Unknown';
    }
    
    // For regular items, category should be an object
    return subcategory.category.categoryName || 'Unknown';
  };
  
  // Helper function to get the parent category type (food/beverage)
  const getCategoryType = (subcategory) => {
    if (!subcategory.category) return null;
    
    // For temporary items with just category ID
    if (typeof subcategory.category === 'string') {
      const category = categories.find(c => c._id === subcategory.category);
      return category ? category.parentCategory : null;
    }
    
    // For regular items with category object
    return subcategory.category.parentCategory || null;
  };
  
  const handleOpenForm = (subcategory = null) => {
    setSelectedSubcategory(subcategory);
    setOpenForm(true);
  };
  
  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedSubcategory(null);
  };
  
  // Enhanced form success handler for better offline support
  const handleFormSuccess = (updatedSubcategory) => {
    if (updatedSubcategory) {
      // Set flag if this was an offline operation with temp ID
      if (updatedSubcategory.isTemp) {
        setJustAddedOffline(true);
      }
      
      // Optimistic UI update for the local subcategories list
      setSubcategories(prevSubcategories => {
        // For update operations
        if (selectedSubcategory) {
          return prevSubcategories.map(sc =>
            sc._id === updatedSubcategory._id ? updatedSubcategory : sc
          );
        }
        // For create operations
        else {
          return [...prevSubcategories, updatedSubcategory];
        }
      });
    }
    
    // Also refresh from storage to ensure we have the latest data
    // but use false flag to not show loading indicator
    fetchSubcategories(false);
    fetchPendingOperationsCount();
    handleCloseForm();
  };
  
  const handleDeleteClick = (subcategory) => {
    setSubcategoryToDelete(subcategory);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSubcategoryToDelete(null);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      // Optimistic UI update - remove immediately from UI
      setSubcategories(prevSubcategories =>
        prevSubcategories.filter(sc => sc._id !== subcategoryToDelete._id)
      );
      
      const res = await enhancedAxiosWithAuth.delete(`/api/menu/subcategories/${subcategoryToDelete._id}`);
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        toast.success('Subcategory will be deleted when you are back online');
      } else if (res.data.success) {
        toast.success('Subcategory deleted successfully');
      } else {
        toast.error(res.data.message || 'Failed to delete subcategory');
        // Revert optimistic update if needed
        fetchSubcategories();
      }
      
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error(error.response?.data?.message || 'Error deleting subcategory');
      // Revert optimistic update on error
      fetchSubcategories();
    } finally {
      handleCloseDeleteDialog();
    }
  };
  
  // Out of Stock Dialog Handlers
  const handleOpenOutOfStockDialog = (subcategory) => {
    setSelectedOutOfStockSubcategory(subcategory);
    setOpenOutOfStockDialog(true);
  };
  
  const handleCloseOutOfStockDialog = () => {
    setOpenOutOfStockDialog(false);
    setSelectedOutOfStockSubcategory(null);
  };
  
  const handleOutOfStockSave = async (outOfStockData) => {
    try {
      // Optimistic UI update for stock status
      const updatedSubcategory = {
        ...selectedOutOfStockSubcategory,
        stockStatus: {
          ...selectedOutOfStockSubcategory.stockStatus,
          isOutOfStock: outOfStockData.outOfStock,
          outOfStockReason: outOfStockData.outOfStockReason,
          restockTime: outOfStockData.outOfStockUntil,
          autoRestock: outOfStockData.outOfStockType !== 'manual'
        }
      };
      
      // Update UI immediately
      setSubcategories(prevSubcategories =>
        prevSubcategories.map(sc =>
          sc._id === updatedSubcategory._id ? updatedSubcategory : sc
        )
      );
      
      // Use the specialized stock endpoint instead of the general update endpoint
      const res = await enhancedAxiosWithAuth.put(
        `/api/menu/subcategories/${selectedOutOfStockSubcategory._id}/stock`,
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
        fetchSubcategories();
      }
      
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error updating out of stock status:', error);
      toast.error(error.response?.data?.message || 'Error updating out of stock status');
      // Revert optimistic update on error
      fetchSubcategories();
    } finally {
      handleCloseOutOfStockDialog();
    }
  };
  
  // Helper function to format OutOfStock display
  const getOutOfStockInfo = (subcategory) => {
    if (!subcategory.stockStatus?.isOutOfStock) return null;
    
    if (subcategory.stockStatus.restockTime) {
      const date = new Date(subcategory.stockStatus.restockTime);
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
    } else if (!subcategory.stockStatus.autoRestock) {
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
        const serverSubcategories = await enhancedAxiosWithAuth.get('/api/menu/subcategories');
        
        if (serverSubcategories.data.success) {
          // Use the conflict detection from indexedDBService
          const conflicts = await idb.detectSubcategoryConflicts(serverSubcategories.data.data);
          
          if (conflicts.length > 0) {
            // Prepare conflicts for the modal with item names
            const namedConflicts = conflicts.map(conflict => ({
              ...conflict,
              itemName: conflict.localData.subCategoryName || 'Unknown Subcategory'
            }));
            
            setDetectedConflicts(namedConflicts);
            setOpenAdvancedConflictModal(true);
            setLoading(false);
            return;
          }
        }
        
        // Continue with regular sync if no conflicts
        const result = await initializeSync();
        await fetchSubcategories(false);
        await fetchPendingOperationsCount();
        
        // Show notification for sync result
        if (result.success) {
          showNotification('Sync Complete', {
            body: 'Subcategories synchronized successfully'
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
  
  const handleCategoryFilterChange = (categoryId) => {
    setSelectedCategory(categoryId);
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
          
          <AdvancedConflictModal
            open={openAdvancedConflictModal}
            onClose={() => setOpenAdvancedConflictModal(false)}
            conflicts={detectedConflicts}
            onResolved={(resolvedItems) => {
              setOpenAdvancedConflictModal(false);
              fetchSubcategories();
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
            Add Subcategory
          </Button>
        </Box>
      </Box>
      
      {/* Category filter */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Filter by Category:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label="All Categories"
            color={selectedCategory === '' ? 'primary' : 'default'}
            onClick={() => handleCategoryFilterChange('')}
            clickable
          />
          {categories.map(category => (
            <Chip
              key={category._id}
              label={category.categoryName}
              color={selectedCategory === category._id ? 'primary' : 'default'}
              onClick={() => handleCategoryFilterChange(category._id)}
              icon={category.parentCategory === 'food' ? <FoodIcon /> : <BeverageIcon />}
              clickable
            />
          ))}
        </Stack>
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
            : "You're offline. Changes will be saved locally and synced when you're back online."
          }
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
            ) : subcategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {isOnline ? 'No subcategories found' : 'No offline data available'}
                </TableCell>
              </TableRow>
            ) : (
              subcategories.map((subcategory) => {
                const outOfStockInfo = getOutOfStockInfo(subcategory);
                const isTemp = subcategory.isTemp === true;
                const categoryName = getCategoryName(subcategory);
                const categoryType = getCategoryType(subcategory);
                
                return (
                  <TableRow
                    key={subcategory._id}
                    sx={{
                      ...(subcategory.stockStatus?.isOutOfStock ? { backgroundColor: 'rgba(244, 67, 54, 0.08)' } : {}),
                      ...(isTemp ? { backgroundColor: 'rgba(255, 193, 7, 0.12)' } : {})
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {subcategory.subCategoryName}
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
                        {subcategory.stockStatus?.isOutOfStock && (
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
                        icon={categoryType === 'food' ? <FoodIcon /> : <BeverageIcon />}
                        label={categoryName}
                        color={categoryType === 'food' ? 'success' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {subcategory.image ? (
                        <Box
                          component="img"
                          src={subcategory.image}
                          alt={subcategory.subCategoryName}
                          sx={{
                            width: 50,
                            height: 50,
                            objectFit: 'cover',
                            borderRadius: 1,
                            opacity: subcategory.stockStatus?.isOutOfStock ? 0.5 : 1
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
                      {subcategory.stockStatus?.isOutOfStock ? (
                        <Tooltip title={subcategory.stockStatus.outOfStockReason || ''}>
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
                          color={subcategory.stockStatus?.isOutOfStock ? "warning" : "default"}
                          onClick={() => handleOpenOutOfStockDialog(subcategory)}
                          size="small"
                          title={subcategory.stockStatus?.isOutOfStock ? "Update out of stock status" : "Mark as out of stock"}
                        >
                          <OutOfStockIcon />
                        </IconButton>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenForm(subcategory)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(subcategory)}
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
            subCategory={selectedSubcategory}
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
            Are you sure you want to delete the subcategory &quot;{subcategoryToDelete?.subCategoryName}&quot;? This action cannot be undone.
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
      {selectedOutOfStockSubcategory && (
        <OutOfStockDialog
          open={openOutOfStockDialog}
          onClose={handleCloseOutOfStockDialog}
          onSave={handleOutOfStockSave}
          currentSettings={{
            outOfStock: selectedOutOfStockSubcategory.stockStatus?.isOutOfStock || false,
            outOfStockType: selectedOutOfStockSubcategory.stockStatus?.autoRestock === false ? 'manual' : 'auto',
            outOfStockUntil: selectedOutOfStockSubcategory.stockStatus?.restockTime || null,
            outOfStockReason: selectedOutOfStockSubcategory.stockStatus?.outOfStockReason || ''
          }}
          itemType="Subcategory"
          isOffline={!isOnline}
        />
      )}
    </Box>
  );
};

export default SubCategoryList;
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
  Alert,
  CircularProgress,
  Badge,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import toast from 'react-hot-toast';
import TableTypeForm from './TableTypeForm';
import { useNetwork } from '@/context/NetworkContext';
import { initializeSync } from '@/lib/syncManager';
import { syncStatus } from '@/lib/syncTracker';
import { showNotification } from '@/lib/notificationService';
import AdvancedConflictModal from '@/components/menu/AdvancedConflictModal';

const TableTypeList = () => {
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedTableType, setSelectedTableType] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  
  // Offline related states
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);
  const [detectedConflicts, setDetectedConflicts] = useState([]);
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
  
  useEffect(() => {
    fetchTableTypes();
    fetchPendingOperationsCount();
    
    // Set up an interval to refresh data
    const intervalId = setInterval(() => {
      if (isOnline) { // Only auto-refresh if online
        fetchTableTypes(false); // silent refresh (no loading indicator)
      }
      // Always refresh pending operations count
      fetchPendingOperationsCount();
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline]); // Re-run when online status changes
  
  // Force sync when coming back online
  useEffect(() => {
    if (isOnline && isOfflineData) {
      fetchTableTypes();
    }
  }, [isOnline]);
  
  // Fetch pending operations count
  const fetchPendingOperationsCount = async () => {
    try {
      const operations = await idb.getPendingOperations();
      const tableTypeOps = operations.filter(op => 
        op.type.includes('TABLE_TYPE') || 
        op.url.includes('/tables/types')
      );
      setPendingOperations(tableTypeOps.length);
    } catch (error) {
      console.error('Error fetching pending operations:', error);
    }
  };
  
  const fetchTableTypes = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get('/api/tables/types');
          if (res.data.success) {
            setTableTypes(res.data.data);
            setIsOfflineData(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
          // Fall back to local data
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedTableTypes = await idb.getTableTypes();
      const lastSyncTime = await idb.getTableLastSyncTime('tableType');
      
      if (cachedTableTypes.length > 0) {
        setTableTypes(cachedTableTypes);
        setIsOfflineData(true);
        setLastSyncTime(lastSyncTime);
      } else {
        setTableTypes([]);
        setIsOfflineData(true);
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
      if (showLoading) {
        toast.error('Error loading table types');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  
  const handleOpenForm = (tableType = null) => {
    setSelectedTableType(tableType);
    setOpenForm(true);
  };
  
  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTableType(null);
  };
  
  const handleFormSuccess = (updatedTableType) => {
    if (updatedTableType) {
      // Optimistic UI update for the local table types list
      setTableTypes(prevTableTypes => {
        // For update operations
        if (selectedTableType) {
          return prevTableTypes.map(type =>
            type._id === updatedTableType._id ? updatedTableType : type
          );
        }
        // For create operations
        else {
          return [...prevTableTypes, updatedTableType];
        }
      });
    }
    // Also refresh from storage to ensure we have the latest data
    fetchTableTypes(false);
    fetchPendingOperationsCount();
    handleCloseForm();
  };
  
  const handleDeleteClick = (tableType) => {
    setTypeToDelete(tableType);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTypeToDelete(null);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      // Optimistic UI update - remove immediately from UI
      setTableTypes(prevTableTypes =>
        prevTableTypes.filter(type => type._id !== typeToDelete._id)
      );
      
      const res = await enhancedAxiosWithAuth.delete(`/api/tables/types/${typeToDelete._id}`);
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        toast.success('Table type will be deleted when you are back online');
      } else if (res.data.success) {
        toast.success('Table type deleted successfully');
      } else {
        toast.error(res.data.message || 'Failed to delete table type');
        // Revert optimistic update if needed
        fetchTableTypes();
      }
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error deleting table type:', error);
      toast.error(error.response?.data?.message || 'Error deleting table type');
      // Revert optimistic update on error
      fetchTableTypes();
    } finally {
      handleCloseDeleteDialog();
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
        const serverTableTypes = await enhancedAxiosWithAuth.get('/api/tables/types');
        
        if (serverTableTypes.data.success) {
          // Use the conflict detection from indexedDBService
          const conflicts = await idb.detectTableTypeConflicts(serverTableTypes.data.data);
          
          if (conflicts.length > 0) {
            // Prepare conflicts for the modal with item names
            const namedConflicts = conflicts.map(conflict => ({
              ...conflict,
              itemName: conflict.localData.tableTypeName || 'Unknown Table Type'
            }));
            
            setDetectedConflicts(namedConflicts);
            setOpenAdvancedConflictModal(true);
            setLoading(false);
            return;
          }
        }
        
        // Continue with regular sync if no conflicts
        const result = await initializeSync();
        await fetchTableTypes(false);
        await fetchPendingOperationsCount();
        
        // Show notification for sync result
        if (result.success) {
          showNotification('Sync Complete', {
            body: 'Table types synchronized successfully'
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
        <Typography variant="h5">Table Types</Typography>
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
            Add Table Type
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
            : "You're offline. Changes will be saved locally and synced when you're back online."
          }
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Loading...
                </TableCell>
              </TableRow>
            ) : tableTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  {isOnline ? 'No table types found' : 'No offline data available'}
                </TableCell>
              </TableRow>
            ) : (
              tableTypes.map((type) => {
                const isTemp = type.isTemp === true;
                
                return (
                  <TableRow 
                    key={type._id}
                    sx={{
                      ...(isTemp ? { backgroundColor: 'rgba(255, 193, 7, 0.12)' } : {})
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {type.tableTypeName}
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
                      </Box>
                    </TableCell>
                    <TableCell>{type.tableTypeDescription || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenForm(type)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(type)}
                        size="small"
                        disabled={isTemp} // Disable deleting items that are pending sync
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Table Type Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TableTypeForm
            tableType={selectedTableType}
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
            Are you sure you want to delete the table type &quot;{typeToDelete?.tableTypeName}&quot;? This action cannot be undone.
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
      
      {/* Conflict Resolution Modal */}
      <AdvancedConflictModal
        open={openAdvancedConflictModal}
        onClose={() => setOpenAdvancedConflictModal(false)}
        conflicts={detectedConflicts}
        onResolved={(resolvedItems) => {
          setOpenAdvancedConflictModal(false);
          fetchTableTypes();
          // Show notification
          showNotification('Conflicts Resolved', {
            body: `Successfully resolved ${resolvedItems.length} conflicts`
          });
        }}
      />
    </Box>
  );
};

export default TableTypeList;
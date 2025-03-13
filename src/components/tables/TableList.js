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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import toast from 'react-hot-toast';
import TableForm from './TableForm';
import { useNetwork } from '@/context/NetworkContext';
import { initializeSync } from '@/lib/syncManager';
import { syncStatus } from '@/lib/syncTracker';
import { showNotification } from '@/lib/notificationService';
import AdvancedConflictModal from '@/components/menu/AdvancedConflictModal';

const TableList = () => {
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  
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
    fetchTables();
    fetchPendingOperationsCount();
    
    // Set up an interval to refresh data
    const intervalId = setInterval(() => {
      if (isOnline) { // Only auto-refresh if online
        fetchTables(false); // silent refresh (no loading indicator)
      }
      // Always refresh pending operations count
      fetchPendingOperationsCount();
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline]); // Re-run when online status changes
  
  // Force sync when coming back online
  useEffect(() => {
    if (isOnline && isOfflineData) {
      fetchTables();
    }
  }, [isOnline]);
  
  // Refresh tables when selected type changes
  useEffect(() => {
    fetchTables();
  }, [selectedType]);
  
  // Fetch pending operations count
  const fetchPendingOperationsCount = async () => {
    try {
      const operations = await idb.getPendingOperations();
      const tableOps = operations.filter(op => 
        op.type.includes('TABLE') || 
        op.url.includes('/tables')
      );
      setPendingOperations(tableOps.length);
    } catch (error) {
      console.error('Error fetching pending operations:', error);
    }
  };
  
  const fetchTableTypes = async () => {
    try {
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get('/api/tables/types');
          if (res.data.success) {
            setTableTypes(res.data.data);
            return;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedTableTypes = await idb.getTableTypes();
      const lastSyncTime = await idb.getTableLastSyncTime('tableType');
      
      if (cachedTableTypes.length > 0) {
        setTableTypes(cachedTableTypes);
        setLastSyncTime(lastSyncTime);
      } else {
        setTableTypes([]);
        setIsOfflineData(true);
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
      toast.error('Failed to load table types');
    }
  };
  
  const fetchTables = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const url = selectedType
        ? `/api/tables?type=${selectedType}`
        : '/api/tables';
      
      // First try to get from server if online
      if (isOnline) {
        try {
          const res = await enhancedAxiosWithAuth.get(url);
          if (res.data.success) {
            setTables(res.data.data);
            setIsOfflineData(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching from server, falling back to IndexedDB:', error);
          // Fall back to local data
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      let cachedTables = selectedType
        ? await idb.getTablesByType(selectedType)
        : await idb.getTables();
      
      const lastSyncTime = await idb.getTableLastSyncTime('table');
      
      if (cachedTables.length > 0) {
        setTables(cachedTables);
        setIsOfflineData(true);
        setLastSyncTime(lastSyncTime);
      } else {
        setTables([]);
        setIsOfflineData(true);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      if (showLoading) {
        toast.error('Error loading tables');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  
  const handleOpenForm = (table = null) => {
    setSelectedTable(table);
    setOpenForm(true);
  };
  
  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTable(null);
  };
  
  const handleFormSuccess = (updatedTable) => {
    if (updatedTable) {
      // Optimistic UI update for the local tables list
      setTables(prevTables => {
        // For update operations
        if (selectedTable) {
          return prevTables.map(t =>
            t._id === updatedTable._id ? updatedTable : t
          );
        }
        // For create operations
        else {
          return [...prevTables, updatedTable];
        }
      });
    }
    // Also refresh from storage to ensure we have the latest data
    fetchTables(false);
    fetchPendingOperationsCount();
    handleCloseForm();
  };
  
  const handleDeleteClick = (table) => {
    setTableToDelete(table);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTableToDelete(null);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      // Optimistic UI update - remove immediately from UI
      setTables(prevTables =>
        prevTables.filter(t => t._id !== tableToDelete._id)
      );
      
      const res = await enhancedAxiosWithAuth.delete(`/api/tables/${tableToDelete._id}`);
      
      // Check if this was an offline operation
      if (res.data.isOfflineOperation) {
        toast.success('Table will be deleted when you are back online');
      } else if (res.data.success) {
        toast.success('Table deleted successfully');
      } else {
        toast.error(res.data.message || 'Failed to delete table');
        // Revert optimistic update if needed
        fetchTables();
      }
      fetchPendingOperationsCount();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error(error.response?.data?.message || 'Error deleting table');
      // Revert optimistic update on error
      fetchTables();
    } finally {
      handleCloseDeleteDialog();
    }
  };
  
  const handleTypeFilterChange = (event) => {
    setSelectedType(event.target.value);
  };
  
  // Format date for display
  const formatLastSync = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Force sync data with server
  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    
    setLoading(true);
    toast.loading('Syncing data with server...');
  
    try {
      // First check for any pending table operations
      const pendingOps = await idb.getPendingOperations();
      const tableOps = pendingOps.filter(op => 
        op.type?.includes('TABLE') || op.url?.includes('/tables')
      );
      
      console.log(`Found ${tableOps.length} pending table operations`);
      
      // If there are pending table operations, try to process them directly
      if (tableOps.length > 0) {
        console.log('Processing table operations first...');
        
        for (const operation of tableOps) {
          try {
            if (operation.type === 'CREATE_TABLE' && operation.tempId) {
              // Find the temp table
              const tables = await idb.getTables();
              const tempTable = tables.find(t => t._id === operation.tempId);
              
              if (tempTable) {
                // Prepare clean data for the server
                const cleanData = { ...tempTable };
                delete cleanData._id;
                delete cleanData.isTemp;
                delete cleanData.__v;
                
                // Handle tableType if it's an object
                if (cleanData.tableType && typeof cleanData.tableType === 'object') {
                  cleanData.tableType = cleanData.tableType._id;
                }
                
                console.log('Sending manual table creation:', cleanData);
                
                // Attempt to create on server
                const response = await enhancedAxiosWithAuth.post('/api/tables', cleanData);
                
                if (response.data.success) {
                  console.log('Table created successfully:', response.data.data);
                  
                  // Clean up
                  await idb.deleteTable(tempTable._id);
                  await idb.updateTable(response.data.data);
                  await idb.clearOperation(operation.id);
                  
                  toast.success('Table synchronized successfully');
                }
              }
            }
          } catch (error) {
            console.error('Error processing operation:', error);
          }
        }
      }
      
      // Now try the standard sync process
      console.log('Running standard sync process...');
      const result = await initializeSync();
      
      if (result.processed > 0 || result.dataSync) {
        toast.dismiss();
        toast.success('Synchronization completed successfully');
      } else if (result.failed > 0) {
        toast.dismiss();
        toast.error(`Failed to sync ${result.failed} operations`);
      }
      
      // Refresh data
      await fetchTables(false);
      await fetchTableTypes();
      await fetchPendingOperationsCount();
      
    } catch (error) {
      console.error('Error during force sync:', error);
      toast.dismiss();
      toast.error('Sync failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Tables</Typography>
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
            Add Table
          </Button>
        </Box>
      </Box>
      
      <Box mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="type-filter-label">Filter by Type</InputLabel>
          <Select
            labelId="type-filter-label"
            value={selectedType}
            onChange={handleTypeFilterChange}
            label="Filter by Type"
          >
            <MenuItem value="">
              <em>All Types</em>
            </MenuItem>
            {tableTypes.map((type) => (
              <MenuItem key={type._id} value={type._id}>
                {type.tableTypeName}
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
              <TableCell>Capacity</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Loading...
                </TableCell>
              </TableRow>
            ) : tables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {isOnline ? 'No tables found' : 'No offline data available'}
                </TableCell>
              </TableRow>
            ) : (
              tables.map((table) => {
                const isTemp = table.isTemp === true;
                
                return (
                  <TableRow 
                    key={table._id}
                    sx={{
                      ...(isTemp ? { backgroundColor: 'rgba(255, 193, 7, 0.12)' } : {})
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {table.tableName}
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
                    <TableCell>{table.tableDescription || '-'}</TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell>
                      {typeof table.tableType === 'object'
                        ? table.tableType?.tableTypeName
                        : tableTypes.find(t => t._id === table.tableType)?.tableTypeName || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={table.status ? <CheckIcon /> : <CloseIcon />}
                        label={table.status ? 'Available' : 'Unavailable'}
                        color={table.status ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenForm(table)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(table)}
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
      
      {/* Table Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TableForm
            table={selectedTable}
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
            Are you sure you want to delete the table &quot;{tableToDelete?.tableName}&quot;? This action cannot be undone.
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
          fetchTables();
          // Show notification
          showNotification('Conflicts Resolved', {
            body: `Successfully resolved ${resolvedItems.length} conflicts`
          });
        }}
      />
    </Box>
  );
};

export default TableList;
'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  TableRestaurant as TableIcon,
  Refresh as RefreshIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import TableForm from './TableForm';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';
import { initializeSync } from '@/lib/syncManager';
import { syncStatus } from '@/lib/syncTracker';
import { showNotification } from '@/lib/notificationService';

const TableLayout = () => {
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTable, setDraggedTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [openForm, setOpenForm] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [layoutChanged, setLayoutChanged] = useState(false);
  
  // Offline related states
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);
  
  // Get network status from context
  const { isOnline } = useNetwork();
  
  const layoutRef = useRef(null);
  
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
          console.error('Error fetching table types from server, falling back to IndexedDB:', error);
        }
      }
      
      // Get from IndexedDB if offline or server request failed
      const cachedTableTypes = await idb.getTableTypes();
      
      if (cachedTableTypes.length > 0) {
        setTableTypes(cachedTableTypes);
      } else {
        setTableTypes([]);
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
            processTablesData(res.data.data, false);
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
        : await idb.getTablesWithTableTypes();
      
      const lastSyncTime = await idb.getTableLastSyncTime('table');
      
      if (cachedTables.length > 0) {
        processTablesData(cachedTables, true);
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
  
  // Process tables data with appropriate transformations
  const processTablesData = (data, isOffline) => {
    setIsOfflineData(isOffline);
    setTables(data);
    setLayoutChanged(false); // Reset layout changed flag when loading new data
  };
  
  const handleMouseDown = (e, table) => {
    if (!layoutRef.current || !isOnline) return; // Prevent dragging when offline
    const layoutRect = layoutRef.current.getBoundingClientRect();
    const offsetX = e.clientX - layoutRect.left - table.positionX;
    const offsetY = e.clientY - layoutRect.top - table.positionY;
    setIsDragging(true);
    setDraggedTable(table);
    setDragOffset({ x: offsetX, y: offsetY });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !draggedTable || !layoutRef.current) return;
    const layoutRect = layoutRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(layoutRect.width - 100, e.clientX - layoutRect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(layoutRect.height - 100, e.clientY - layoutRect.top - dragOffset.y));
    setTables(prevTables =>
      prevTables.map(t =>
        t._id === draggedTable._id
          ? { ...t, positionX: newX, positionY: newY }
          : t
      )
    );
    setLayoutChanged(true);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedTable(null);
  };
  
  const saveTablePositions = async () => {
    if (!isOnline) {
      toast.error('Cannot save layout while offline');
      return;
    }
    
    try {
      const updates = tables.map(async (table) => {
        return enhancedAxiosWithAuth.put(`/api/tables/${table._id}`, {
          positionX: table.positionX,
          positionY: table.positionY
        });
      });
      await Promise.all(updates);
      toast.success('Table layout saved successfully');
      setLayoutChanged(false);
      await fetchTables(false); // Refresh the data
    } catch (error) {
      console.error('Error saving table positions:', error);
      toast.error('Failed to save table layout');
    }
  };
  
  const handleOpenForm = () => {
    setOpenForm(true);
  };
  
  const handleCloseForm = () => {
    setOpenForm(false);
  };
  
  const handleFormSuccess = () => {
    fetchTables();
    handleCloseForm();
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
    if (isOnline) {
      toast.success('Syncing data with server...');
      setLoading(true);
      try {
        const result = await initializeSync();
        await fetchTableTypes();
        await fetchTables(false);
        await fetchPendingOperationsCount();
        
        // Show notification for sync result
        if (result.success) {
          showNotification('Sync Complete', {
            body: 'Tables synchronized successfully'
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
        <Typography variant="h5">Table Layout</Typography>
        <Box display="flex" gap={2}>
          {syncProgress?.inProgress && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body2">
                {Math.round(syncProgress.progress)}%
              </Typography>
            </Box>
          )}
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => fetchTables()}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            color="success"
            startIcon={<SaveIcon />}
            onClick={saveTablePositions}
            disabled={!layoutChanged || !isOnline || loading}
          >
            Save Layout
          </Button>
          
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
            onClick={handleOpenForm}
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
      
      {!isOnline && (
        <Alert
          severity="warning"
          icon={<OfflineIcon />}
          sx={{ mb: 2 }}
        >
          You&apos;re offline. The layout editor has limited functionality while offline. Dragging tables is disabled.
        </Alert>
      )}
      
      <Paper
        ref={layoutRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: 600,
          backgroundColor: '#f5f5f5',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default',
          opacity: !isOnline ? 0.8 : 1
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress />
          </Box>
        ) : (
          tables.map((table) => {
            const isTemp = table.isTemp === true;
            
            return (
              <Tooltip
                key={table._id}
                title={`${table.tableName} - Capacity: ${table.capacity}
${isTemp ? '(Pending sync)' : ''}
Type: ${typeof table.tableType === 'object' ? table.tableType?.tableTypeName : tableTypes.find(t => t._id === table.tableType)?.tableTypeName || 'None'}`}
                arrow
              >
                <Paper
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    width: table.capacity > 4 ? 120 : 80,
                    height: table.capacity > 4 ? 120 : 80,
                    borderRadius: table.capacity > 4 ? '50%' : '8px',
                    left: table.positionX,
                    top: table.positionY,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: isTemp ? '#fff3cd' : (table.status ? '#ffffff' : '#f0f0f0'),
                    border: `2px solid ${isTemp ? '#ffc107' : (table.status ? '#4caf50' : '#f44336')}`,
                    cursor: isOnline ? 'grab' : 'not-allowed',
                    userSelect: 'none',
                    zIndex: draggedTable?._id === table._id ? 10 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, table)}
                >
                  <TableIcon color={isTemp ? 'warning' : (table.status ? 'primary' : 'disabled')} />
                  <Typography
                    variant="caption"
                    align="center"
                    sx={{
                      fontWeight: 'bold',
                      marginTop: 0.5,
                      fontSize: table.capacity > 4 ? '1rem' : '0.8rem',
                    }}
                  >
                    {table.tableName}
                  </Typography>
                  <Typography variant="caption" align="center">
                    Cap: {table.capacity}
                  </Typography>
                </Paper>
              </Tooltip>
            );
          })
        )}
      </Paper>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
        {isOnline 
          ? 'Drag tables to position them. Click "Save Layout" to save the positions.'
          : 'Table dragging is disabled while offline. Connect to the internet to edit table layout.'}
      </Typography>
      
      {/* Table Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TableForm
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TableLayout;
// src/components/common/SyncStatus.js
'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Sync as SyncIcon,
  CloudOff as OfflineIcon,
  Error as ErrorIcon,
  Check as SuccessIcon,
  History as HistoryIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import * as idb from '@/lib/indexedDBService';
import { initializeSync, retryFailedOperations } from '@/lib/syncManager';
import { useNetwork } from '@/context/NetworkContext';
import toast from 'react-hot-toast';

const SyncStatus = () => {
  const { isOnline } = useNetwork();
  const [pendingOperations, setPendingOperations] = useState(0);
  const [failedOperations, setFailedOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [syncDetails, setSyncDetails] = useState({});
  const [syncHistory, setSyncHistory] = useState([]);
  
  useEffect(() => {
    fetchStatus();
    
    // Set up an interval to refresh status
    const intervalId = setInterval(fetchStatus, 10000); // every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isOnline]);
  
  const fetchStatus = async () => {
    try {
      // Get pending operations
      const operations = await idb.getPendingOperations();
      setPendingOperations(operations.length);
      
      // Get failed operations
      const failed = await idb.getMetadata('failedOperations') || {};
      setFailedOperations(Object.keys(failed).length);
      
      // Get last sync time
      const lastSync = await idb.getMetadata('lastFullSync');
      setLastSyncTime(lastSync);
      
      // Get sync history
      const history = await idb.getMetadata('syncHistory') || [];
      setSyncHistory(history.slice(0, 10)); // Only keep the last 10 entries
      
      // Get last sync details
      const details = await idb.getMetadata('lastSyncDetails') || {};
      setSyncDetails(details);
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };
  
  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    
    try {
      setSyncing(true);
      
      // Record start time for history
      const startTime = new Date();
      
      const result = await initializeSync();
      
      // Update history
      const historyEntry = {
        timestamp: new Date().toISOString(),
        duration: new Date() - startTime,
        processed: result.processed,
        failed: result.failed,
        retrying: result.retrying,
        categories: result.categories,
        subcategories: result.subcategories,
        success: result.success
      };
      
      const history = await idb.getMetadata('syncHistory') || [];
      history.unshift(historyEntry);
      await idb.setMetadata('syncHistory', history.slice(0, 20)); // Keep last 20
      
      // Save details for inspection
      await idb.setMetadata('lastSyncDetails', result);
      
      fetchStatus();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Sync failed unexpectedly');
    } finally {
      setSyncing(false);
    }
  };
  
  const handleRetryFailed = async () => {
    if (!isOnline) {
      toast.error('Cannot retry while offline');
      return;
    }
    
    try {
      setSyncing(true);
      const result = await retryFailedOperations();
      
      if (result.success) {
        toast.success(`Requeued ${result.retriedCount} operation(s) for retry`);
        fetchStatus();
      } else {
        toast.error('Failed to retry operations');
      }
    } catch (error) {
      console.error('Error retrying failed operations:', error);
      toast.error('Retry failed unexpectedly');
    } finally {
      setSyncing(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  const getStatusColor = () => {
    if (!isOnline) return 'error';
    if (syncing) return 'info';
    if (failedOperations > 0) return 'error';
    if (pendingOperations > 0) return 'warning';
    return 'success';
  };
  
  const getStatusIcon = () => {
    if (!isOnline) return <OfflineIcon />;
    if (syncing) return <CircularProgress size={16} />;
    if (failedOperations > 0) return <ErrorIcon />;
    if (pendingOperations > 0) return <SyncIcon />;
    return <SuccessIcon />;
  };
  
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncing) return 'Syncing...';
    if (failedOperations > 0) return `${failedOperations} failed`;
    if (pendingOperations > 0) return `${pendingOperations} pending`;
    return 'Synced';
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          onClick={() => setOpenDialog(true)}
        />
        
        <Tooltip title="Sync now">
          <IconButton
            size="small"
            color="primary"
            onClick={handleSync}
            disabled={!isOnline || syncing}
          >
            <SyncIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Synchronization Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Current Status</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip
                icon={isOnline ? <SuccessIcon /> : <OfflineIcon />}
                label={isOnline ? 'Online' : 'Offline'}
                color={isOnline ? 'success' : 'error'}
                size="small"
              />
              
              <Chip
                icon={<SyncIcon />}
                label={`${pendingOperations} operation(s) pending`}
                color={pendingOperations > 0 ? 'warning' : 'default'}
                size="small"
              />
              
              <Chip
                icon={<ErrorIcon />}
                label={`${failedOperations} operation(s) failed`}
                color={failedOperations > 0 ? 'error' : 'default'}
                size="small"
              />
            </Box>
            
            <Typography variant="body2">
              Last successful sync: {formatDate(lastSyncTime)}
            </Typography>
          </Box>
          
          {failedOperations > 0 && (
            <Alert 
              severity="warning" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small"
                  onClick={handleRetryFailed}
                  disabled={!isOnline || syncing}
                >
                  Retry All
                </Button>
              }
            >
              {failedOperations} operation(s) failed to synchronize. You can retry them or view details below.
            </Alert>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Sync History
          </Typography>
          
          {syncHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No sync history available yet
            </Typography>
          ) : (
            <List dense>
              {syncHistory.map((entry, index) => (
                <ListItem key={index} divider={index < syncHistory.length - 1}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {entry.success ? (
                          <SuccessIcon fontSize="small" color="success" />
                        ) : (
                          <ErrorIcon fontSize="small" color="error" />
                        )}
                        {formatDate(entry.timestamp)}
                      </Box>
                    }
                    secondary={
                      <>
                        Processed: {entry.processed}, Failed: {entry.failed}, Retrying: {entry.retrying || 0}
                        <br />
                        Duration: {Math.round(entry.duration / 1000)}s
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          {syncDetails && syncDetails.failedOperations && syncDetails.failedOperations.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Failed Operations Details
              </Typography>
              
              <List dense>
                {syncDetails.failedOperations.map((op, index) => (
                  <ListItem key={index} divider={index < syncDetails.failedOperations.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ErrorIcon fontSize="small" color="error" />
                          {op.type}
                        </Box>
                      }
                      secondary={
                        <>
                          URL: {op.url}
                          <br />
                          Error: {op.errorMessage} {op.statusCode ? `(${op.statusCode})` : ''}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          <Button 
            onClick={handleSync} 
            variant="contained" 
            disabled={!isOnline || syncing}
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SyncStatus;
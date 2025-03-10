// src/components/common/OfflineStatusBanner.js
import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { CloudOff as OfflineIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useNetwork } from '@/context/NetworkContext';

const OfflineStatusBanner = ({ 
  isOfflineData, 
  lastSyncTime, 
  onForceSync, 
  pendingOperations = 0
}) => {
  const { isOnline } = useNetwork();
  
  // Format date for display
  const formatLastSync = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (!isOfflineData && isOnline) {
    return null;
  }
  
  return (
    <Alert 
      severity="info" 
      icon={<OfflineIcon />}
      action={
        <Button 
          color="inherit" 
          size="small" 
          startIcon={<SyncIcon />} 
          onClick={onForceSync}
          disabled={!isOnline}
        >
          Sync Now
        </Button>
      }
      sx={{ mb: 2 }}
    >
      {isOnline 
        ? `You're viewing cached data from ${formatLastSync(lastSyncTime)}` 
        : "You're offline. Changes will be saved locally and synced when you're back online."}
      
      {pendingOperations > 0 && (
        <Box component="span" sx={{ ml: 1 }}>
          <Typography component="span" fontWeight="bold">
            ({pendingOperations} pending operation{pendingOperations !== 1 ? 's' : ''})
          </Typography>
        </Box>
      )}
    </Alert>
  );
};

export default OfflineStatusBanner;
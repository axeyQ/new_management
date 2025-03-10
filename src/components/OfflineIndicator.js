'use client';

import { Chip } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useOffline } from '@/context/OfflineContext';

export const OfflineIndicator = () => {
  const { isOffline } = useOffline();
  
  if (!isOffline) return null;
  
  return (
    <Chip
      icon={<WifiOffIcon />}
      label="Offline Mode"
      color="warning"
      size="small"
    />
  );
};
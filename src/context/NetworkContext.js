'use client';
import { setupConnectivityListeners } from '@/lib/offlineUtils';
import { createContext, useState, useEffect, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';

const NetworkContext = createContext({
  isOnline: true,
  lastOnlineAt: null
});

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState(
    typeof localStorage !== 'undefined' ? localStorage.getItem('lastOnlineAt') : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineAlert(true);
      const now = new Date().toISOString();
      setLastOnlineAt(now);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lastOnlineAt', now);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, lastOnlineAt }}>
      {children}
      
      <Snackbar 
        open={showOfflineAlert} 
        autoHideDuration={3000} 
        onClose={() => setShowOfflineAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity="warning" 
          icon={<WifiOffIcon />} 
          onClose={() => setShowOfflineAlert(false)}
        >
          You are offline. Some features may be limited.
        </Alert>
      </Snackbar>

      <Snackbar 
        open={showOnlineAlert} 
        autoHideDuration={3000} 
        onClose={() => setShowOnlineAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity="success" 
          icon={<WifiIcon />} 
          onClose={() => setShowOnlineAlert(false)}
        >
          You are back online. Syncing data...
        </Alert>
      </Snackbar>
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
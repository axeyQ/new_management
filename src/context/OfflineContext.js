'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { isOnline } from '@/lib/offlineUtils';

const OfflineContext = createContext({
  isOffline: false
});

export const OfflineProvider = ({ children }) => {
  // Start with default value, update after mounting
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    // Now we're safely in the browser
    setIsOffline(!isOnline());
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <OfflineContext.Provider value={{ isOffline }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
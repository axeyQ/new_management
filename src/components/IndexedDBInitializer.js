'use client';

import { useEffect } from 'react';
import { initDB } from '@/lib/indexedDB';

export default function IndexedDBInitializer() {
// src/app/layout.js or appropriate location
useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('ServiceWorker registered: ', registration);
          })
          .catch(error => {
            console.log('ServiceWorker registration failed: ', error);
          });
      });
    }
  }, []);

  

  // This component doesn't render anything
  return null;
}
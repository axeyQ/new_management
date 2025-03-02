'use client';
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for KDS WebSocket connection
 * @param {string} orderMode - The order mode to listen for updates (default: 'all')
 * @returns {object} - Socket connection state and update handlers
 */
export default function useKdsSocket(orderMode = 'all') {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    // Get WebSocket URL from environment or use current host
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    // Create socket connection to KDS namespace
    const socketInstance = io(`${socketUrl}/kds`, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      timeout: 10000
    });
    
    // Set up event handlers
    socketInstance.on('connect', () => {
      console.log('Connected to KDS socket');
      setIsConnected(true);
      
      // Join the order mode room
      socketInstance.emit('join-mode', orderMode);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Disconnected from KDS socket');
      setIsConnected(false);
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    });
    
    // Store socket instance
    setSocket(socketInstance);
    
    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        // Leave the order mode room
        socketInstance.emit('leave-mode', orderMode);
        socketInstance.disconnect();
      }
    };
  }, [orderMode]);
  
  // Set up listeners for KOT updates when socket is ready
  useEffect(() => {
    if (!socket) return;
    
    // Handler for new KOTs
    const handleNewKot = (data) => {
      setLatestUpdate({
        type: 'new',
        data,
        timestamp: new Date()
      });
    };
    
    // Handler for KOT status updates
    const handleStatusUpdate = (data) => {
      setLatestUpdate({
        type: 'status',
        data,
        timestamp: new Date()
      });
      
      // Add to status updates queue (keeping last 10)
      setStatusUpdates(prev => {
        const updated = [data, ...prev];
        return updated.slice(0, 10);
      });
    };
    
    // Register event handlers
    socket.on('kot-new', handleNewKot);
    socket.on('kot-status-updated', handleStatusUpdate);
    
    // Cleanup event handlers
    return () => {
      socket.off('kot-new', handleNewKot);
      socket.off('kot-status-updated', handleStatusUpdate);
    };
  }, [socket]);
  
  // Function to emit a KOT status update
  const updateKotStatus = useCallback((kotId, status) => {
    if (!socket || !isConnected) return false;
    
    socket.emit('update-kot-status', {
      kotId,
      status,
      orderMode,
      timestamp: new Date()
    });
    
    return true;
  }, [socket, isConnected, orderMode]);
  
  // Function to change order mode
  const changeOrderMode = useCallback((newMode) => {
    if (!socket || !isConnected) return false;
    
    // Leave current mode room
    socket.emit('leave-mode', orderMode);
    
    // Join new mode room
    socket.emit('join-mode', newMode);
    
    return true;
  }, [socket, isConnected, orderMode]);
  
  return {
    socket,
    isConnected,
    latestUpdate,
    statusUpdates,
    updateKotStatus,
    changeOrderMode
  };
}
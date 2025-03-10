'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

// SocketIOClient class for managing socket connections
class SocketIOClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.isConnected = false;
  }

  // Initialize the socket connection
  init() {
    if (this.socket || this.isConnecting) return;
    
    this.isConnecting = true;
    
    // Create socket connection
    this.socket = io();
    
    // Set up event listeners
    this.socket.on('connect', () => {
      console.log('Socket.IO connected!');
      this.isConnected = true;
      this.isConnecting = false;
      
      // Notify all connection listeners
      this._notifyListeners('connection', { connected: true });
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      this.isConnected = false;
      
      // Notify all connection listeners
      this._notifyListeners('connection', { connected: false });
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.isConnected = false;
      this.isConnecting = false;
    });
    
    // Set up event listeners for different event types
    this._setupEventListeners();
  }
  
  // Set up listeners for different event types
  _setupEventListeners() {
    // Listen for KOT status changes
    this.socket.on('kot_status_change', (data) => {
      this._notifyListeners('kot_status_change', data);
      
      // Handle notifications for important status changes
      if (data.status === 'ready') {
        toast.success(`Order #${data.orderNumber || data.kotId} is ready!`, {
          duration: 5000,
          icon: '🔔',
        });
        this._playSound('orderReady');
      }
    });
    
    // Listen for new orders
    this.socket.on('new_order', (data) => {
      this._notifyListeners('new_order', data);
      
      toast.success(`New ${data.orderType || ''} order #${data.orderNumber} received!`, {
        duration: 5000,
        icon: '🔔',
      });
      this._playSound('newOrder');
    });
    
    // Listen for new KOTs
    this.socket.on('new_kot', (data) => {
      this._notifyListeners('new_kot', data);
      
      toast.success(`New KOT #${data.orderNumber} created!`, {
        duration: 5000,
        icon: '🔔',
      });
      this._playSound('newOrder');
    });
  }
  
  // Add a listener for a specific event type
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push(callback);
    
    // Initialize the socket if not already done
    if (!this.socket && !this.isConnecting) {
      this.init();
    }
    
    // Return an unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (!callbacks) return;
      
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  // Notify all listeners for a specific event type
  _notifyListeners(eventType, data) {
    if (!this.listeners.has(eventType)) return;
    
    this.listeners.get(eventType).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${eventType} listener:`, error);
      }
    });
  }
  
  // Check if the socket is connected
  isSocketConnected() {
    return this.isConnected;
  }
  
  // Reconnect the socket
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      this.init();
    }
  }
  
  // Play notification sound
  _playSound(type) {
    try {
      // Check if sound is enabled
      const soundEnabled = localStorage.getItem('kds_sound_enabled') !== 'false';
      if (!soundEnabled) return;
      
      let soundFile;
      
      switch (type) {
        case 'newOrder':
          soundFile = '/sounds/new-order.mp3';
          break;
        case 'orderReady':
          soundFile = '/sounds/order-ready.mp3';
          break;
        default:
          soundFile = '/sounds/notification.mp3';
      }
      
      const audio = new Audio(soundFile);
      audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });
    } catch (error) {
      console.error('Error with notification sound:', error);
    }
  }
}

// Create a singleton instance
const socketClient = new SocketIOClient();

// Initialize socket on the client side
if (typeof window !== 'undefined') {
  // Initialize socket connection
  fetch('/api/socket')
    .then(() => socketClient.init())
    .catch(err => console.error('Error initializing socket:', err));
}

// React hook for using socket in components
export function useSocket(eventType, callback) {
  useEffect(() => {
    // Add listener and get unsubscribe function
    const unsubscribe = socketClient.addListener(eventType, callback);
    
    // Cleanup on unmount
    return unsubscribe;
  }, [eventType, callback]);
  
  return {
    isConnected: socketClient.isSocketConnected(),
    reconnect: () => socketClient.reconnect()
  };
}

// Export the singleton instance for direct use
export default socketClient;
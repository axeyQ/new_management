'use client';
import { toast } from 'react-hot-toast';

// WebSocket connection instance
let socket = null;
let reconnectTimer = null;
let isConnecting = false;

// Track connection state and attempts
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 2000; // Start with 2 seconds

// Store event listeners
const listeners = new Map();

/**
 * Initialize WebSocket connection to the server
 */
export const initializeWebSocket = () => {
  // Prevent multiple connection attempts
  if (isConnecting || socket?.readyState === WebSocket.CONNECTING) {
    console.log('WebSocket connection already in progress');
    return;
  }
  
  // Clear existing socket if there is one
  if (socket) {
    try {
      socket.close();
    } catch (error) {
      console.error('Error closing existing WebSocket:', error);
    }
  }
  
  isConnecting = true;
  
  try {
    // Create WebSocket connection
    // Use secure protocol if on HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      isConnecting = false;
      connectionAttempts = 0; // Reset attempts on successful connection
      
      // Notify connection status listeners
      if (listeners.has('connection')) {
        listeners.get('connection').forEach(callback => {
          callback({ connected: true });
        });
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        if (data.type) {
          // Notify registered listeners for this event type
          if (listeners.has(data.type)) {
            listeners.get(data.type).forEach(callback => {
              callback(data);
            });
          }
          
          // Special handling for KOT status changes
          if (data.type === 'kot_status_change') {
            handleKotStatusChange(data);
          }
          
          // Special handling for new orders
          if (data.type === 'new_order' || data.type === 'new_kot') {
            handleNewOrder(data);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onclose = (event) => {
      isConnecting = false;
      
      // Notify connection status listeners
      if (listeners.has('connection')) {
        listeners.get('connection').forEach(callback => {
          callback({ connected: false });
        });
      }
      
      if (event.wasClean) {
        console.log(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
      } else {
        console.warn('WebSocket connection died');
        
        // Only attempt to reconnect if we haven't exceeded the maximum attempts
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          connectionAttempts++;
          
          // Exponential backoff for reconnection
          const delay = BASE_RECONNECT_DELAY * Math.pow(1.5, connectionAttempts - 1);
          console.log(`Attempting to reconnect in ${delay/1000} seconds... (Attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          
          // Clear any existing reconnect timer
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          
          // Set up new reconnect timer
          reconnectTimer = setTimeout(() => {
            initializeWebSocket();
          }, delay);
        } else {
          console.error('Maximum reconnection attempts reached. Please refresh the page to reconnect.');
          toast.error('Connection to kitchen display lost. Please refresh the page.');
        }
      }
    };
    
    socket.onerror = (error) => {
      isConnecting = false;
      console.error('WebSocket error:', error);
    };
    
  } catch (error) {
    isConnecting = false;
    console.error('Error initializing WebSocket:', error);
  }
};

/**
 * Add a listener for WebSocket events
 * @param {string} eventType - The type of event to listen for
 * @param {function} callback - The callback function to call when the event occurs
 * @returns {function} - Function to remove the listener
 */
export const addSocketListener = (eventType, callback) => {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, []);
  }
  
  listeners.get(eventType).push(callback);
  
  // Return unsubscribe function
  return () => {
    if (listeners.has(eventType)) {
      const callbacks = listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  };
};

/**
 * Send a message to the WebSocket server
 * @param {object} data - The data to send
 * @returns {boolean} - Whether the message was sent successfully
 */
export const sendMessage = (data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  } else {
    console.warn('WebSocket is not connected. Message not sent.');
    return false;
  }
};

/**
 * Handle KOT status change events
 */
const handleKotStatusChange = (data) => {
  const { kotId, status, orderNumber } = data;
  
  // Show toast notifications for status changes
  if (status === 'ready') {
    toast.success(`Order #${orderNumber || kotId} is ready!`, {
      duration: 5000,
      icon: '🔔'
    });
    
    // Play sound notification for ready orders
    playNotificationSound('ready');
  } else if (status === 'preparing') {
    toast.info(`Order #${orderNumber || kotId} is now being prepared`, {
      duration: 3000
    });
  }
};

/**
 * Handle new order events
 */
const handleNewOrder = (data) => {
  const { orderNumber, orderType } = data;
  
  toast.success(`New ${orderType || ''} order #${orderNumber} received!`, {
    duration: 5000,
    icon: '🔔'
  });
  
  // Play sound notification for new orders
  playNotificationSound('new');
};

/**
 * Play a notification sound
 */
const playNotificationSound = (type) => {
  try {
    let soundFile;
    
    switch (type) {
      case 'new':
        soundFile = '/sounds/new-order.mp3';
        break;
      case 'ready':
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
};

/**
 * Check if WebSocket is currently connected
 * @returns {boolean} - Whether the WebSocket is connected
 */
export const isWebSocketConnected = () => {
  return socket && socket.readyState === WebSocket.OPEN;
};

/**
 * Force reconnection to the WebSocket server
 */
export const reconnectWebSocket = () => {
  connectionAttempts = 0; // Reset attempts
  initializeWebSocket();
};

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  initializeWebSocket();
}
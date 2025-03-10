// Server-side WebSocket implementation
// This file should be used in your backend Node.js application

const WebSocket = require('ws');

// Store active connections
let wss;
const clients = new Map();

/**
 * Initialize the WebSocket server
 * @param {object} server - HTTP/HTTPS server instance
 */
function initializeWebSocketServer(server) {
  // Create WebSocket server
  wss = new WebSocket.Server({ 
    server,
    // Check for authorization header if you want to secure the connection
    verifyClient: (info) => {
      // Add your authentication logic here if needed
      return true;
    }
  });

  console.log('WebSocket server initialized');

  // Handle new connections
  wss.on('connection', (ws, req) => {
    const clientId = req.headers['sec-websocket-key'] || Date.now().toString();
    
    console.log(`New WebSocket client connected: ${clientId}`);
    
    // Store client connection
    clients.set(clientId, {
      ws,
      isAlive: true,
      clientId,
      connectedAt: new Date()
    });
    
    // Set up ping/pong for connection health check
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle incoming messages from client
    ws.on('message', (messageData) => {
      try {
        const message = JSON.parse(messageData);
        console.log(`Received message from client ${clientId}:`, message);
        
        // Handle different message types
        if (message.type === 'ping') {
          // Send pong response
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
        
        // Add more message handlers as needed
        
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error from client ${clientId}:`, error);
    });
    
    // Send welcome message to client
    ws.send(JSON.stringify({
      type: 'connection',
      connected: true,
      message: 'Connected to kitchen display system'
    }));
  });
  
  // Set up interval to check for dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
}

/**
 * Broadcast a message to all connected clients
 * @param {object} data - Data to broadcast
 * @param {function} filter - Optional filter function to select clients
 */
function broadcastMessage(data, filter = null) {
  if (!wss) {
    console.warn('WebSocket server not initialized. Cannot broadcast message.');
    return;
  }
  
  let count = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Apply filter if provided
      if (filter && !filter(client)) {
        return;
      }
      
      client.send(JSON.stringify(data));
      count++;
    }
  });
  
  console.log(`Broadcast message to ${count} clients:`, data);
}

/**
 * Send a message to a specific client
 * @param {string} clientId - ID of the client to send to
 * @param {object} data - Data to send
 * @returns {boolean} - Whether the message was sent successfully
 */
function sendToClient(clientId, data) {
  const client = clients.get(clientId);
  
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
    return true;
  }
  
  return false;
}

/**
 * Notify KOT status change to all connected clients
 * @param {object} kot - Kitchen Order Ticket object
 * @param {string} status - New status
 */
function notifyKotStatusChange(kot, status) {
  broadcastMessage({
    type: 'kot_status_change',
    kotId: kot._id,
    status,
    orderNumber: kot.kotTokenNum,
    timestamp: new Date().toISOString()
  });
}

/**
 * Notify new order to all connected clients
 * @param {object} order - Order object
 */
function notifyNewOrder(order) {
  broadcastMessage({
    type: 'new_order',
    orderId: order._id,
    orderNumber: order.invoiceNumber,
    orderType: order.orderMode,
    timestamp: new Date().toISOString()
  });
}

/**
 * Notify new KOT to all connected clients
 * @param {object} kot - Kitchen Order Ticket object
 */
function notifyNewKot(kot) {
  broadcastMessage({
    type: 'new_kot',
    kotId: kot._id,
    orderNumber: kot.kotTokenNum,
    orderType: kot.orderMode,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get count of connected clients
 * @returns {number} - Number of connected clients
 */
function getConnectedClientCount() {
  return clients.size;
}

/**
 * Get list of connected clients
 * @returns {Array} - Array of client information objects
 */
function getConnectedClients() {
  return Array.from(clients.values()).map(client => ({
    clientId: client.clientId,
    connectedAt: client.connectedAt
  }));
}

module.exports = {
  initializeWebSocketServer,
  broadcastMessage,
  sendToClient,
  notifyKotStatusChange,
  notifyNewOrder,
  notifyNewKot,
  getConnectedClientCount,
  getConnectedClients
};
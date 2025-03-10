import { Server } from 'socket.io';

// Track active socket.io server instance
let io;

export default function socketHandler(req, res) {
  // If socket server already initialized, skip
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  console.log('Setting up Socket.IO server...');
  
  // Initialize socket.io server
  io = new Server(res.socket.server);
  res.socket.server.io = io;

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Send welcome message to new clients
    socket.emit('connection', { 
      connected: true, 
      message: 'Connected to kitchen display system' 
    });
    
    // Listen for ping messages (health check)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.IO server initialized');
  res.end();
}

// Helper functions for other server components to use

/**
 * Notify all clients about a KOT status change
 */
export const notifyKotStatusChange = (kot, status) => {
  if (!io) return;
  
  io.emit('kot_status_change', {
    type: 'kot_status_change',
    kotId: kot._id,
    status,
    orderNumber: kot.kotTokenNum,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Notified clients of KOT ${kot._id} status change to ${status}`);
};

/**
 * Notify all clients about a new order
 */
export const notifyNewOrder = (order) => {
  if (!io) return;
  
  io.emit('new_order', {
    type: 'new_order',
    orderId: order._id,
    orderNumber: order.invoiceNumber,
    orderType: order.orderMode,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Notified clients of new order ${order._id}`);
};

/**
 * Notify all clients about a new KOT
 */
export const notifyNewKot = (kot) => {
  if (!io) return;
  
  io.emit('new_kot', {
    type: 'new_kot',
    kotId: kot._id,
    orderNumber: kot.kotTokenNum,
    orderType: kot.orderMode,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Notified clients of new KOT ${kot._id}`);
};
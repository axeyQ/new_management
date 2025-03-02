// src/lib/websocket.js
import { Server } from 'socket.io';

let io = null;

export function getSocketIO() {
  return io;
}

export function initializeSocketIO(server) {
  if (io) return io;
  
  // Create new Socket.io server
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  // Create namespace for KDS
  const kdsNamespace = io.of('/kds');
  
  kdsNamespace.on('connection', (socket) => {
    console.log('KDS client connected:', socket.id);
    
    // Join room for a specific order mode
    socket.on('join-mode', (mode) => {
      console.log(`Socket ${socket.id} joined mode: ${mode}`);
      socket.join(`mode-${mode}`);
    });
    
    // Handle KOT status updates from clients
    socket.on('update-kot-status', async (data) => {
      try {
        const { kotId, status } = data;
        if (!kotId || !status) return;
        
        // Broadcast to all clients
        kdsNamespace.emit('kot-status-updated', data);
      } catch (error) {
        console.error('Error handling KOT status update:', error);
      }
    });
    
    // Leave a mode room
    socket.on('leave-mode', (mode) => {
      socket.leave(`mode-${mode}`);
      console.log(`Socket ${socket.id} left mode: ${mode}`);
    });
    
    socket.on('disconnect', () => {
      console.log('KDS client disconnected:', socket.id);
    });
  });
  
  console.log('Socket.io initialized for KDS');
  return io;
}

// Function to emit KOT updates to connected clients
export function emitKotUpdate(kot) {
  if (!io) return false;
  
  const kdsNamespace = io.of('/kds');
  
  // Prepare data to emit
  const kotData = {
    _id: kot._id,
    kotTokenNum: kot.kotTokenNum,
    orderMode: kot.orderMode,
    table: kot.table,
    kotStatus: kot.kotStatus,
    itemCount: kot.items.length,
    createdAt: kot.createdAt,
    updatedAt: kot.updatedAt
  };
  
  // Emit to all clients
  kdsNamespace.emit('kot-new', kotData);
  
  // Emit to specific order mode room if available
  if (kot.orderMode) {
    kdsNamespace.to(`mode-${kot.orderMode}`).emit('kot-new', kotData);
  }
  
  // Also emit to 'all' mode
  kdsNamespace.to('mode-all').emit('kot-new', kotData);
  
  return true;
}

// Function to emit KOT status updates
export function emitKotStatusChange(kotId, status, orderMode = null) {
  if (!io) return false;
  
  const kdsNamespace = io.of('/kds');
  const data = { 
    kotId, 
    status, 
    timestamp: new Date() 
  };
  
  // Emit to all clients
  kdsNamespace.emit('kot-status-updated', data);
  
  // Emit to specific order mode if provided
  if (orderMode) {
    kdsNamespace.to(`mode-${orderMode}`).emit('kot-status-updated', data);
  }
  
  // Also emit to 'all' mode
  kdsNamespace.to('mode-all').emit('kot-status-updated', data);
  
  return true;
}

// Helper function to log WebSocket activity when debugging
export function logSocketActivity(message) {
  const debug = process.env.SOCKET_DEBUG === 'true';
  if (debug) {
    console.log(`[WebSocket] ${message}`);
  }
}
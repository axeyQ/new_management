// src/lib/debug.js
import fs from 'fs';
import path from 'path';

// Helper function to log debug information to a file
// This can help track what's happening in production when errors occur
export async function logDebug(location, data) {
  try {
    // Only log in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    const logDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'api-debug.log');
    const timestamp = new Date().toISOString();
    
    // Format the data as string with good readability
    let dataStr;
    try {
      dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    } catch (err) {
      dataStr = `[Unable to stringify data: ${err.message}]`;
    }
    
    const logEntry = `\n[${timestamp}] ${location}\n${dataStr}\n${'='.repeat(80)}\n`;
    
    // Append to log file
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    // Silent fail for logging - don't crash the app if logging fails
    console.error('Failed to write debug log:', error);
  }
}

// Helper to log API requests for debugging
export async function logAPIRequest(method, path, requestData, responseData, user) {
  await logDebug(`API ${method} ${path}`, {
    timestamp: new Date().toISOString(),
    user: user ? { id: user._id, username: user.username, role: user.role } : 'Unauthenticated',
    request: requestData,
    response: responseData
  });
}
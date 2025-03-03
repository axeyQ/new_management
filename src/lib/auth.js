import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import User from '../models/User';

export function generateToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

export async function verifyAuth(req) {
  try {
    // Log the headers to check if Authorization is coming through
    console.log('Request headers:', req.headers);

    const token = req.headers.get('authorization')?.split(' ')[1];
    console.log('Token from headers:', token ? 'Found' : 'Not found');

    if (!token) {
      return { success: false, message: 'No token provided' };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, message: 'Invalid token' };
  }
}

// Special middleware for routes that need to handle dynamic params safely
export function variantsMiddleware(handler) {
  return async (request, context) => {
    try {
      // Verify auth similarly to your existing authMiddleware
      const authResult = await verifyAuth(request);
      if (!authResult.success) {
        return NextResponse.json(
          { success: false, message: authResult.message },
          { status: 401 }
        );
      }
      
      // Attach the user to the request
      request.user = authResult.user;
      
      // Pass request and context to the handler
      return handler(request, context);
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'Authentication error' },
        { status: 500 }
      );
    }
  };
}

export function authMiddleware(handler) {
  return async (req, ...args) => {
    const authResult = await verifyAuth(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 401 }
      );
    }
    
    req.user = authResult.user;
    return handler(req, ...args);
  };
}

export function roleMiddleware(roles) {
  return (handler) => {
    return async (req, ...args) => {
      const authResult = await verifyAuth(req);
      
      if (!authResult.success) {
        return NextResponse.json(
          { success: false, message: authResult.message },
          { status: 401 }
        );
      }
      
      if (!roles.includes(authResult.user.role)) {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      req.user = authResult.user;
      return handler(req, ...args);
    };
  };
}
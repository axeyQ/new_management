import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { roleMiddleware } from '@/lib/auth';

const handler = async (request) => {
  try {
    const { username, password, role, status } = await request.json();
    
    if (!username || !password || !role || !status) {
      return NextResponse.json(
        { success: false, message: 'Please provide all required fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }
    
    // Create the new user
    const newUser = await User.create({
      username,
      password,
      role,
      status
    });
    
    // Return the new user data (excluding password)
    const userData = {
      id: newUser._id,
      username: newUser.username,
      role: newUser.role,
      status: newUser.status
    };
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: userData
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins can register new users
export const POST = roleMiddleware(['admin'])(handler);
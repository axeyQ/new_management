// src/app/api/offline-reasons/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import OfflineReason from '@/models/OfflineReason';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get all offline reasons
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const isActive = url.searchParams.get('isActive');
    const search = url.searchParams.get('search');
    
    // Build query
    let query = {};
    if (isActive !== null) query.isActive = isActive === 'true';
    
    // Add text search if provided
    if (search) {
      query.$text = { $search: search };
    }
    
    const reasons = await OfflineReason.find(query)
      .sort({ reason: 1 })
      .select('-__v');
      
    return NextResponse.json({
      success: true,
      count: reasons.length,
      data: reasons
    });
  } catch (error) {
    console.error('Error fetching offline reasons:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new offline reason
const createHandler = async (request) => {
  try {
    const reasonData = await request.json();
    
    // Validate required fields
    if (!reasonData.reason) {
      return NextResponse.json(
        { success: false, message: 'Reason is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if reason already exists
    const existingReason = await OfflineReason.findOne({ 
      reason: reasonData.reason 
    });
    
    if (existingReason) {
      return NextResponse.json(
        { success: false, message: 'A reason with this name already exists' },
        { status: 400 }
      );
    }
    
    // Add user info for tracking
    reasonData.createdBy = request.user._id;
    reasonData.updatedBy = request.user._id;
    
    // Create the offline reason
    const reason = await OfflineReason.create(reasonData);
    
    return NextResponse.json({
      success: true,
      message: 'Offline reason created successfully',
      data: reason
    });
  } catch (error) {
    console.error('Error creating offline reason:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Only admins can create offline reasons
export const POST = roleMiddleware(['admin'])(createHandler);
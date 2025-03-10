// src/app/api/outlets/[id]/status/history/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OutletStatusLog from '@/models/OutletStatusLog';
import { authMiddleware } from '@/lib/auth';

// Get status history for an outlet
export const GET = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    // Build query
    let query = { outlet: id };
    
    // Add date filters if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get status logs with pagination
    const logs = await OutletStatusLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username');
      
    // Get total count for pagination
    const total = await OutletStatusLog.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      count: logs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    console.error('Error fetching status history:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
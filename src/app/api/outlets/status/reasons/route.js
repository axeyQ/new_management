// src/app/api/outlets/status/reasons/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import OutletStatusLog from '@/models/OutletStatusLog';
import { authMiddleware } from '@/lib/auth';

// Get most used offline reasons across all outlets
export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    
    // Get query parameters for date range
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Build query for date range
    let query = { status: 'offline' };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Aggregate to get reason usage counts
    const reasonStats = await OutletStatusLog.aggregate([
      { $match: query },
      { $group: {
          _id: '$reason',
          count: { $sum: 1 },
          lastUsed: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
    
    return NextResponse.json({
      success: true,
      count: reasonStats.length,
      data: reasonStats.map(stat => ({
        reason: stat._id,
        count: stat.count,
        lastUsed: stat.lastUsed
      }))
    });
  } catch (error) {
    console.error('Error fetching offline reason stats:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
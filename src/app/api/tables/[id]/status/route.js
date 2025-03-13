// Create a new API endpoint: src/app/api/tables/[id]/status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Table from '@/models/Table';
import { authMiddleware } from '@/lib/auth';

export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params;
    const { status } = await request.json();
    
    await connectDB();
    
    // Convert string status to boolean for the Table model
    const tableStatus = status === 'available' ? true : false;
    
    const table = await Table.findByIdAndUpdate(
      id,
      { $set: { status: tableStatus } },
      { new: true }
    );
    
    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Table not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Table status updated successfully',
      data: table
    });
  } catch (error) {
    console.error('Error updating table status:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
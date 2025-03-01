import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Table from '@/models/Table';
import { roleMiddleware } from '@/lib/auth';

// Get a specific table
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const table = await Table.findById(id)
      .populate('tableType');
    
    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Table not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: table
    });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a table
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { 
      tableName, 
      tableDescription, 
      image, 
      capacity, 
      status,
      tableType,
      positionX,
      positionY
    } = await request.json();
    
    await connectDB();
    
    // Find table
    let table = await Table.findById(id);
    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Table not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (tableName) table.tableName = tableName;
    if (tableDescription !== undefined) table.tableDescription = tableDescription;
    if (image !== undefined) table.image = image;
    if (capacity) table.capacity = capacity;
    if (status !== undefined) table.status = status;
    if (tableType) table.tableType = tableType;
    if (positionX !== undefined) table.positionX = positionX;
    if (positionY !== undefined) table.positionY = positionY;
    
    table.updatedBy = request.user._id;
    table.updatedAt = Date.now();
    
    // Save updated table
    await table.save();
    
    return NextResponse.json({
      success: true,
      message: 'Table updated successfully',
      data: table
    });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete a table
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const table = await Table.findById(id);
    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Table not found' },
        { status: 404 }
      );
    }
    
    // TODO: Check if table has active orders before deleting
    await Table.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete tables
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
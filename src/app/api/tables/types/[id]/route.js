import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TableType from '@/models/TableType';
import { roleMiddleware } from '@/lib/auth';

// Get a specific table type
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const tableType = await TableType.findById(id);
    
    if (!tableType) {
      return NextResponse.json(
        { success: false, message: 'Table type not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tableType
    });
  } catch (error) {
    console.error('Error fetching table type:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a table type
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { tableTypeName, tableTypeDescription } = await request.json();
    
    await connectDB();
    
    // Find table type
    let tableType = await TableType.findById(id);
    if (!tableType) {
      return NextResponse.json(
        { success: false, message: 'Table type not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (tableTypeName) tableType.tableTypeName = tableTypeName;
    if (tableTypeDescription !== undefined) tableType.tableTypeDescription = tableTypeDescription;
    
    tableType.updatedBy = request.user._id;
    tableType.updatedAt = Date.now();
    
    // Save updated table type
    await tableType.save();
    
    return NextResponse.json({
      success: true,
      message: 'Table type updated successfully',
      data: tableType
    });
  } catch (error) {
    console.error('Error updating table type:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete a table type
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const tableType = await TableType.findById(id);
    if (!tableType) {
      return NextResponse.json(
        { success: false, message: 'Table type not found' },
        { status: 404 }
      );
    }
    
    // TODO: Check if table type has tables before deleting
    await TableType.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Table type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting table type:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete table types
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
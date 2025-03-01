import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TableType from '@/models/TableType';
import { roleMiddleware } from '@/lib/auth';

// Get all table types
export const GET = async (request) => {
  try {
    await connectDB();
    const tableTypes = await TableType.find({})
      .sort({ tableTypeName: 1 });
    
    return NextResponse.json({
      success: true,
      count: tableTypes.length,
      data: tableTypes
    });
  } catch (error) {
    console.error('Error fetching table types:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new table type
const createHandler = async (request) => {
  try {
    const { tableTypeName, tableTypeDescription } = await request.json();
    
    if (!tableTypeName) {
      return NextResponse.json(
        { success: false, message: 'Table type name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if table type already exists
    const existingTableType = await TableType.findOne({ tableTypeName });
    if (existingTableType) {
      return NextResponse.json(
        { success: false, message: 'Table type already exists' },
        { status: 400 }
      );
    }
    
    // Create new table type
    const tableType = await TableType.create({
      tableTypeName,
      tableTypeDescription: tableTypeDescription || '',
      createdBy: request.user._id,
      updatedBy: request.user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Table type created successfully',
      data: tableType
    });
  } catch (error) {
    console.error('Error creating table type:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create table types
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);
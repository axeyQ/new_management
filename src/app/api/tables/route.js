import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Table from '@/models/Table';
import TableType from '@/models/TableType';
import { roleMiddleware } from '@/lib/auth';

// Get all tables
export const GET = async (request) => {
  try {
    await connectDB();
    // Get query parameters
    const url = new URL(request.url);
    const typeId = url.searchParams.get('type');
    
    let query = {};
    if (typeId) {
      query.tableType = typeId;
    }
    
    const tables = await Table.find(query)
      .sort({ tableName: 1 })
      .populate('tableType');
    
    return NextResponse.json({
      success: true,
      count: tables.length,
      data: tables
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new table
const createHandler = async (request) => {
  try {
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
    
    if (!tableName) {
      return NextResponse.json(
        { success: false, message: 'Table name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if table already exists
    const existingTable = await Table.findOne({ tableName });
    if (existingTable) {
      return NextResponse.json(
        { success: false, message: 'Table already exists' },
        { status: 400 }
      );
    }
    
    // Check if tableType exists if provided
    if (tableType) {
      const typeExists = await TableType.findById(tableType);
      if (!typeExists) {
        return NextResponse.json(
          { success: false, message: 'Table type not found' },
          { status: 400 }
        );
      }
    }
    
    // Create new table
    const table = await Table.create({
      tableName,
      tableDescription: tableDescription || '',
      image: image || '',
      capacity: capacity || 1,
      status: status !== undefined ? status : true,
      tableType: tableType || null,
      positionX: positionX || 0,
      positionY: positionY || 0,
      createdBy: request.user._id,
      updatedBy: request.user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Table created successfully',
      data: table
    });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create tables
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);
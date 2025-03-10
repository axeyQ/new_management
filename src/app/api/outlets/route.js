// src/app/api/outlets/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get all outlets
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const isActive = url.searchParams.get('isActive');
    
    // Build query
    let query = {};
    if (status) query.currentStatus = status;
    if (isActive) query.isActive = isActive === 'true';

    const outlets = await Outlet.find(query)
      .sort({ name: 1 })
      .select('-__v');
      
    return NextResponse.json({
      success: true,
      count: outlets.length,
      data: outlets
    });
  } catch (error) {
    console.error('Error fetching outlets:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new outlet
const createHandler = async (request) => {
  try {
    const outletData = await request.json();
    // Validate required fields
    if (!outletData.name || !outletData.address) {
      return NextResponse.json(
        { success: false, message: 'Name and address are required' },
        { status: 400 }
      );
    }
    await connectDB();
    // Check if outlet with this name already exists
    const existingOutlet = await Outlet.findOne({ name: outletData.name });
    if (existingOutlet) {
      return NextResponse.json(
        { success: false, message: 'An outlet with this name already exists' },
        { status: 400 }
      );
    }
    
    // Add user info for tracking
    outletData.createdBy = request.user._id;
    outletData.updatedBy = request.user._id;

    // Create the outlet with new fields included (website, vatNumber, gstNumber, logoUrl)
    const outlet = await Outlet.create(outletData);
    return NextResponse.json({
      success: true,
      message: 'Outlet created successfully',
      data: outlet
    });
  } catch (error) {
    console.error('Error creating outlet:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const updateData = await request.json();
    await connectDB();
    // Find outlet
    let outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    // If changing name, check for duplicates
    if (updateData.name && updateData.name !== outlet.name) {
      const nameExists = await Outlet.findOne({ name: updateData.name });
      if (nameExists) {
        return NextResponse.json(
          { success: false, message: 'An outlet with this name already exists' },
          { status: 400 }
        );
      }
    }
    
    // Add user info for tracking
    updateData.updatedBy = request.user._id;
    updateData.updatedAt = Date.now();
    
    // Update the outlet including new fields (website, vatNumber, gstNumber, logoUrl)
    outlet = await Outlet.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Outlet updated successfully',
      data: outlet
    });
  } catch (error) {
    console.error('Error updating outlet:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins can create outlets
export const POST = roleMiddleware(['admin'])(createHandler);
export const PUT = roleMiddleware(['admin'])(updateHandler);

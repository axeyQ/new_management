// src/app/api/outlets/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OperationalHours from '@/models/OperationalHours';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get a specific outlet
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const outlet = await Outlet.findById(id).select('-__v');
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: outlet
    });
  } catch (error) {
    console.error('Error fetching outlet:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update an outlet
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
    
    // Update the outlet
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

// Delete an outlet
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    // Find outlet
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Check if there are any operational hours or status logs associated with this outlet
    // We might want to delete these as well or prevent deletion if data exists
    
    await Outlet.findByIdAndDelete(id);
    
    // Also delete associated operational hours
    await OperationalHours.deleteMany({ outlet: id });
    
    return NextResponse.json({
      success: true,
      message: 'Outlet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting outlet:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins can update or delete outlets
export const PUT = roleMiddleware(['admin'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
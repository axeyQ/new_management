// src/app/api/outlets/[id]/hours/[dayId]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OperationalHours from '@/models/OperationalHours';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get operational hours for a specific day
export const GET = async (request, { params }) => {
  try {
    const { id, dayId } = params;
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Get operational hours for this day
    const hours = await OperationalHours.findOne({
      outlet: id,
      dayOfWeek: parseInt(dayId)
    }).select('-__v');
    
    if (!hours) {
      return NextResponse.json(
        { success: false, message: 'No operational hours set for this day' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: hours
    });
  } catch (error) {
    console.error('Error fetching day\'s operational hours:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update operational hours for a specific day
const updateHandler = async (request, { params }) => {
  try {
    const { id, dayId } = params;
    const updateData = await request.json();
    
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Find hours for this day
    let hours = await OperationalHours.findOne({
      outlet: id,
      dayOfWeek: parseInt(dayId)
    });
    
    if (!hours) {
      return NextResponse.json(
        { success: false, message: 'No operational hours found for this day. Use POST to create.' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (updateData.isOpen !== undefined) hours.isOpen = updateData.isOpen;
    if (updateData.openTime) hours.openTime = updateData.openTime;
    if (updateData.closeTime) hours.closeTime = updateData.closeTime;
    hours.breakStartTime = updateData.breakStartTime || null;
    hours.breakEndTime = updateData.breakEndTime || null;
    
    hours.updatedBy = request.user._id;
    hours.updatedAt = Date.now();
    
    // Save updated hours
    await hours.save();
    
    return NextResponse.json({
      success: true,
      message: 'Operational hours updated successfully',
      data: hours
    });
  } catch (error) {
    console.error('Error updating day\'s operational hours:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Delete operational hours for a specific day
const deleteHandler = async (request, { params }) => {
  try {
    const { id, dayId } = params;
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Delete hours for this day
    const result = await OperationalHours.findOneAndDelete({
      outlet: id,
      dayOfWeek: parseInt(dayId)
    });
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'No operational hours found for this day' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Operational hours deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting day\'s operational hours:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Allow admins and managers to update or delete hours
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
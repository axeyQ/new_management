// src/app/api/outlets/[id]/hours/[dayId]/slots/[slotId]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OperationalHours from '@/models/OperationalHours';
import { variantsMiddleware } from '@/lib/auth';

// Update a specific time slot
export const PUT = variantsMiddleware(async (request, context) => {
  try {
    // Get user from the request (added by variantsMiddleware)
    const user = request.user;
    
    const { params } = context;
    const { id, dayId, slotId } = params;
    
    const { openTime, closeTime } = await request.json();
    
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!openTime || !closeTime) {
      return NextResponse.json(
        { success: false, message: 'Open time and close time are required' },
        { status: 400 }
      );
    }
    
    // Find operational hours for this day
    const hours = await OperationalHours.findOne({
      outlet: id,
      dayOfWeek: parseInt(dayId)
    });
    
    if (!hours) {
      return NextResponse.json(
        { success: false, message: 'No operational hours found for this day' },
        { status: 404 }
      );
    }
    
    // Find the time slot by ID
    const slotIndex = hours.timeSlots.findIndex(slot => slot._id.toString() === slotId);
    
    if (slotIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Time slot not found' },
        { status: 404 }
      );
    }
    
    // Update the time slot
    hours.timeSlots[slotIndex].openTime = openTime;
    hours.timeSlots[slotIndex].closeTime = closeTime;
    hours.updatedBy = user._id;
    hours.updatedAt = Date.now();
    
    // Save the changes
    await hours.save();
    
    return NextResponse.json({
      success: true,
      message: 'Time slot updated successfully',
      data: hours.timeSlots[slotIndex]
    });
  } catch (error) {
    console.error('Error updating time slot:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});

// Delete a specific time slot
export const DELETE = variantsMiddleware(async (request, context) => {
  try {
    const user = request.user;
    const { params } = context;
    const { id, dayId, slotId } = params;
    
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Find operational hours for this day
    const hours = await OperationalHours.findOne({
      outlet: id,
      dayOfWeek: parseInt(dayId)
    });
    
    if (!hours) {
      return NextResponse.json(
        { success: false, message: 'No operational hours found for this day' },
        { status: 404 }
      );
    }
    
    // Find the time slot by ID
    const slotIndex = hours.timeSlots.findIndex(slot => slot._id.toString() === slotId);
    
    if (slotIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Time slot not found' },
        { status: 404 }
      );
    }
    
    // Log the operation
    console.log(`Deleting time slot ${slotId} at index ${slotIndex}`);
    
    // Remove the time slot
    hours.timeSlots.splice(slotIndex, 1);
    hours.updatedBy = user._id;
    hours.updatedAt = Date.now();
    
    // Save the changes
    await hours.save();
    
    return NextResponse.json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
// src/app/api/outlets/[id]/hours/[dayId]/slots/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OperationalHours from '@/models/OperationalHours';
import { variantsMiddleware } from '@/lib/auth';

// Get all time slots for a specific day
export const GET = variantsMiddleware(async (request, context) => {
  try {
    const { params } = context;
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
    }).select('timeSlots openTime closeTime');
    
    if (!hours) {
      return NextResponse.json(
        { success: false, message: 'No operational hours set for this day' },
        { status: 404 }
      );
    }
    
    // Return time slots and legacy open/close times for backward compatibility
    return NextResponse.json({
      success: true,
      data: {
        timeSlots: hours.timeSlots || [],
        openTime: hours.openTime,
        closeTime: hours.closeTime
      }
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Add a new time slot
export const POST = variantsMiddleware(async (request, context) => {
  try {
    // Get user from the request (added by variantsMiddleware)
    const user = request.user;
    
    const { params } = context;
    const { id, dayId } = params;
    
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
    let hours = await OperationalHours.findOne({
      outlet: id,
      dayOfWeek: parseInt(dayId)
    });
    
    if (!hours) {
      // Create new operational hours if it doesn't exist
      hours = new OperationalHours({
        outlet: id,
        dayOfWeek: parseInt(dayId),
        isOpen: true,
        timeSlots: [{ openTime, closeTime }],
        createdBy: user._id,
        updatedBy: user._id
      });
    } else {
      // Add the new time slot
      hours.timeSlots.push({ openTime, closeTime });
      hours.updatedBy = user._id;
      hours.updatedAt = Date.now();
    }
    
    // Save the operational hours
    await hours.save();
    
    return NextResponse.json({
      success: true,
      message: 'Time slot added successfully',
      data: hours.timeSlots[hours.timeSlots.length - 1]
    });
  } catch (error) {
    console.error('Error adding time slot:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
// src/app/api/outlets/[id]/hours/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OperationalHours from '@/models/OperationalHours';
import { variantsMiddleware, roleMiddleware } from '@/lib/auth';

// Get operational hours for an outlet
export const GET = variantsMiddleware(async (request, context) => {
  try {
    const { params } = context;
    const { id } = params;
    
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Get operational hours
    const hours = await OperationalHours.find({ outlet: id })
      .sort({ dayOfWeek: 1 })
      .select('-__v');
      
    return NextResponse.json({
      success: true,
      count: hours.length,
      data: hours
    });
  } catch (error) {
    console.error('Error fetching operational hours:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});

// Add a time slot to a specific day
export const PATCH = variantsMiddleware(async (request, context) => {
  try {
    // Get user from the request (added by variantsMiddleware)
    const user = request.user;
    console.log('User in PATCH handler:', user ? user.username : 'Not available');
    
    const { params } = context;
    const { id } = params;
    const { dayOfWeek, timeSlot } = await request.json();
    
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
    if (dayOfWeek === undefined || !timeSlot || !timeSlot.openTime || !timeSlot.closeTime) {
      return NextResponse.json(
        { success: false, message: 'Day of week and time slot with open/close times are required' },
        { status: 400 }
      );
    }
    
    // Find operational hours for this day
    let hours = await OperationalHours.findOne({ outlet: id, dayOfWeek: parseInt(dayOfWeek) });
    
    if (!hours) {
      // Create new operational hours if it doesn't exist
      hours = new OperationalHours({
        outlet: id,
        dayOfWeek: parseInt(dayOfWeek),
        isOpen: true,
        timeSlots: [timeSlot],
        createdBy: user._id,
        updatedBy: user._id
      });
    } else {
      // Add the new time slot
      hours.timeSlots.push(timeSlot);
      hours.updatedBy = user._id;
      hours.updatedAt = Date.now();
    }
    
    // Save the operational hours
    await hours.save();
    
    return NextResponse.json({
      success: true,
      message: 'Time slot added successfully',
      data: hours
    });
  } catch (error) {
    console.error('Error adding time slot:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});

// Process a role check before handling the PUT request
const checkRole = (roles) => {
  return (handler) => {
    return variantsMiddleware(async (request, context) => {
      // User is already attached by variantsMiddleware
      const user = request.user;
      
      if (!roles.includes(user.role)) {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      // If role check passes, proceed to handler
      return handler(request, context);
    });
  };
};

// Save all hours - requires admin or biller role
export const PUT = checkRole(['admin', 'biller'])(async (request, context) => {
  try {
    // User from request (added by variantsMiddleware and passed through checkRole)
    const user = request.user;
    console.log('User in PUT handler:', user ? user.username : 'Not available');
    
    const { params } = context;
    const { id } = params;
    const { hours } = await request.json();
    
    await connectDB();
    
    // Verify outlet exists
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Validate hours data
    if (!Array.isArray(hours)) {
      return NextResponse.json(
        { success: false, message: 'Hours must be an array' },
        { status: 400 }
      );
    }
    
    // Process each day's hours
    const results = [];
    
    for (const dayHours of hours) {
      // Skip invalid entries
      if (dayHours.dayOfWeek === undefined) {
        continue;
      }
      
      try {
        // Log the time slots for debugging
        console.log(`Processing day ${dayHours.dayOfWeek}:`, 
          dayHours.timeSlots ? `${dayHours.timeSlots.length} slots` : 'No slots');
        
        // Determine if we're using the new timeSlots format or legacy format
        const isUsingTimeSlots = Array.isArray(dayHours.timeSlots) && dayHours.timeSlots.length > 0;
        
        // Prepare the update object
        const updateData = {
          isOpen: dayHours.isOpen !== false,
          updatedBy: user._id,
          updatedAt: Date.now()
        };
        
        // If using timeSlots, add them to the update
        if (isUsingTimeSlots) {
          updateData.timeSlots = dayHours.timeSlots;
          
          // Only clear legacy fields if we're moving to timeSlots
          if (!dayHours.openTime && !dayHours.closeTime) {
            updateData.openTime = null;
            updateData.closeTime = null;
          }
        } else {
          // Otherwise, use the legacy format
          updateData.openTime = dayHours.openTime;
          updateData.closeTime = dayHours.closeTime;
        }
        
        // Find and update or create new
        const result = await OperationalHours.findOneAndUpdate(
          { outlet: id, dayOfWeek: dayHours.dayOfWeek },
          updateData,
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        
        // If this was created via upsert, set createdBy
        if (!result.createdBy) {
          result.createdBy = user._id;
          await result.save();
        }
        
        results.push(result);
      } catch (error) {
        console.error(`Error updating day ${dayHours.dayOfWeek}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Operational hours updated successfully',
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error updating operational hours:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});

// Create - requires admin or biller role
export const POST = checkRole(['admin', 'biller'])(async (request, context) => {
  try {
    const user = request.user;
    const { params } = context;
    const { id } = params;
    
    const hoursData = await request.json();
    
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
    if (hoursData.dayOfWeek === undefined) {
      return NextResponse.json(
        { success: false, message: 'Day of week is required' },
        { status: 400 }
      );
    }
    
    // Check if hours already exist for this day
    const existingHours = await OperationalHours.findOne({
      outlet: id,
      dayOfWeek: hoursData.dayOfWeek
    });
    
    if (existingHours) {
      return NextResponse.json(
        { success: false, message: 'Operational hours already exist for this day. Use PUT to update.' },
        { status: 400 }
      );
    }
    
    // Determine if using timeSlots or legacy format
    const isUsingTimeSlots = Array.isArray(hoursData.timeSlots) && hoursData.timeSlots.length > 0;
    
    // Validate according to the format being used
    if (!isUsingTimeSlots && (!hoursData.openTime || !hoursData.closeTime)) {
      return NextResponse.json(
        { success: false, message: 'Open time and close time are required' },
        { status: 400 }
      );
    }
    
    // Create hours
    const operationalHours = await OperationalHours.create({
      outlet: id,
      dayOfWeek: hoursData.dayOfWeek,
      isOpen: hoursData.isOpen !== false, // Default to true if not specified
      openTime: hoursData.openTime,
      closeTime: hoursData.closeTime,
      timeSlots: hoursData.timeSlots || [],
      createdBy: user._id,
      updatedBy: user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Operational hours created successfully',
      data: operationalHours
    });
  } catch (error) {
    console.error('Error creating operational hours:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
// src/app/api/outlets/[id]/status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Outlet from '@/models/Outlet';
import OutletStatusLog from '@/models/OutletStatusLog';
import { variantsMiddleware } from '@/lib/auth';

// Get current status of an outlet
export const GET = variantsMiddleware(async (request, context) => {
  try {
    const { params } = context;
    const { id } = params;
    
    await connectDB();
    
    const outlet = await Outlet.findById(id)
      .select('name currentStatus currentOfflineReason offlineTimestamp isActive');
      
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Check if outlet has virtual isOpen method
    let isOpen = false;
    if (typeof outlet.isOpen === 'function') {
      isOpen = await outlet.isOpen();
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: outlet._id,
        name: outlet.name,
        currentStatus: outlet.currentStatus,
        currentOfflineReason: outlet.currentOfflineReason,
        offlineTimestamp: outlet.offlineTimestamp,
        isActive: outlet.isActive,
        isOpen: isOpen
      }
    });
  } catch (error) {
    console.error('Error fetching outlet status:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Update outlet status
export const PUT = variantsMiddleware(async (request, context) => {
  try {
    const user = request.user;
    const { params } = context;
    const { id } = params;
    
    // Parse request body
    const requestData = await request.json();
    const { status, reason } = requestData;
    
    console.log('Status update request:', { status, reason });
    
    // Validate input
    if (!status || !['online', 'offline'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Valid status (online/offline) is required' },
        { status: 400 }
      );
    }
    
    // If status is offline, reason is required
    if (status === 'offline' && !reason) {
      return NextResponse.json(
        { success: false, message: 'Reason is required when setting outlet to offline' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find outlet
    const outlet = await Outlet.findById(id);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }
    
    // Update outlet status
    const updateData = {
      currentStatus: status,
      updatedBy: user._id,
      updatedAt: Date.now()
    };
    
    if (status === 'offline') {
      updateData.currentOfflineReason = reason;
      updateData.offlineTimestamp = Date.now();
    } else {
      // If going online, clear offline reason and timestamp
      updateData.currentOfflineReason = null;
      updateData.offlineTimestamp = null;
    }
    
    console.log('Updating outlet with:', updateData);
    
    const updatedOutlet = await Outlet.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    
    // Log status change
    await OutletStatusLog.create({
      outlet: id,
      status: status,
      reason: status === 'offline' ? reason : 'Back online',
      createdBy: user._id
    });
    
    console.log('Updated outlet:', {
      status: updatedOutlet.currentStatus,
      reason: updatedOutlet.currentOfflineReason
    });
    
    return NextResponse.json({
      success: true,
      message: `Outlet status updated to ${status}`,
      data: updatedOutlet
    });
  } catch (error) {
    console.error('Error updating outlet status:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
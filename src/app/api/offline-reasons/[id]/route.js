// src/app/api/offline-reasons/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import OfflineReason from '@/models/OfflineReason';
import OutletStatusLog from '@/models/OutletStatusLog';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get a specific offline reason
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const reason = await OfflineReason.findById(id).select('-__v');
    
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'Offline reason not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: reason
    });
  } catch (error) {
    console.error('Error fetching offline reason:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update an offline reason
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    await connectDB();
    
    // Find reason
    let reason = await OfflineReason.findById(id);
    
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'Offline reason not found' },
        { status: 404 }
      );
    }
    
    // If changing reason text, check for duplicates
    if (updateData.reason && updateData.reason !== reason.reason) {
      const reasonExists = await OfflineReason.findOne({ 
        reason: updateData.reason 
      });
      
      if (reasonExists) {
        return NextResponse.json(
          { success: false, message: 'An offline reason with this name already exists' },
          { status: 400 }
        );
      }
    }
    
    // Add user info for tracking
    updateData.updatedBy = request.user._id;
    updateData.updatedAt = Date.now();
    
    // Update the reason
    reason = await OfflineReason.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Offline reason updated successfully',
      data: reason
    });
  } catch (error) {
    console.error('Error updating offline reason:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete an offline reason
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    // Find the reason
    const reason = await OfflineReason.findById(id);
    
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'Offline reason not found' },
        { status: 404 }
      );
    }
    
    // Check if reason is used in any outlet status logs
    const isUsed = await OutletStatusLog.exists({ 
      reason: reason.reason 
    });
    
    if (isUsed) {
      // Instead of deleting, maybe just mark as inactive
      reason.isActive = false;
      reason.updatedBy = request.user._id;
      reason.updatedAt = Date.now();
      await reason.save();
      
      return NextResponse.json({
        success: true,
        message: 'Offline reason is in use and has been marked as inactive',
        data: reason
      });
    }
    
    // Delete the reason if not used
    await OfflineReason.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Offline reason deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting offline reason:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins can update or delete offline reasons
export const PUT = roleMiddleware(['admin'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
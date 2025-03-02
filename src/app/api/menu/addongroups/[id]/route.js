// src/app/api/menu/addongroups/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOnGroup from '@/models/AddOnGroup';
import AddOn from '@/models/AddOn';
import { roleMiddleware } from '@/lib/auth';

// Get a specific addon group
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const addonGroup = await AddOnGroup.findById(id)
      .populate('addOns')
      .populate('availabilityStatus');
    
    if (!addonGroup) {
      return NextResponse.json(
        { success: false, message: 'Add-on group not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: addonGroup
    });
  } catch (error) {
    console.error('Error fetching addon group:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update an addon group
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { name, availabilityStatus } = await request.json();
    
    await connectDB();
    
    // Find addon group
    let addonGroup = await AddOnGroup.findById(id);
    if (!addonGroup) {
      return NextResponse.json(
        { success: false, message: 'Add-on group not found' },
        { status: 404 }
      );
    }
    
    // Check if name is being changed and if it already exists
    if (name && name !== addonGroup.name) {
      const existingGroup = await AddOnGroup.findOne({ name });
      if (existingGroup) {
        return NextResponse.json(
          { success: false, message: 'Add-on group with this name already exists' },
          { status: 400 }
        );
      }
    }
    
    // Update fields
    if (name) addonGroup.name = name;
    if (availabilityStatus !== undefined) addonGroup.availabilityStatus = availabilityStatus;
    
    addonGroup.updatedBy = request.user._id;
    addonGroup.updatedAt = Date.now();
    
    // Save updated addon group
    await addonGroup.save();
    
    return NextResponse.json({
      success: true,
      message: 'Add-on group updated successfully',
      data: addonGroup
    });
  } catch (error) {
    console.error('Error updating addon group:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete an addon group
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const addonGroup = await AddOnGroup.findById(id);
    if (!addonGroup) {
      return NextResponse.json(
        { success: false, message: 'Add-on group not found' },
        { status: 404 }
      );
    }
    
    // Check if there are addon items associated with this group
    if (addonGroup.addOns && addonGroup.addOns.length > 0) {
      // Option 1: Fail if addons exist
      // return NextResponse.json(
      //   { success: false, message: 'Cannot delete group with active add-ons' },
      //   { status: 400 }
      // );
      
      // Option 2: Remove the association but keep the addons
      // Don't delete addons, but remove their associations
    }
    
    // Delete the addon group
    await AddOnGroup.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Add-on group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting addon group:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete addon groups
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
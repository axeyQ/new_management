// src/app/api/menu/addons/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOn from '@/models/AddOn';
import AddOnGroup from '@/models/AddOnGroup';
import { roleMiddleware } from '@/lib/auth';

// Get a specific addon
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const addon = await AddOn.findById(id)
      .populate('availabilityStatus')
      .populate('dishReference');
    
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: addon
    });
  } catch (error) {
    console.error('Error fetching addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update an addon
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { name, price, addonGroupId, availabilityStatus, dishReference } = await request.json();
    
    await connectDB();
    
    // Find addon
    let addon = await AddOn.findById(id);
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (name) addon.name = name;
    if (price !== undefined) addon.price = price;
    if (availabilityStatus !== undefined) addon.availabilityStatus = availabilityStatus;
    if (dishReference !== undefined) addon.dishReference = dishReference || null;
    
    // Save updated addon
    await addon.save();
    
    // Handle group change if needed
    if (addonGroupId) {
      // Find all groups that have this addon
      const groups = await AddOnGroup.find({ addOns: id });
      
      // If the addon is already in the requested group, no need to change
      const alreadyInRequestedGroup = groups.some(g => g._id.toString() === addonGroupId);
      
      if (!alreadyInRequestedGroup) {
        // Remove from current groups
        for (const group of groups) {
          group.addOns = group.addOns.filter(
            addonId => addonId.toString() !== id
          );
          await group.save();
        }
        
        // Add to new group
        const newGroup = await AddOnGroup.findById(addonGroupId);
        if (newGroup) {
          newGroup.addOns.push(id);
          await newGroup.save();
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Add-on updated successfully',
      data: addon
    });
  } catch (error) {
    console.error('Error updating addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete an addon
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const addon = await AddOn.findById(id);
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    // Remove addon from any groups
    await AddOnGroup.updateMany(
      { addOns: id },
      { $pull: { addOns: id } }
    );
    
    // Delete the addon
    await AddOn.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Add-on deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete addons
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
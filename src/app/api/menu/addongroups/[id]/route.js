import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOnGroup from '@/models/AddOnGroup';
import AddOn from '@/models/AddOn';
import { roleMiddleware } from '@/lib/auth';
import { getStatusIdFromBoolean } from '@/utils/statusHelper';

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
    const { 
      name, 
      availabilityStatus, // This will be a boolean from the form
      isCompulsory, 
      minSelection, 
      maxSelection,
      allowMultiple,
      maxQuantityPerItem 
    } = await request.json();
    
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
    
    // Convert availability boolean to Status ObjectId if it's provided
    if (availabilityStatus !== undefined) {
      const statusId = await getStatusIdFromBoolean(availabilityStatus);
      addonGroup.availabilityStatus = statusId;
    }
    
    // Update new fields
    if (isCompulsory !== undefined) addonGroup.isCompulsory = isCompulsory;
    if (minSelection !== undefined) addonGroup.minSelection = minSelection;
    if (maxSelection !== undefined) addonGroup.maxSelection = maxSelection;
    if (allowMultiple !== undefined) addonGroup.allowMultiple = allowMultiple;
    if (maxQuantityPerItem !== undefined) addonGroup.maxQuantityPerItem = maxQuantityPerItem;
    
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
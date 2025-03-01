import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOnGroup from '@/models/AddOnGroup';
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
        { success: false, message: 'Addon group not found' },
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
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Addon group name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find addon group
    let addonGroup = await AddOnGroup.findById(id);
    
    if (!addonGroup) {
      return NextResponse.json(
        { success: false, message: 'Addon group not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    addonGroup.name = name;
    addonGroup.updatedBy = request.user._id;
    addonGroup.updatedAt = Date.now();
    
    // Save updated addon group
    await addonGroup.save();
    
    return NextResponse.json({
      success: true,
      message: 'Addon group updated successfully',
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
        { success: false, message: 'Addon group not found' },
        { status: 404 }
      );
    }
    
    // TODO: Check if addon group has addons before deleting
    
    await AddOnGroup.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Addon group deleted successfully'
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
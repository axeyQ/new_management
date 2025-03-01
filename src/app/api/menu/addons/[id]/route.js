import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOn from '@/models/AddOn';
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
        { success: false, message: 'Addon not found' },
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
    const { name, price, availabilityStatus, dishReference } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Addon name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find addon
    let addon = await AddOn.findById(id);
    
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Addon not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    addon.name = name;
    if (price !== undefined) addon.price = price;
    if (availabilityStatus) addon.availabilityStatus = availabilityStatus;
    if (dishReference) addon.dishReference = dishReference;
    
    // Save updated addon
    await addon.save();
    
    return NextResponse.json({
      success: true,
      message: 'Addon updated successfully',
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
        { success: false, message: 'Addon not found' },
        { status: 404 }
      );
    }
    
    // TODO: Remove addon from its group
    
    await AddOn.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Addon deleted successfully'
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
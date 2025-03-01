import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Variant from '@/models/Variant';
import { roleMiddleware } from '@/lib/auth';

// Get a specific variant
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const variant = await Variant.findById(id)
      .populate('availabilityStatus')
      .populate('discountStatus');
    
    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: variant
    });
  } catch (error) {
    console.error('Error fetching variant:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a variant
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    await connectDB();
    
    // Find variant
    let variant = await Variant.findById(id);
    
    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }
    
    // Add user info
    updateData.updatedBy = request.user._id;
    updateData.updatedAt = Date.now();
    
    // Update the variant
    variant = await Variant.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Variant updated successfully',
      data: variant
    });
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete a variant
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const variant = await Variant.findById(id);
    
    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }
    
    // Remove variant from dish
    // You may need to find the dish this variant belongs to
    
    await Variant.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete variants
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
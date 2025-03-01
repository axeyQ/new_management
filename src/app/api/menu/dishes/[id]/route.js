import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import { roleMiddleware } from '@/lib/auth';

// Get a specific dish
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const dish = await Dish.findById(id)
      .populate('subCategory')
      .populate('variations')
      .populate('availabilityStatus')
      .populate('discountStatus')
      .populate('addOns');
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: dish
    });
  } catch (error) {
    console.error('Error fetching dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a dish
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    await connectDB();
    
    // Find dish
    let dish = await Dish.findById(id);
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    // Add user info
    updateData.updatedBy = request.user._id;
    updateData.updatedAt = Date.now();
    
    // Update the dish
    dish = await Dish.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Dish updated successfully',
      data: dish
    });
  } catch (error) {
    console.error('Error updating dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete a dish
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const dish = await Dish.findById(id);
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    await Dish.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Dish deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete dishes
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
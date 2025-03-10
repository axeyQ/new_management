// src/app/api/menu/dishes/[id]/stock/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import { roleMiddleware } from '@/lib/auth';

// Update dish stock status - simplified version
const updateStockHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { isOutOfStock } = await request.json();
    
    await connectDB();
    
    // Find dish
    let dish = await Dish.findById(id);
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    // Update stock status - simplified, just toggles isOutOfStock
    const updateResult = await Dish.findByIdAndUpdate(
      id,
      {
        $set: {
          'stockStatus.isOutOfStock': isOutOfStock,
          'stockStatus.lastStockUpdate': new Date(),
          'stockStatus.lastStockUpdateBy': request.user._id
        }
      },
      { new: true, runValidators: false }
    );
    
    if (!updateResult) {
      return NextResponse.json(
        { success: false, message: 'Failed to update dish' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Dish ${isOutOfStock ? 'marked as out of stock' : 'marked as in stock'} successfully`,
      data: updateResult
    });
  } catch (error) {
    console.error('Error updating dish stock status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
        errors: error.errors,
        _message: error.message
      },
      { status: 500 }
    );
  }
};

// Only admins, billers, and captains can update stock status
export const PUT = roleMiddleware(['admin', 'biller', 'captain'])(updateStockHandler);
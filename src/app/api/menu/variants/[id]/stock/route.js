// src/app/api/menu/variants/[id]/stock/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Variant from '@/models/Variant';
import { roleMiddleware } from '@/lib/auth';

// Update variant stock status - simplified version
const updateStockHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { isOutOfStock } = await request.json();
    
    await connectDB();
    
    // Find variant
    let variant = await Variant.findById(id);
    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }
    
    // Update stock status - simplified, just toggles isOutOfStock
    const updateResult = await Variant.findByIdAndUpdate(
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
        { success: false, message: 'Failed to update variant' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Variant ${isOutOfStock ? 'marked as out of stock' : 'marked as in stock'} successfully`,
      data: updateResult
    });
  } catch (error) {
    console.error('Error updating variant stock status:', error);
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
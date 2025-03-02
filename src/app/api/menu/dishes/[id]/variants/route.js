// src/app/api/menu/dishes/[id]/variants/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import Variant from '@/models/Variant';
import { authMiddleware } from '@/lib/auth';

// Get variants for a specific dish
export const GET = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    // Find the dish with populated variants
    const dish = await Dish.findById(id).populate('variations');
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      count: dish.variations?.length || 0,
      data: dish.variations || []
    });
  } catch (error) {
    console.error('Error fetching dish variants:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
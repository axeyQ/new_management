// src/app/api/menu/dishes/[id]/variants/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import { verifyAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    );
  }
  
  try {
    // Connect to database
    await connectDB();
    
    // Get dish ID from the route params
    const { id } = params;
    
    // Find the dish and populate its variations
    const dish = await Dish.findById(id).populate('variations');
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    // Return the variations
    return NextResponse.json({
      success: true,
      data: dish.variations || []
    });
  } catch (error) {
    console.error('Error fetching dish variants:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
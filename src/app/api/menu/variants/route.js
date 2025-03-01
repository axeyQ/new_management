import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Variant from '@/models/Variant';
import Dish from '@/models/Dish';
import { roleMiddleware } from '@/lib/auth';

// Get all variants
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const dishId = url.searchParams.get('dish');
    
    let query = {};
    
    const variants = await Variant.find(query)
      .sort({ variantName: 1 })
      .populate('availabilityStatus')
      .populate('discountStatus');
    
    return NextResponse.json({
      success: true,
      count: variants.length,
      data: variants
    });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new variant
const createHandler = async (request) => {
  try {
    const variantData = await request.json();
    const { variantName, dishId } = variantData;
    
    if (!variantName || !dishId) {
      return NextResponse.json(
        { success: false, message: 'Variant name and dish ID are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if dish exists
    const dish = await Dish.findById(dishId);
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    // Check if variant already exists
    const existingVariant = await Variant.findOne({ variantName });
    
    if (existingVariant) {
      return NextResponse.json(
        { success: false, message: 'Variant already exists' },
        { status: 400 }
      );
    }
    
    // Add user info
    variantData.createdBy = request.user._id;
    variantData.updatedBy = request.user._id;
    
    // Create new variant
    const variant = await Variant.create(variantData);
    
    // Add variant to dish
    await Dish.findByIdAndUpdate(
      dishId,
      { $push: { variations: variant._id } }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Variant created successfully',
      data: variant
    });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create variants
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);
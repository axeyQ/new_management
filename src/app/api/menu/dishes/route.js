import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import SubCategory from '@/models/SubCategory';
import { roleMiddleware } from '@/lib/auth';

// Get all dishes
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const subcategoryId = url.searchParams.get('subcategory');
    
    let query = {};
    if (subcategoryId) {
      query.subCategory = subcategoryId;
    }
    
    const dishes = await Dish.find(query)
      .sort({ dishName: 1 })
      .populate('subCategory')
      .populate('availabilityStatus')
      .populate('discountStatus');
    
    return NextResponse.json({
      success: true,
      count: dishes.length,
      data: dishes
    });
  } catch (error) {
    console.error('Error fetching dishes:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new dish
const createHandler = async (request) => {
  try {
    const dishData = await request.json();
    
    if (!dishData.dishName || !dishData.subCategory || dishData.subCategory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Dish name and at least one subcategory are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if dish already exists
    const existingDish = await Dish.findOne({ dishName: dishData.dishName });
    
    if (existingDish) {
      return NextResponse.json(
        { success: false, message: 'Dish already exists' },
        { status: 400 }
      );
    }
    
    // Add user info
    dishData.createdBy = request.user._id;
    dishData.updatedBy = request.user._id;
    
    // Create new dish
    const dish = await Dish.create(dishData);
    
    return NextResponse.json({
      success: true,
      message: 'Dish created successfully',
      data: dish
    });
  } catch (error) {
    console.error('Error creating dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create dishes
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);
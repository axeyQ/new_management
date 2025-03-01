import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get all categories
export const GET = async (request) => {
  try {
    await connectDB();
    
    const categories = await Category.find({})
      .sort({ categoryName: 1 })
      .populate('categoryStatus');
    
    return NextResponse.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new category
const createHandler = async (request) => {
  try {
    console.log('Category create handler called');
    console.log('Request auth header:', request.headers.get('authorization'));
    const { categoryName, image, parentCategory } = await request.json();
    console.log('Category data received:', { categoryName, image, parentCategory });

    if (!categoryName) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ categoryName });
    
    if (existingCategory) {
      return NextResponse.json(
        { success: false, message: 'Category already exists' },
        { status: 400 }
      );
    }
    
    // Create new category
    const category = await Category.create({
      categoryName,
      image: image || '',
      parentCategory: parentCategory || 'food',
      createdBy: request.user._id,
      updatedBy: request.user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' + error.message},
      { status: 500 }
    );
  }
};

// Only admins and billers can create categories
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);
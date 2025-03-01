import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SubCategory from '@/models/SubCategory';
import Category from '@/models/Category';
import { roleMiddleware } from '@/lib/auth';

// Get all subcategories
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('category');
    
    let query = {};
    if (categoryId) {
      query.category = categoryId;
    }
    
    const subcategories = await SubCategory.find(query)
      .sort({ subCategoryName: 1 })
      .populate('category')
      .populate('subCategoryStatus')
      .populate('discountStatus')
      .populate('availabilityStatus');
    
    return NextResponse.json({
      success: true,
      count: subcategories.length,
      data: subcategories
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new subcategory
const createHandler = async (request) => {
  try {
    const { subCategoryName, image, category } = await request.json();
    
    if (!subCategoryName || !category) {
      return NextResponse.json(
        { success: false, message: 'Subcategory name and category are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if parent category exists
    const categoryExists = await Category.findById(category);
    
    if (!categoryExists) {
      return NextResponse.json(
        { success: false, message: 'Parent category not found' },
        { status: 404 }
      );
    }
    
    // Check if subcategory already exists
    const existingSubCategory = await SubCategory.findOne({ subCategoryName });
    
    if (existingSubCategory) {
      return NextResponse.json(
        { success: false, message: 'Subcategory already exists' },
        { status: 400 }
      );
    }
    
    // Create new subcategory
    const subcategory = await SubCategory.create({
      subCategoryName,
      image: image || '',
      category,
      createdBy: request.user._id,
      updatedBy: request.user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Subcategory created successfully',
      data: subcategory
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create subcategories
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);
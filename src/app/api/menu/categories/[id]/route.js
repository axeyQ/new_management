import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { roleMiddleware } from '@/lib/auth';

// Get a specific category
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const category = await Category.findById(id)
      .populate('categoryStatus')
      .populate('discountStatus');
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a category
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { categoryName, image, parentCategory, categoryStatus, discountStatus } = await request.json();
    
    await connectDB();
    
    // Find category
    let category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (categoryName) category.categoryName = categoryName;
    if (image !== undefined) category.image = image;
    if (parentCategory) category.parentCategory = parentCategory;
    if (categoryStatus) category.categoryStatus = categoryStatus;
    if (discountStatus) category.discountStatus = discountStatus;
    
    category.updatedBy = request.user._id;
    category.updatedAt = Date.now();
    
    // Save updated category
    await category.save();
    
    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete a category
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }
    
    // TODO: Check if category has subcategories before deleting
    
    await Category.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete categories
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
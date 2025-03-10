import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SubCategory from '@/models/SubCategory';
import { roleMiddleware } from '@/lib/auth';

// Get a specific subcategory
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const subcategory = await SubCategory.findById(id)
      .populate('category')
      .populate('subCategoryStatus')
      .populate('discountStatus')
      .populate('availabilityStatus');
    
    if (!subcategory) {
      return NextResponse.json(
        { success: false, message: 'Subcategory not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a subcategory
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const {
      subCategoryName,
      image,
      category,
      subCategoryStatus,
      discountStatus,
      availabilityStatus,
      outOfStock,
      outOfStockType,
      outOfStockUntil,
      outOfStockReason
    } = await request.json();
    
    console.log('Update request data:', { 
      outOfStock, 
      outOfStockType, 
      outOfStockUntil, 
      outOfStockReason 
    });
    
    await connectDB();
    
    // Find subcategory
    let subcategory = await SubCategory.findById(id);
    if (!subcategory) {
      return NextResponse.json(
        { success: false, message: 'Subcategory not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (subCategoryName) subcategory.subCategoryName = subCategoryName;
    if (image !== undefined) subcategory.image = image;
    if (category) subcategory.category = category;
    if (subCategoryStatus) subcategory.subCategoryStatus = subCategoryStatus;
    if (discountStatus) subcategory.discountStatus = discountStatus;
    if (availabilityStatus) subcategory.availabilityStatus = availabilityStatus;
    
    // Update out of stock fields - add console logging to debug
    if (outOfStock !== undefined) {
      console.log('Setting outOfStock to:', outOfStock);
      subcategory.outOfStock = outOfStock;
    }
    if (outOfStockType !== undefined) {
      console.log('Setting outOfStockType to:', outOfStockType);
      subcategory.outOfStockType = outOfStockType;
    }
    if (outOfStockUntil !== undefined) {
      console.log('Setting outOfStockUntil to:', outOfStockUntil);
      subcategory.outOfStockUntil = outOfStockUntil;
    }
    if (outOfStockReason !== undefined) {
      console.log('Setting outOfStockReason to:', outOfStockReason);
      subcategory.outOfStockReason = outOfStockReason;
    }
    
    subcategory.updatedBy = request.user._id;
    subcategory.updatedAt = Date.now();
    
    // Save updated subcategory
    const updatedSubcategory = await subcategory.save();
    console.log('Updated subcategory:', updatedSubcategory);
    
    return NextResponse.json({
      success: true,
      message: 'Subcategory updated successfully',
      data: updatedSubcategory
    });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Delete a subcategory
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const subcategory = await SubCategory.findById(id);
    
    if (!subcategory) {
      return NextResponse.json(
        { success: false, message: 'Subcategory not found' },
        { status: 404 }
      );
    }
    
    // TODO: Check if subcategory has dishes before deleting
    
    await SubCategory.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete subcategories
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
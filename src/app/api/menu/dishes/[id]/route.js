import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import { roleMiddleware } from '@/lib/auth';
import Variant from '@/models/Variant';

// Get a specific dish
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const dish = await Dish.findById(id)
      .populate('subCategory')
      .populate('variations')
      .populate('availabilityStatus')
      .populate('discountStatus')
      .populate('addOns');
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: dish
    });
  } catch (error) {
    console.error('Error fetching dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a dish
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    await connectDB();
    
    // Find dish
    let dish = await Dish.findById(id);
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    if (updateData.variations) {
      const { variations, ...mainDishData } = updateData;
      
      // Process each variant
      const variantPromises = variations.map(async (variant) => {
        if (variant._id && !variant._id.startsWith('temp-')) {
          // Update existing variant
          await Variant.findByIdAndUpdate(variant._id, {
            ...variant,
            updatedBy: request.user._id,
            updatedAt: Date.now()
          });
          return variant._id;
        } else {
          // Create new variant
          const variantData = {
            ...variant,
            dishReference: id,
            createdBy: request.user._id,
            updatedBy: request.user._id
          };
          delete variantData._id; // Remove temporary ID
          
          const newVariant = await Variant.create(variantData);
          return newVariant._id;
        }
      });
      
      // Get updated variant IDs
      const updatedVariantIds = await Promise.all(variantPromises);
      
      // Find removed variants
      const removedVariantIds = dish.variations
        .filter(existingId => !variations.some(v => v._id === existingId.toString()));
      
      // Delete removed variants
      if (removedVariantIds.length > 0) {
        await Variant.deleteMany({ _id: { $in: removedVariantIds } });
      }
      
      // Update dish with new variant list
      dish.variations = updatedVariantIds;
      
      // Update other dish fields
      Object.keys(mainDishData).forEach(key => {
        dish[key] = mainDishData[key];
      });
    } else {
      // Update dish fields without touching variants
      Object.keys(updateData).forEach(key => {
        dish[key] = updateData[key];
      });
    }
    // Add user info
    updateData.updatedBy = request.user._id;
    updateData.updatedAt = Date.now();
    
    // Update the dish
    dish = await Dish.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Dish updated successfully',
      data: dish
    });
  } catch (error) {
    console.error('Error updating dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete a dish
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const dish = await Dish.findById(id);
    
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    await Dish.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Dish deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete dishes
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
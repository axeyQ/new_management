// src/app/api/menu/addons/[id]/route.js - Updated to handle variant references
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOn from '@/models/AddOn';
import Dish from '@/models/Dish';
import Variant from '@/models/Variant';
import { roleMiddleware } from '@/lib/auth';

// Get a specific addon
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const addon = await AddOn.findById(id)
      .populate('dishReference', 'dishName image dieteryTag')
      .populate('variantReference', 'variantName');
      
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: addon
    });
  } catch (error) {
    console.error('Error fetching addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update an addon
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { name, price, availabilityStatus, dishReference, variantReference } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Add-on name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find addon
    let addon = await AddOn.findById(id);
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    // If changing dish/variant references, validate them
    if ((dishReference && dishReference !== addon.dishReference?.toString()) || 
        (variantReference && variantReference !== addon.variantReference?.toString())) {
          
      // Check if dish exists
      if (dishReference) {
        const dish = await Dish.findById(dishReference);
        if (!dish) {
          return NextResponse.json(
            { success: false, message: 'Referenced dish not found' },
            { status: 404 }
          );
        }
        
        // If variant is specified, verify it exists and belongs to this dish
        if (variantReference) {
          const variant = await Variant.findById(variantReference);
          if (!variant) {
            return NextResponse.json(
              { success: false, message: 'Referenced variant not found' },
              { status: 404 }
            );
          }
          
          // Verify the variant belongs to the dish
          const variantBelongsToDish = dish.variations && dish.variations.some(
            v => v.toString() === variantReference.toString()
          );
          
          if (!variantBelongsToDish) {
            return NextResponse.json(
              { success: false, message: 'Variant does not belong to the selected dish' },
              { status: 400 }
            );
          }
        }
      }
    }
    
    // Update fields
    addon.name = name;
    if (price !== undefined) addon.price = price;
    if (availabilityStatus !== undefined) addon.availabilityStatus = availabilityStatus;
    if (dishReference !== undefined) addon.dishReference = dishReference || null;
    if (variantReference !== undefined) addon.variantReference = variantReference || null;
    
    // Save updated addon
    await addon.save();
    
    // Return populated addon
    const updatedAddon = await AddOn.findById(id)
      .populate('dishReference', 'dishName image dieteryTag')
      .populate('variantReference', 'variantName');
      
    return NextResponse.json({
      success: true,
      message: 'Add-on updated successfully',
      data: updatedAddon
    });
  } catch (error) {
    console.error('Error updating addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete an addon
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const addon = await AddOn.findById(id);
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    // Remove add-on from any groups that reference it
    await AddOnGroup.updateMany(
      { addOns: id },
      { $pull: { addOns: id } }
    );
    
    // Delete the add-on
    await AddOn.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Add-on deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Make sure to import the model
import AddOnGroup from '@/models/AddOnGroup';

// Only admins and billers can update or delete addons
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
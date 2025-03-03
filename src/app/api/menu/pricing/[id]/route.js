// src/app/api/menu/pricing/[id]/route.js - Updated to handle variants
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import MenuPricing from '@/models/MenuPricing';
import { roleMiddleware } from '@/lib/auth';

// Get a specific pricing item
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const pricingItem = await MenuPricing.findById(id)
      .populate('dish', 'dishName image dieteryTag')
      .populate('variant', 'variantName');
      
    if (!pricingItem) {
      return NextResponse.json(
        { success: false, message: 'Pricing item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: pricingItem
    });
  } catch (error) {
    console.error('Error fetching pricing item:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update pricing item
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { price, taxSlab, taxRate, isAvailable } = await request.json();
    
    await connectDB();
    
    // Find pricing item
    let pricingItem = await MenuPricing.findById(id);
    if (!pricingItem) {
      return NextResponse.json(
        { success: false, message: 'Pricing item not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (price !== undefined) {
      pricingItem.price = price;
      // Recalculate tax and final price
      const taxAmount = (price * (taxRate || pricingItem.taxRate)) / 100;
      pricingItem.taxAmount = taxAmount;
      pricingItem.finalPrice = price + taxAmount;
    }
    
    if (taxSlab !== undefined) pricingItem.taxSlab = taxSlab;
    if (taxRate !== undefined) {
      pricingItem.taxRate = taxRate;
      // Recalculate tax amount and final price if price exists
      if (pricingItem.price) {
        const taxAmount = (pricingItem.price * taxRate) / 100;
        pricingItem.taxAmount = taxAmount;
        pricingItem.finalPrice = pricingItem.price + taxAmount;
      }
    }
    
    if (isAvailable !== undefined) pricingItem.isAvailable = isAvailable;
    
    pricingItem.updatedBy = request.user._id;
    pricingItem.updatedAt = Date.now();
    
    // Save updated pricing item
    await pricingItem.save();
    
    // Return populated pricing item
    const populatedPricing = await MenuPricing.findById(id)
      .populate('dish', 'dishName image dieteryTag')
      .populate('variant', 'variantName');
      
    return NextResponse.json({
      success: true,
      message: 'Pricing item updated successfully',
      data: populatedPricing
    });
  } catch (error) {
    console.error('Error updating pricing item:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Delete pricing item
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    // Find pricing item
    const pricingItem = await MenuPricing.findById(id);
    if (!pricingItem) {
      return NextResponse.json(
        { success: false, message: 'Pricing item not found' },
        { status: 404 }
      );
    }
    
    // Remove from any menus that reference it
    await Menu.updateMany(
      { dishPricing: id },
      { $pull: { dishPricing: id } }
    );
    
    // Delete pricing item
    await MenuPricing.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Pricing item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pricing item:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete pricing items
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);
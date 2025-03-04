import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuAddonPricing from '@/models/MenuAddonPricing';
import { roleMiddleware } from '@/lib/auth';

// Get a specific addon pricing
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const pricingItem = await MenuAddonPricing.findById(id)
      .populate('menu', 'name orderMode')
      .populate({
        path: 'addon',
        populate: [
          { path: 'dishReference', select: 'dishName' },
          { path: 'variantReference', select: 'variantName' }
        ]
      });
      
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

// Update addon pricing
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { price, taxSlab, taxRate, isAvailable } = await request.json();
    
    await connectDB();
    
    // Find pricing item
    let pricingItem = await MenuAddonPricing.findById(id);
    if (!pricingItem) {
      return NextResponse.json(
        { success: false, message: 'Pricing item not found' },
        { status: 404 }
      );
    }
    
    // Check if menu is Zomato
    const menu = await MenuAddonPricing.findById(id).populate('menu');
    if (menu && menu.menu && menu.menu.orderMode !== 'Zomato') {
      return NextResponse.json(
        { success: false, message: 'Add-ons are only available for Zomato ordering mode' },
        { status: 400 }
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
    
    pricingItem.updatedBy = request.user?._id;
    pricingItem.updatedAt = Date.now();
    
    // Save updated pricing item
    await pricingItem.save();
    
    // Return populated pricing item
    const populatedPricing = await MenuAddonPricing.findById(id)
      .populate('menu', 'name')
      .populate({
        path: 'addon',
        populate: [
          { path: 'dishReference', select: 'dishName' },
          { path: 'variantReference', select: 'variantName' }
        ]
      });
      
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

// Delete addon pricing
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    // Find pricing item
    const pricingItem = await MenuAddonPricing.findById(id);
    if (!pricingItem) {
      return NextResponse.json(
        { success: false, message: 'Pricing item not found' },
        { status: 404 }
      );
    }
    
    // Delete pricing item
    await MenuAddonPricing.findByIdAndDelete(id);
    
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
export const DELETE = roleMiddleware(['admin', 'biller'])(deleteHandler);
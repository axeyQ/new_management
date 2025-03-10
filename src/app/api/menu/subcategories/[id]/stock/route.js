import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SubCategory from '@/models/SubCategory';
import { roleMiddleware } from '@/lib/auth';

// Update subcategory stock status
const updateStockHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { 
      isOutOfStock, 
      orderModes, 
      restockTime, 
      outOfStockReason, 
      autoRestock 
    } = await request.json();
    
    await connectDB();
    
    // Find subcategory
    let subcategory = await SubCategory.findById(id);
    if (!subcategory) {
      return NextResponse.json(
        { success: false, message: 'SubCategory not found' },
        { status: 404 }
      );
    }
    
    // Prepare update object
    const updateData = {
      $set: {
        'stockStatus.lastStockUpdate': new Date(),
        'stockStatus.lastStockUpdateBy': request.user._id,
        'stockStatus.autoRestock': autoRestock !== undefined ? autoRestock : true
      }
    };
    
    // Set the global out of stock flag if provided
    if (isOutOfStock !== undefined) {
      updateData.$set['stockStatus.isOutOfStock'] = isOutOfStock;
    }
    
    // Set global fields if provided
    if (restockTime !== undefined) {
      updateData.$set['stockStatus.restockTime'] = restockTime;
    }
    
    if (outOfStockReason !== undefined) {
      updateData.$set['stockStatus.outOfStockReason'] = outOfStockReason;
    }
    
    // Handle order mode-specific updates if provided
    if (orderModes) {
      const orderModeKeys = Object.keys(orderModes);
      
      orderModeKeys.forEach(mode => {
        const modeData = orderModes[mode];
        
        if (modeData.isOutOfStock !== undefined) {
          updateData.$set[`stockStatus.orderModes.${mode}.isOutOfStock`] = modeData.isOutOfStock;
        }
        
        if (modeData.restockTime !== undefined) {
          updateData.$set[`stockStatus.orderModes.${mode}.restockTime`] = modeData.restockTime;
        }
        
        if (modeData.outOfStockReason !== undefined) {
          updateData.$set[`stockStatus.orderModes.${mode}.outOfStockReason`] = modeData.outOfStockReason;
        }
      });
    }
    
    const updateResult = await SubCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: false }
    );
    
    if (!updateResult) {
      return NextResponse.json(
        { success: false, message: 'Failed to update subcategory' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `SubCategory stock status updated successfully`,
      data: updateResult
    });
  } catch (error) {
    console.error('Error updating subcategory stock status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
        errors: error.errors,
        _message: error.message
      },
      { status: 500 }
    );
  }
};

// Only admins, billers, and captains can update stock status
export const PUT = roleMiddleware(['admin', 'biller', 'captain'])(updateStockHandler);
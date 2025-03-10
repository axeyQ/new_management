// src/app/api/orders/kot/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';
import { notifyKotStatusChange } from '@/pages/api/socket';

// Get a specific KOT
export const GET = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    console.log(`API: Fetching KOT with ID: ${id}`);
    
    const kot = await KOT.findById(id)
      .populate('table')
      .populate('salesOrder')
      .populate({
        path: 'items.dish',
        select: 'dishName image dieteryTag'
      })
      .populate({
        path: 'items.variant',
        select: 'variantName'
      })
      .populate({
        path: 'items.addOns.addOn',
        select: 'name'
      })
      .populate('createdBy', 'username')
      .populate('printedBy', 'username');

    if (!kot) {
      console.log(`API: KOT with ID ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'KOT not found' },
        { status: 404 }
      );
    }

    console.log(`API: Successfully retrieved KOT ${id}`);
    return NextResponse.json({
      success: true,
      data: kot
    });
  } catch (error) {
    console.error('API Error fetching KOT:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});

// Update a KOT
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const updateData = await request.json();
    
    console.log(`API: Processing update for KOT ${id}`, updateData);
    
    // Find KOT
    const kot = await KOT.findById(id);
    if (!kot) {
      console.log(`API: KOT with ID ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'KOT not found' },
        { status: 404 }
      );
    }

    let isUpdated = false;

    // Update KOT status
    if (updateData.kotStatus) {
      const oldStatus = kot.kotStatus;
      kot.kotStatus = updateData.kotStatus;
      console.log(`Updating KOT status from ${oldStatus} to ${updateData.kotStatus}`);
      
      // Update timing information
      if (updateData.kotStatus === 'preparing' && !kot.preparationStartTime) {
        kot.preparationStartTime = new Date();
        console.log('Setting preparation start time');
      } else if ((updateData.kotStatus === 'ready' || updateData.kotStatus === 'completed') 
                && !kot.completionTime) {
        kot.completionTime = new Date();
        console.log('Setting completion time');
      }
      
      // If KOT is completed or ready, update the order status as well
      if (updateData.kotStatus === 'ready' || updateData.kotStatus === 'completed') {
        if (kot.salesOrder) {
          console.log(`Updating related order ${kot.salesOrder} status to ${updateData.kotStatus === 'ready' ? 'ready' : 'served'}`);
          await SalesOrder.findByIdAndUpdate(
            kot.salesOrder,
            { orderStatus: updateData.kotStatus === 'ready' ? 'ready' : 'served' },
            { new: true }
          );
        }
      }
      
      isUpdated = true;
      
      // Send WebSocket notification if status changed
      if (oldStatus !== updateData.kotStatus) {
        try {
          console.log(`Sending WebSocket notification for KOT ${id} status change to ${updateData.kotStatus}`);
          notifyKotStatusChange(kot, updateData.kotStatus);
        } catch (socketError) {
          console.error('Error sending WebSocket notification:', socketError);
          // Continue with the response even if WebSocket notification fails
        }
      }
    }

    // Update printed status
    if (updateData.printed !== undefined) {
      kot.printed = updateData.printed;
      console.log(`Updating KOT printed status to ${updateData.printed}`);
      
      if (updateData.printed) {
        kot.printedBy = request.user._id;
        kot.printedAt = Date.now();
        kot.printerId = updateData.printerId || '';
        console.log(`KOT marked as printed by ${request.user._id} on printer ${updateData.printerId || 'default'}`);
      }
      
      isUpdated = true;
    }
    
    // Update priority if provided
    if (updateData.priority !== undefined) {
      kot.priority = updateData.priority;
      console.log(`Updating KOT priority to ${updateData.priority}`);
      isUpdated = true;
    }
    
    // Update estimated prep time if provided
    if (updateData.estimatedPrepTime !== undefined) {
      kot.estimatedPrepTime = updateData.estimatedPrepTime;
      console.log(`Updating KOT estimated prep time to ${updateData.estimatedPrepTime} minutes`);
      isUpdated = true;
    }

    // Only save if something was actually updated
    if (isUpdated) {
      // Update updatedBy and updatedAt
      kot.updatedBy = request.user._id;
      kot.updatedAt = Date.now();
      
      // Save the updated KOT
      console.log(`Saving updated KOT ${id}`);
      await kot.save();
      
      // Return updated KOT
      const updatedKot = await KOT.findById(id)
        .populate('table')
        .populate('salesOrder')
        .populate({
          path: 'items.dish',
          select: 'dishName dieteryTag'
        })
        .populate({
          path: 'items.variant',
          select: 'variantName'
        })
        .populate('createdBy', 'username')
        .populate('printedBy', 'username');

      return NextResponse.json({
        success: true,
        message: 'KOT updated successfully',
        data: updatedKot
      });
    } else {
      console.log(`No updates were made to KOT ${id}`);
      return NextResponse.json({
        success: false,
        message: 'No updates were made to the KOT'
      });
    }
  } catch (error) {
    console.error('Error updating KOT:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});

// Cancel/Delete a KOT
export const DELETE = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    console.log(`API: Processing cancellation for KOT ${id}`);
    
    // Find KOT
    const kot = await KOT.findById(id);
    if (!kot) {
      console.log(`API: KOT with ID ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'KOT not found' },
        { status: 404 }
      );
    }
    
    // Only allow cancellation of pending or preparing KOTs
    if (kot.kotStatus !== 'pending' && kot.kotStatus !== 'preparing') {
      console.log(`Cannot cancel KOT ${id} with status ${kot.kotStatus}`);
      return NextResponse.json(
        { success: false, message: 'Cannot cancel KOT that is already completed or served' },
        { status: 400 }
      );
    }
    
    // Update KOT status to cancelled
    kot.kotStatus = 'cancelled';
    kot.updatedBy = request.user._id;
    kot.updatedAt = Date.now();
    
    // Save the updated KOT
    console.log(`Cancelling KOT ${id}`);
    await kot.save();
    
    // Send WebSocket notification for cancellation
    try {
      console.log(`Sending WebSocket notification for KOT ${id} cancellation`);
      notifyKotStatusChange(kot, 'cancelled');
    } catch (socketError) {
      console.error('Error sending WebSocket notification for cancellation:', socketError);
      // Continue with the response even if WebSocket notification fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'KOT cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling KOT:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});
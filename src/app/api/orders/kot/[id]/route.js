// src/app/api/orders/kot/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';
import { emitKotStatusChange } from '@/lib/websocket';

// Get a specific KOT
export const GET = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    const kot = await KOT.findById(id)
      .populate('table')
      .populate('salesOrder')
      .populate({
        path: 'items.dish',
        select: 'dishName image'
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
      return NextResponse.json(
        { success: false, message: 'KOT not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: kot
    });
  } catch (error) {
    console.error('Error fetching KOT:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
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
    
    // Find KOT
    const kot = await KOT.findById(id);
    if (!kot) {
      return NextResponse.json(
        { success: false, message: 'KOT not found' },
        { status: 404 }
      );
    }
    
    // Update KOT status
    if (updateData.kotStatus) {
      kot.kotStatus = updateData.kotStatus;
      
      // Update timing information
      if (updateData.kotStatus === 'preparing' && !kot.preparationStartTime) {
        kot.preparationStartTime = new Date();
      } else if ((updateData.kotStatus === 'ready' || updateData.kotStatus === 'completed') && !kot.completionTime) {
        kot.completionTime = new Date();
      }
      
      // If KOT is completed, update the order status as well
      if (updateData.kotStatus === 'ready' || updateData.kotStatus === 'completed') {
        // Check if all KOTs for this order are completed
        if (kot.salesOrder) {
          await SalesOrder.findByIdAndUpdate(
            kot.salesOrder,
            { orderStatus: updateData.kotStatus === 'ready' ? 'ready' : 'served' },
            { new: true }
          );
        }
      }
    }
    
    // Update printed status
    if (updateData.printed !== undefined) {
      kot.printed = updateData.printed;
      
      if (updateData.printed) {
        kot.printedBy = request.user._id;
        kot.printedAt = Date.now();
        kot.printerId = updateData.printerId || '';
      }
    }
    
    // Update updatedBy and updatedAt
    kot.updatedBy = request.user._id;
    kot.updatedAt = Date.now();
    
    // Save the updated KOT
    await kot.save();
    
    // Emit status update via WebSocket
    emitKotStatusChange(id, kot.kotStatus);
    
    // Return updated KOT
    const updatedKot = await KOT.findById(id)
      .populate('table')
      .populate('salesOrder')
      .populate({
        path: 'items.dish',
        select: 'dishName'
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
  } catch (error) {
    console.error('Error updating KOT:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Cancel a KOT
export const DELETE = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    // Find KOT
    const kot = await KOT.findById(id);
    if (!kot) {
      return NextResponse.json(
        { success: false, message: 'KOT not found' },
        { status: 404 }
      );
    }
    
    // Only allow cancellation of pending or preparing KOTs
    if (kot.kotStatus !== 'pending' && kot.kotStatus !== 'preparing') {
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
    await kot.save();
    
    // Emit status update via WebSocket
    emitKotStatusChange(id, 'cancelled');
    
    return NextResponse.json({
      success: true,
      message: 'KOT cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling KOT:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import { authMiddleware } from '@/lib/auth';

// Get KOT by ID
export const GET = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    const kot = await KOT.findById(id)
      .populate('table')
      .populate({
        path: 'items.dish',
        select: 'dishName'
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

// Update KOT
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const updateData = await request.json();
    
    // Find the KOT
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
    
    return NextResponse.json({
      success: true,
      message: 'KOT updated successfully',
      data: kot
    });
  } catch (error) {
    console.error('Error updating KOT:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Cancel KOT
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
    
    // Mark as cancelled
    kot.kotStatus = 'cancelled';
    kot.updatedBy = request.user._id;
    kot.updatedAt = Date.now();
    
    await kot.save();
    
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
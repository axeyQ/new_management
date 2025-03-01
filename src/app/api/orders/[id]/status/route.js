import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';

// Update order status
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params;
    const { status } = await request.json();
    await connectDB();
    
    // Find order
    const order = await SalesOrder.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Validate status transition
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Update status
    order.orderStatus = status;
    order.updatedAt = Date.now();
    
    // Save updated order
    await order.save();
    
    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
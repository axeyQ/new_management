// src/app/api/orders/[id]/zomato-status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';

// Update Zomato order status and timeline
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params;
    const { 
      zomatoStatus, 
      deliveryPartner, 
      estimatedReadyTime, 
      estimatedDeliveryTime,
      timelineEvent,
      note
    } = await request.json();
    
    await connectDB();
    
    // Find order
    const order = await SalesOrder.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Verify it's a Zomato order
    if (order.orderMode !== 'Zomato') {
      return NextResponse.json(
        { success: false, message: 'Not a Zomato order' },
        { status: 400 }
      );
    }
    
    // Initialize zomatoOrderDetails if it doesn't exist
    if (!order.zomatoOrderDetails) {
      order.zomatoOrderDetails = {
        zomatoStatus: 'placed',
        timeline: []
      };
    }
    
    // Update Zomato status if provided
    if (zomatoStatus) {
      order.zomatoOrderDetails.zomatoStatus = zomatoStatus;
      
      // Map Zomato status to order status
      if (zomatoStatus === 'preparing') {
        order.orderStatus = 'preparing';
      } else if (zomatoStatus === 'ready') {
        order.orderStatus = 'ready';
      } else if (zomatoStatus === 'out-for-delivery') {
        order.orderStatus = 'out-for-delivery';
      } else if (zomatoStatus === 'delivered') {
        order.orderStatus = 'completed';
      } else if (zomatoStatus === 'cancelled') {
        order.orderStatus = 'cancelled';
      }
    }
    
    // Update delivery partner info if provided
    if (deliveryPartner) {
      order.zomatoOrderDetails.deliveryPartner = {
        ...order.zomatoOrderDetails.deliveryPartner || {},
        ...deliveryPartner
      };
      
      // If delivery partner arrived, add timestamp
      if (deliveryPartner.arrived) {
        order.zomatoOrderDetails.deliveryPartner.arrivedAt = new Date();
      }
    }
    
    // Update estimated times if provided
    if (estimatedReadyTime) {
      order.zomatoOrderDetails.estimatedReadyTime = new Date(estimatedReadyTime);
    }
    
    if (estimatedDeliveryTime) {
      order.zomatoOrderDetails.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }
    
    // Add timeline event if provided
    if (timelineEvent) {
      // Make sure timeline array exists
      if (!order.zomatoOrderDetails.timeline) {
        order.zomatoOrderDetails.timeline = [];
      }
      
      // Add new timeline event with current timestamp
      order.zomatoOrderDetails.timeline.push({
        status: timelineEvent,
        timestamp: new Date(),
        note: note || ''
      });
    }
    
    // Save updated order
    order.updatedAt = Date.now();
    await order.save();
    
    return NextResponse.json({
      success: true,
      message: 'Zomato order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating Zomato order status:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Get Zomato order status
export const GET = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params;
    
    await connectDB();
    
    const order = await SalesOrder.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Verify it's a Zomato order
    if (order.orderMode !== 'Zomato') {
      return NextResponse.json(
        { success: false, message: 'Not a Zomato order' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        zomatoOrderDetails: order.zomatoOrderDetails || {},
        orderStatus: order.orderStatus
      }
    });
  } catch (error) {
    console.error('Error fetching Zomato order status:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});
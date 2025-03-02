// src/app/api/orders/kot/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';
import { emitKotUpdate } from '@/lib/websocket';

// Get all KOTs with filters
export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order');
    const status = url.searchParams.get('status');
    const orderMode = url.searchParams.get('mode');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Build query based on filters
    let query = {};
    
    if (orderId) {
      query.salesOrder = orderId;
    }
    
    if (status) {
      const statuses = status.split(',');
      query.kotStatus = { $in: statuses };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch KOTs with pagination
    let kotsQuery = KOT.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('table')
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
    
    // If filtering by order mode, we need to handle this separately
    // since it's in the salesOrder document
    if (orderMode) {
      // First, get all KOTs
      const allKots = await kotsQuery.exec();
      
      // Then populate the sales order to check the order mode
      await SalesOrder.populate(allKots, {
        path: 'salesOrder',
        select: 'orderMode'
      });
      
      // Filter KOTs by order mode
      const filteredKots = allKots.filter(kot => 
        kot.salesOrder && kot.salesOrder.orderMode === orderMode
      );
      
      // Calculate total for pagination
      const total = filteredKots.length;
      
      // Return the filtered KOTs
      return NextResponse.json({
        success: true,
        count: filteredKots.length,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        data: filteredKots
      });
    } else {
      // If not filtering by order mode, execute the query normally
      const kots = await kotsQuery.exec();
      
      // Populate sales order for all KOTs to include order mode in response
      await SalesOrder.populate(kots, {
        path: 'salesOrder',
        select: 'orderMode'
      });
      
      // Get total count for pagination
      const total = await KOT.countDocuments(query);
      
      return NextResponse.json({
        success: true,
        count: kots.length,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        data: kots
      });
    }
  } catch (error) {
    console.error('Error fetching KOTs:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Create a new KOT
export const POST = authMiddleware(async (request) => {
  try {
    await connectDB();
    const kotData = await request.json();
    
    // Validate required fields
    if (!kotData.salesOrder || !kotData.items || kotData.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required KOT information' },
        { status: 400 }
      );
    }
    
    // Get order information
    const order = await SalesOrder.findById(kotData.salesOrder);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Add additional order information to KOT
    kotData.invoiceNum = order.invoiceNumber;
    kotData.orderMode = order.orderMode;
    kotData.customer = {
      name: order.customer.name,
      phone: order.customer.phone
    };
    
    if (order.table) {
      kotData.table = order.table;
    }
    
    // Add user info
    kotData.createdBy = request.user._id;
    kotData.updatedBy = request.user._id;
    
    // Create the KOT
    const newKOT = await KOT.create(kotData);
    
    // Populate fields for response
    const populatedKOT = await KOT.findById(newKOT._id)
      .populate('table')
      .populate({
        path: 'items.dish',
        select: 'dishName'
      })
      .populate({
        path: 'items.variant',
        select: 'variantName'
      })
      .populate('createdBy', 'username');
    
    // Emit real-time update via WebSocket
    emitKotUpdate(populatedKOT);
    
    return NextResponse.json({
      success: true,
      message: 'KOT created successfully',
      data: populatedKOT
    });
  } catch (error) {
    console.error('Error creating KOT:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
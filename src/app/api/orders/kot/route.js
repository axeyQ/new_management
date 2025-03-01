import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';

// Get all KOTs with filters
export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Build query based on filters
    let query = {};
    
    if (orderId) {
      query.salesOrder = orderId;
    }
    
    if (status) {
      query.kotStatus = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch KOTs with pagination
    const kots = await KOT.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('table')
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
    
    // Generate KOT IDs if not provided
    if (!kotData.kotTokenNum || !kotData.kotFinalId || !kotData.kotInvoiceId) {
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Get count of KOTs today for sequence number
      const today = new Date(date.setHours(0, 0, 0, 0));
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const count = await KOT.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      });
      
      const sequence = (count + 1).toString().padStart(4, '0');
      
      // Format: KOT-YYMMDD-XXXX
      if (!kotData.kotInvoiceId) {
        kotData.kotInvoiceId = `KOT-${year}${month}${day}-${sequence}`;
      }
      
      if (!kotData.kotFinalId) {
        kotData.kotFinalId = `KF-${year}${month}${day}-${sequence}`;
      }
      
      if (!kotData.kotTokenNum) {
        kotData.kotTokenNum = sequence;
      }
    }
    
    // Make sure refNum is set
    if (!kotData.refNum) {
      kotData.refNum = order.refNum;
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
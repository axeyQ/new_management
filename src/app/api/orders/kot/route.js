import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get all KOTs with optional filters
export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    // Get query parameters
    const url = new URL(request.url);
    const orderMode = url.searchParams.get('mode');
    const status = url.searchParams.get('status');
    const salesOrderId = url.searchParams.get('orderId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Build query based on filters
    let query = {};
    if (orderMode) {
      query.orderMode = orderMode;
    }
    if (status) {
      query.kotStatus = status;
    }
    if (salesOrderId) {
      query.salesOrder = salesOrderId;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch KOTs with pagination
    const kots = await KOT.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
      .populate({
        path: 'items.addOns.addOn',
        select: 'name'
      })
      .populate({
        path: 'createdBy',
        select: 'username'
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
  } catch (error) {
    console.error('Error fetching KOTs:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Create a new KOT
const createHandler = async (request) => {
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
    
    // Check if the sales order exists
    const salesOrder = await SalesOrder.findById(kotData.salesOrder);
    if (!salesOrder) {
      return NextResponse.json(
        { success: false, message: 'Sales order not found' },
        { status: 404 }
      );
    }
    
    // Add order details to KOT
    kotData.orderMode = salesOrder.orderMode;
    kotData.invoiceNum = salesOrder.invoiceNumber;
    kotData.refNum = salesOrder.refNum;
    kotData.table = salesOrder.table;
    kotData.customer = {
      name: salesOrder.customer.name,
      phone: salesOrder.customer.phone
    };
    
    // Process items to ensure they have all required fields
    kotData.items = kotData.items.map(item => ({
      dish: item.dish,
      dishName: item.dishName || 'Unknown Item',
      variant: item.variant || null,
      variantName: item.variantName || '',
      quantity: item.quantity,
      // Ensure add-ons are properly formatted
      addOns: (item.addOns || []).map(addon => ({
        addOn: addon.addOn,
        addOnName: addon.name || addon.addOnName || 'Add-on'
      })),
      notes: item.notes || ''
    }));
    
    // Add user info for tracking
    kotData.createdBy = request.user._id;
    kotData.updatedBy = request.user._id;
    
    // Create the KOT
    const newKOT = await KOT.create(kotData);
    
    // Populate necessary fields for response
    const populatedKOT = await KOT.findById(newKOT._id)
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
      .populate({
        path: 'items.addOns.addOn',
        select: 'name'
      })
      .populate({
        path: 'createdBy',
        select: 'username'
      });
    
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
};

// Only authenticated users can create KOTs
export const POST = authMiddleware(createHandler);
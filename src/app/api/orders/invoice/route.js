import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';

// Get all invoices with filters
export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    const isPaid = url.searchParams.get('isPaid');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Build query based on filters
    let query = {};
    
    if (orderId) {
      query.salesOrder = orderId;
    }
    
    if (isPaid !== undefined) {
      query.isPaid = isPaid === 'true';
    }
    
    if (startDate && endDate) {
      query.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.invoiceDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.invoiceDate = { $lte: new Date(endDate) };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch invoices with pagination
    const invoices = await Invoice.find(query)
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('salesOrder', 'invoiceNumber orderDateTime orderMode')
      .populate('createdBy', 'username');
    
    // Get total count for pagination
    const total = await Invoice.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      count: invoices.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Create a new invoice
export const POST = authMiddleware(async (request) => {
  try {
    await connectDB();
    const invoiceData = await request.json();
    
    // Validate required fields
    if (!invoiceData.salesOrder) {
      return NextResponse.json(
        { success: false, message: 'Sales order ID is required' },
        { status: 400 }
      );
    }
    
    // Check if order exists
    const order = await SalesOrder.findById(invoiceData.salesOrder)
      .populate({
        path: 'itemsSold.dish',
        select: 'dishName'
      })
      .populate({
        path: 'itemsSold.variant',
        select: 'variantName'
      });
    
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({ salesOrder: invoiceData.salesOrder });
    if (existingInvoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice already exists for this order' },
        { status: 400 }
      );
    }
    
    // Set invoice number same as order invoice number
    invoiceData.invoiceNumber = order.invoiceNumber;
    
    // Set customer details from order
    invoiceData.customerDetails = {
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email || '',
      address: order.customer.address || ''
    };
    
    // Set restaurant details (could be from environment variables or database)
    invoiceData.restaurantDetails = {
      name: process.env.RESTAURANT_NAME || 'Restaurant Name',
      address: process.env.RESTAURANT_ADDRESS || 'Restaurant Address',
      phone: process.env.RESTAURANT_PHONE || 'Restaurant Phone',
      email: process.env.RESTAURANT_EMAIL || 'restaurant@example.com',
      gstin: process.env.RESTAURANT_GSTIN || '',
      fssaiLicense: process.env.RESTAURANT_FSSAI || ''
    };
    
    // Prepare items from order
    invoiceData.items = order.itemsSold.map(item => ({
      name: item.dish ?
        (item.variant ? `${item.dish.dishName} - ${item.variant.variantName}` : item.dish.dishName) :
        'Unknown Item',
      quantity: item.quantity,
      price: item.price,
      amount: item.price * item.quantity
    }));
    
    // Prepare tax breakup from order
    invoiceData.taxBreakup = order.taxDetails.map(tax => ({
      taxName: tax.taxName,
      taxRate: tax.taxRate,
      taxableAmount: order.subtotalAmount,
      taxAmount: tax.taxAmount
    }));
    
    // Set payment details
    invoiceData.paymentDetails = {
      subtotal: order.subtotalAmount,
      taxTotal: order.totalTaxAmount,
      discount: order.discount?.discountValue || 0,
      deliveryCharge: order.deliveryCharge || 0,
      packagingCharge: order.packagingCharge || 0,
      grandTotal: order.totalAmount,
      amountPaid: order.totalAmount, // Assuming fully paid
      changeReturned: 0 // Can be calculated if needed
    };
    
    // Set payment methods from order
    invoiceData.paymentMethods = order.payment;
    
    // Set additional info
    invoiceData.additionalInfo = {
      orderType: order.orderMode,
      tableNumber: order.table ? order.table.toString() : '',
      serverName: order.staff?.captain?.username || '',
      notes: ''
    };
    
    // Add user info
    invoiceData.createdBy = request.user._id;
    invoiceData.updatedBy = request.user._id;
    
    // Create the invoice
    const newInvoice = await Invoice.create(invoiceData);
    
    // Populate fields for response
    const populatedInvoice = await Invoice.findById(newInvoice._id)
      .populate('salesOrder', 'invoiceNumber orderDateTime orderMode')
      .populate('createdBy', 'username');
    
    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      data: populatedInvoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
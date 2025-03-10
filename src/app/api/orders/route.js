import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';
import Dish from '@/models/Dish'; // Add this import
import Variant from '@/models/Variant'; // Add this import
import User from '@/models/User'; // Add this import
import Table from '@/models/Table'; // Add this import

// Get all orders with optional filters
export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    // Get query parameters
    const url = new URL(request.url);
    const orderMode = url.searchParams.get('mode');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Build query based on filters
    let query = {};
    if (orderMode) {
      query.orderMode = orderMode;
    }
    if (status) {
      query.orderStatus = status;
    }
    if (startDate && endDate) {
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
      
      query.orderDateTime = {
        $gte: new Date(startDate),
        $lt: adjustedEndDate
      };
      console.log('Date query:', query.orderDateTime);
    } else if (startDate) {
      query.orderDateTime = { $gte: new Date(startDate) };
    } else if (endDate) {
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
      
      query.orderDateTime = { $lt: adjustedEndDate };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch orders with pagination
    const orders = await SalesOrder.find(query)
      .sort({ orderDateTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate('table')
      .populate({
        path: 'itemsSold.dish',
        select: 'dishName image dieteryTag'
      })
      .populate({
        path: 'itemsSold.variant',
        select: 'variantName'
      })
      .populate({
        path: 'staff.captain',
        select: 'username'
      })
      .populate({
        path: 'staff.biller',
        select: 'username'
      });
    
    // Get total count for pagination
    const total = await SalesOrder.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      count: orders.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Create a new order
const createHandler = async (request) => {
  try {
    await connectDB();
    const orderData = await request.json();
    
    // Handle empty table field - convert empty string to null
    if (orderData.table === '') {
      orderData.table = null;
    }
    
    // Validate required fields
    if (!orderData.orderMode || !orderData.customer ||
        !orderData.itemsSold || orderData.itemsSold.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required order information' },
        { status: 400 }
      );
    }
    
    // Ensure variant field is null rather than empty string
    if (orderData.itemsSold) {
      orderData.itemsSold = orderData.itemsSold.map(item => ({
        ...item,
        variant: item.variant || null
      }));
    }
    
    // Calculate order subtotal, taxes, and total
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    
    // Calculate subtotal from items
    orderData.itemsSold.forEach(item => {
      subtotalAmount += item.price * item.quantity;
      // Add addon prices if any
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach(addon => {
          subtotalAmount += addon.price || 0;
        });
      }
    });
    
    // Calculate taxes
    if (orderData.taxDetails && orderData.taxDetails.length > 0) {
      orderData.taxDetails.forEach(tax => {
        const taxAmount = (subtotalAmount * tax.taxRate) / 100;
        tax.taxAmount = parseFloat(taxAmount.toFixed(2));
        totalTaxAmount += tax.taxAmount;
      });
    }
    
    // Calculate discount if applicable
    let discountAmount = 0;
    if (orderData.discount) {
      if (orderData.discount.discountType === 'percentage') {
        discountAmount = (subtotalAmount * orderData.discount.discountPercentage) / 100;
      } else {
        discountAmount = orderData.discount.discountValue;
      }
      orderData.discount.discountValue = parseFloat(discountAmount.toFixed(2));
    }
    
    // Set additional charges
    const packagingCharge = orderData.packagingCharge || 0;
    const deliveryCharge = orderData.deliveryCharge || 0;
    
    // Calculate total amount
    const totalAmount = subtotalAmount + totalTaxAmount + deliveryCharge + packagingCharge - discountAmount;
    
    // Add the calculated values to order data
    orderData.subtotalAmount = parseFloat(subtotalAmount.toFixed(2));
    orderData.totalTaxAmount = parseFloat(totalTaxAmount.toFixed(2));
    orderData.totalAmount = parseFloat(totalAmount.toFixed(2));
    
    // Add user info
    orderData.staff = {
      ...orderData.staff,
      biller: request.user._id
    };
    
    // Generate invoice number and reference number if not provided
    // Note: In a real application, the model's pre-save hook would handle this
    if (!orderData.refNum || !orderData.invoiceNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Get count of orders today for sequence number
      const today = new Date(date.setHours(0, 0, 0, 0));
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const count = await SalesOrder.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      });
      const sequence = (count + 1).toString().padStart(4, '0');
      
      // Format: INV-YYMMDD-XXXX
      if (!orderData.invoiceNumber) {
        orderData.invoiceNumber = `INV-${year}${month}${day}-${sequence}`;
      }
      
      // Generate reference number
      if (!orderData.refNum) {
        orderData.refNum = `REF-${year}${month}${day}-${sequence}`;
      }
    }
    
    // Create the order
    const newOrder = await SalesOrder.create(orderData);
    
    // Populate necessary fields for response
    const populatedOrder = await SalesOrder.findById(newOrder._id)
      .populate('table')
      .populate({
        path: 'itemsSold.dish',
        select: 'dishName image'
      })
      .populate({
        path: 'itemsSold.variant',
        select: 'variantName'
      })
      .populate({
        path: 'staff.captain',
        select: 'username'
      })
      .populate({
        path: 'staff.biller',
        select: 'username'
      });
    
    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Only authenticated users can create orders
export const POST = authMiddleware(createHandler);
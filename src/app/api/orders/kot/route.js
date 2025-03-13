// src/app/api/orders/kot/route.js (Updated with WebSocket notifications)

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';
import { notifyNewKot } from '@/lib/websocket-server';
import AddOn from '@/models/AddOn';

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
      // Handle multiple statuses by splitting comma-separated values
      if (status.includes(',')) {
        query.kotStatus = { $in: status.split(',') };
      } else {
        query.kotStatus = status;
      }
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
    
    // CRITICAL FIX: Update the sales order to ensure it includes all items from this KOT
    try {
      // Get the current order items
      const currentOrderItems = salesOrder.itemsSold || [];
      
      // Add KOT items that don't exist in the order yet
      const kotItems = kotData.items;
      let updatedOrderItems = [...currentOrderItems];
      
      // Track which items are already in the order
      const orderItemKeys = new Map();
      currentOrderItems.forEach(item => {
        const key = `${item.dish}-${item.variant || 'none'}-${item.notes || ''}`;
        orderItemKeys.set(key, item);
      });
      
      // Check each KOT item and add it if not found in the order
      kotItems.forEach(kotItem => {
        const key = `${kotItem.dish}-${kotItem.variant || 'none'}-${kotItem.notes || ''}`;
        
        if (!orderItemKeys.has(key)) {
          // This is a new item not in the order
          const newOrderItem = {
            dish: kotItem.dish,
            dishName: kotItem.dishName,
            variant: kotItem.variant || null,
            variantName: kotItem.variantName || '',
            quantity: kotItem.quantity,
            price: kotItem.price || 0, // You may need to fetch the price
            addOns: kotItem.addOns || [],
            notes: kotItem.notes || ''
          };
          
          updatedOrderItems.push(newOrderItem);
        } else {
          // Optionally merge quantities if needed
          // For example:
          // const existingItem = orderItemKeys.get(key);
          // existingItem.quantity += kotItem.quantity;
        }
      });
      
      // Update the order with all items
      salesOrder.itemsSold = updatedOrderItems;
      
      // Recalculate totals based on updated items
      // This should use your existing calculation logic
      let subtotalAmount = 0;
      let totalTaxAmount = 0;
      
      // Calculate subtotal from all items
      updatedOrderItems.forEach(item => {
        subtotalAmount += item.price * item.quantity;
        
        // Add addon prices if any
        if (item.addOns && item.addOns.length > 0) {
          item.addOns.forEach(addon => {
            subtotalAmount += addon.price || 0;
          });
        }
      });
      
      // Calculate taxes
      if (salesOrder.taxDetails && salesOrder.taxDetails.length > 0) {
        salesOrder.taxDetails.forEach(tax => {
          const taxAmount = (subtotalAmount * tax.taxRate) / 100;
          tax.taxAmount = parseFloat(taxAmount.toFixed(2));
          totalTaxAmount += tax.taxAmount;
        });
      }
      
      // Calculate discount
      let discountAmount = 0;
      if (salesOrder.discount) {
        if (salesOrder.discount.discountType === 'percentage') {
          discountAmount = (subtotalAmount * salesOrder.discount.discountPercentage) / 100;
        } else {
          discountAmount = salesOrder.discount.discountValue;
        }
        salesOrder.discount.discountValue = parseFloat(discountAmount.toFixed(2));
      }
      
      // Set additional charges
      const packagingCharge = salesOrder.packagingCharge || 0;
      const deliveryCharge = salesOrder.deliveryCharge || 0;
      
      // Calculate total amount
      const totalAmount = subtotalAmount + totalTaxAmount + deliveryCharge + packagingCharge - discountAmount;
      
      // Update the order with the new totals
      salesOrder.subtotalAmount = parseFloat(subtotalAmount.toFixed(2));
      salesOrder.totalTaxAmount = parseFloat(totalTaxAmount.toFixed(2));
      salesOrder.totalAmount = parseFloat(totalAmount.toFixed(2));
      
      // Save the updated order
      await salesOrder.save();
      console.log(`Order ${salesOrder._id} updated with KOT items`);
      
    } catch (orderUpdateError) {
      console.error('Error updating order with KOT items:', orderUpdateError);
      // Continue even if order update fails, so KOT is still created
    }
    
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
});
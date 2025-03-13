import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import KOT from '@/models/KOT';
import { authMiddleware } from '@/lib/auth';

export const POST = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Find the order
    const order = await SalesOrder.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Find all KOTs for this order
    const kots = await KOT.find({ salesOrder: id });
    console.log(`Found ${kots.length} KOTs for order ${id}`);
    
    if (kots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No KOTs found for this order',
        data: order
      });
    }
    
    // Get the current order items
    const currentOrderItems = order.itemsSold || [];
    
    // Track existing order items by a unique key
    const orderItemsMap = new Map();
    currentOrderItems.forEach(item => {
      const key = `${item.dish}-${item.variant || 'none'}-${item.notes || ''}`;
      orderItemsMap.set(key, item);
    });
    
    // Collect all items from all KOTs
    let newItemsFound = false;
    
    kots.forEach(kot => {
      const kotItems = kot.items || [];
      
      kotItems.forEach(kotItem => {
        const key = `${kotItem.dish}-${kotItem.variant || 'none'}-${kotItem.notes || ''}`;
        
        if (!orderItemsMap.has(key)) {
          // New item found in KOT but not in order
          newItemsFound = true;
          
          const newOrderItem = {
            dish: kotItem.dish,
            dishName: kotItem.dishName,
            variant: kotItem.variant || null,
            variantName: kotItem.variantName || '',
            quantity: kotItem.quantity,
            price: kotItem.price || 0,
            addOns: kotItem.addOns || [],
            notes: kotItem.notes || ''
          };
          
          currentOrderItems.push(newOrderItem);
          orderItemsMap.set(key, newOrderItem);
        }
      });
    });
    
    if (!newItemsFound) {
      return NextResponse.json({
        success: true,
        message: 'Order already contains all KOT items',
        data: order
      });
    }
    
    // Update the order with all items
    order.itemsSold = currentOrderItems;
    
    // Recalculate totals
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    
    // Calculate subtotal from all items
    currentOrderItems.forEach(item => {
      subtotalAmount += item.price * item.quantity;
      
      // Add addon prices if any
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach(addon => {
          subtotalAmount += addon.price || 0;
        });
      }
    });
    
    // Calculate taxes
    if (order.taxDetails && order.taxDetails.length > 0) {
      order.taxDetails.forEach(tax => {
        const taxAmount = (subtotalAmount * tax.taxRate) / 100;
        tax.taxAmount = parseFloat(taxAmount.toFixed(2));
        totalTaxAmount += tax.taxAmount;
      });
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (order.discount) {
      if (order.discount.discountType === 'percentage') {
        discountAmount = (subtotalAmount * order.discount.discountPercentage) / 100;
      } else {
        discountAmount = order.discount.discountValue;
      }
      order.discount.discountValue = parseFloat(discountAmount.toFixed(2));
    }
    
    // Set additional charges
    const packagingCharge = order.packagingCharge || 0;
    const deliveryCharge = order.deliveryCharge || 0;
    
    // Calculate total amount
    const totalAmount = subtotalAmount + totalTaxAmount + deliveryCharge + packagingCharge - discountAmount;
    
    // Update the order with the new totals
    order.subtotalAmount = parseFloat(subtotalAmount.toFixed(2));
    order.totalTaxAmount = parseFloat(totalTaxAmount.toFixed(2));
    order.totalAmount = parseFloat(totalAmount.toFixed(2));
    
    // Save the updated order
    await order.save();
    
    return NextResponse.json({
      success: true,
      message: 'Order synchronized with all KOT items',
      data: order
    });
  } catch (error) {
    console.error('Error synchronizing order with KOTs:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});
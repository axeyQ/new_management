import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';

// Get all orders with optional filters
export const GET = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    console.log(`API: Fetching order with ID: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    const order = await SalesOrder.findById(id)
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

    if (!order) {
      console.log(`API: Order with ID ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    console.log(`API: Successfully retrieved order ${id}`);
    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('API Error fetching order:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});

// Create a new order
const createHandler = async (request) => {
  try {
    await connectDB();
    const orderData = await request.json();
    
    // Validate required fields
    if (!orderData.orderMode || !orderData.customer || !orderData.itemsSold ||
        orderData.itemsSold.length === 0) {
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
          subtotalAmount += addon.price;
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
    const totalAmount = subtotalAmount + totalTaxAmount + deliveryCharge +
                        packagingCharge - discountAmount;
    
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
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    console.log(`API: Processing update for order ${id}`);
    
    // Parse the request body
    const updateData = await request.json();
    
    // Log the update data for debugging
    console.log("Update data received:", JSON.stringify(updateData, null, 2));
    
    // Find order
    const order = await SalesOrder.findById(id);
    if (!order) {
      console.log(`API: Order ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }
    
    let isUpdated = false;
    
    // Handle payment array
    if (updateData.payment) {
      try {
        console.log("Processing payment update");
        
        // Ensure payment is an array
        let paymentArray = updateData.payment;
        if (!Array.isArray(paymentArray)) {
          console.log("Converting payment to array");
          paymentArray = [paymentArray];
        }
        
        // Validate and format each payment object
        const validatedPayments = paymentArray.map(payment => {
          const amount = typeof payment.amount === 'string' 
            ? parseFloat(payment.amount) 
            : payment.amount;
          
          return {
            method: payment.method || 'Cash',
            amount: isNaN(amount) ? 0 : amount,
            transactionId: payment.transactionId || '',
            paymentDate: payment.paymentDate || new Date()
          };
        });
        
        console.log("Validated payments:", validatedPayments);
        
        // Update the order's payment
        order.payment = validatedPayments;
        isUpdated = true;
      } catch (error) {
        console.error("Error processing payment data:", error);
        return NextResponse.json(
          { success: false, message: `Error processing payment data: ${error.message}` },
          { status: 400 }
        );
      }
    }
    
    // Update order status if provided
    if (updateData.orderStatus) {
      console.log(`Updating order status to: ${updateData.orderStatus}`);
      order.orderStatus = updateData.orderStatus;
      isUpdated = true;
    }
    
    // Update other fields if needed
    // ...
    
    if (isUpdated) {
      order.updatedAt = new Date();
      
      // Save the updated order
      console.log("Saving updated order");
      await order.save();
      
      return NextResponse.json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });
    } else {
      console.log("No updates were made to the order");
      return NextResponse.json({
        success: false,
        message: 'No updates were made to the order'
      });
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});
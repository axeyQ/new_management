// services/OrderService.js
import Order from '../models/OrderModel';
import KOT from '../models/KOTModel';
import Invoice from '../models/InvoiceModel';
import { ApiError } from '../utils/errors';
import { generateOrderNumber, generateInvoiceNumber, generateKotNumber } from '../utils/generators';
import { calculateTaxes } from '../utils/taxCalculator';

/**
 * Service class for order-related business logic
 */
class OrderService {
  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @param {Object} user - User creating the order
   * @returns {Promise<Order>} - Created order
   */
  async createOrder(orderData, user) {
    try {
      // Calculate order totals
      const calculatedOrder = await this.calculateOrderTotals(orderData);
      
      // Generate order number if not provided
      if (!calculatedOrder.orderNumber) {
        calculatedOrder.orderNumber = await generateOrderNumber();
      }
      
      // Set created by user
      calculatedOrder.createdBy = user._id;
      calculatedOrder.updatedBy = user._id;
      
      // Create the order
      const order = new Order(calculatedOrder);
      await order.save();
      
      // Return populated order
      return this.getOrderById(order._id);
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ApiError(400, 'Invalid order data', error.errors);
      }
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Order>} - Order object
   */
  async getOrderById(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('table')
        .populate('items.dish', 'dishName image dieteryTag')
        .populate('items.variant', 'variantName')
        .populate('kots')
        .populate('invoice')
        .populate('serverInfo.server', 'username name')
        .populate('serverInfo.captain', 'username name')
        .populate('createdBy', 'username name')
        .populate('updatedBy', 'username name');
        
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }
      
      return order;
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid order ID');
      }
      throw error;
    }
  }

  /**
   * Get orders with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{orders: Array, totalCount: number, pageCount: number}>}
   */
  async getOrders(filters = {}, pagination = { page: 1, limit: 50 }) {
    // Build query from filters
    const query = {};
    
    // Apply filters
    if (filters.orderType) {
      query.orderType = filters.orderType;
    }
    
    if (filters.orderStatus) {
      query.orderStatus = filters.orderStatus;
    }
    
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    
    if (filters.startDate && filters.endDate) {
      query.orderDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      query.orderDate = { $gte: new Date(filters.startDate) };
    } else if (filters.endDate) {
      query.orderDate = { $lte: new Date(filters.endDate) };
    }
    
    // Search by customer name, phone, or order number
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { invoiceNumber: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.phone': searchRegex }
      ];
    }
    
    // Calculate pagination values
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Execute queries
    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('table', 'tableName capacity')
        .populate('items.dish', 'dishName image')
        .populate('items.variant', 'variantName')
        .populate('serverInfo.server', 'username name')
        .populate('serverInfo.captain', 'username name')
        .populate('createdBy', 'username name'),
      Order.countDocuments(query)
    ]);
    
    return {
      orders,
      totalCount,
      pageCount: Math.ceil(totalCount / limit),
      currentPage: page,
      limit
    };
  }

  /**
   * Update an existing order
   * @param {string} orderId - Order ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - User updating the order
   * @returns {Promise<Order>} - Updated order
   */
  async updateOrder(orderId, updateData, user) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }
      
      // Check if order can be updated based on status
      if (['COMPLETED', 'CANCELLED'].includes(order.orderStatus)) {
        throw new ApiError(400, `Cannot update order in ${order.orderStatus} status`);
      }
      
      // Set updated by user
      updateData.updatedBy = user._id;
      
      // If updating items or pricing-related data, recalculate totals
      if (updateData.items || 
          updateData.pricing?.discount ||
          updateData.pricing?.deliveryCharge ||
          updateData.pricing?.packagingCharge ||
          updateData.pricing?.serviceCharge) {
        
        // Merge existing order with update data for calculation
        const mergedOrder = {
          ...order.toObject(),
          ...updateData
        };
        
        // Recalculate totals
        const calculatedOrder = await this.calculateOrderTotals(mergedOrder);
        
        // Apply calculated pricing values to update data
        updateData.pricing = calculatedOrder.pricing;
      }
      
      // If updating order status, add to status history
      if (updateData.orderStatus && updateData.orderStatus !== order.orderStatus) {
        const statusEntry = {
          status: updateData.orderStatus,
          user: user._id,
          timestamp: new Date(),
          notes: updateData.statusNotes || `Status changed to ${updateData.orderStatus}`
        };
        
        // Add to status history
        if (!updateData.statusHistory) {
          updateData.statusHistory = order.statusHistory || [];
        }
        updateData.statusHistory.push(statusEntry);
        
        // If cancelled, record reason and canceller
        if (updateData.orderStatus === 'CANCELLED') {
          updateData.cancelReason = updateData.cancelReason || 'No reason provided';
          updateData.cancelledBy = user._id;
        }
      }
      
      // Update the order
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      // Return populated order
      return this.getOrderById(updatedOrder._id);
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ApiError(400, 'Invalid update data', error.errors);
      }
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid order ID');
      }
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {Object} user - User updating status
   * @param {string} notes - Optional notes
   * @returns {Promise<Order>} - Updated order
   */
  async updateOrderStatus(orderId, status, user, notes = '') {
    // Valid status transitions map
    const validTransitions = {
      'PENDING': ['CONFIRMED', 'PREPARING', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY', 'CANCELLED'],
      'READY': ['SERVED', 'COMPLETED', 'CANCELLED'],
      'SERVED': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };
    
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }
      
      // Check if transition is valid
      if (!validTransitions[order.orderStatus].includes(status)) {
        throw new ApiError(400, `Cannot transition from ${order.orderStatus} to ${status}`);
      }
      
      return this.updateOrder(orderId, {
        orderStatus: status,
        statusNotes: notes
      }, user);
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid order ID');
      }
      throw error;
    }
  }

  /**
   * Calculate order totals and taxes
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} - Order with calculated totals
   */
  async calculateOrderTotals(orderData) {
    // Create a copy to avoid modifying the original
    const order = { ...orderData };
    
    // Initialize pricing object if not exists
    if (!order.pricing) {
      order.pricing = {};
    }
    
    // Calculate item totals
    if (order.items && order.items.length > 0) {
      // Calculate each item's total price
      order.items = order.items.map(item => {
        // Calculate add-ons total
        const addOnsTotal = (item.addOns || []).reduce((total, addon) => total + addon.price, 0);
        
        // Calculate item total
        const itemTotal = (item.price * item.quantity) + addOnsTotal;
        
        return {
          ...item,
          itemTotal
        };
      });
      
      // Calculate subtotal
      const subtotal = order.items.reduce((total, item) => total + item.itemTotal, 0);
      order.pricing.subtotal = parseFloat(subtotal.toFixed(2));
      
      // Calculate taxes
      const { taxBreakdown, totalTax } = calculateTaxes(subtotal);
      order.pricing.taxBreakdown = taxBreakdown;
      order.pricing.totalTax = parseFloat(totalTax.toFixed(2));
    } else {
      order.pricing.subtotal = 0;
      order.pricing.taxBreakdown = [];
      order.pricing.totalTax = 0;
    }
    
    // Apply discount if provided
    const discount = order.pricing.discount || { type: 'NONE', value: 0 };
    if (discount.type === 'PERCENTAGE' && discount.value > 0) {
      order.pricing.discountAmount = parseFloat(((order.pricing.subtotal * discount.value) / 100).toFixed(2));
    } else if (discount.type === 'FIXED' && discount.value > 0) {
      order.pricing.discountAmount = parseFloat(discount.value.toFixed(2));
    } else {
      order.pricing.discountAmount = 0;
    }
    
    // Ensure other charges exist
    order.pricing.deliveryCharge = parseFloat((order.pricing.deliveryCharge || 0).toFixed(2));
    order.pricing.packagingCharge = parseFloat((order.pricing.packagingCharge || 0).toFixed(2));
    order.pricing.serviceCharge = parseFloat((order.pricing.serviceCharge || 0).toFixed(2));
    order.pricing.tip = parseFloat((order.pricing.tip || 0).toFixed(2));
    
    // Calculate total
    order.pricing.total = parseFloat((
      order.pricing.subtotal +
      order.pricing.totalTax +
      order.pricing.deliveryCharge +
      order.pricing.packagingCharge +
      order.pricing.serviceCharge +
      order.pricing.tip -
      order.pricing.discountAmount
    ).toFixed(2));
    
    // Round-off calculation if needed
    const roundedTotal = Math.round(order.pricing.total);
    order.pricing.roundOff = parseFloat((roundedTotal - order.pricing.total).toFixed(2));
    
    // Final amount due (total + round off)
    order.pricing.amountDue = parseFloat((order.pricing.total + order.pricing.roundOff).toFixed(2));
    
    return order;
  }
}

/**
 * Service class for KOT (Kitchen Order Ticket) management
 */
class KOTService {
  /**
   * Create a new KOT
   * @param {Object} kotData - KOT data
   * @param {Object} user - User creating the KOT
   * @returns {Promise<KOT>} - Created KOT
   */
  async createKOT(kotData, user) {
    try {
      // Get order to verify it exists and get needed info
      const order = await Order.findById(kotData.order);
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }
      
      // Generate KOT number
      const kotNumber = await generateKotNumber(order.orderType);
      
      // Prepare KOT data
      const preparedKOT = {
        ...kotData,
        kotNumber,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        table: order.table,
        customer: {
          name: order.customer.name,
          phone: order.customer.phone
        },
        createdBy: user._id,
        updatedBy: user._id,
        statusHistory: [{
          status: kotData.kotStatus || 'PENDING',
          user: user._id,
          notes: 'KOT created'
        }]
      };
      
      // Create and save the KOT
      const kot = new KOT(preparedKOT);
      await kot.save();
      
      // Update order with KOT reference
      await Order.findByIdAndUpdate(order._id, {
        $push: { kots: kot._id }
      });
      
      // Mark items in KOT as having KOT generated
      for (const orderItemId of kotData.orderItems || []) {
        await Order.updateOne(
          { _id: order._id, 'items._id': orderItemId },
          { $set: { 'items.$.kotGenerated': true }}
        );
      }
      
      // Return populated KOT
      return this.getKOTById(kot._id);
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ApiError(400, 'Invalid KOT data', error.errors);
      }
      throw error;
    }
  }

  /**
   * Get KOT by ID
   * @param {string} kotId - KOT ID
   * @returns {Promise<KOT>} - KOT object
   */
  async getKOTById(kotId) {
    try {
      const kot = await KOT.findById(kotId)
        .populate('order')
        .populate('table')
        .populate('kotItems.dish', 'dishName image')
        .populate('kotItems.variant', 'variantName')
        .populate('createdBy', 'username name')
        .populate('updatedBy', 'username name')
        .populate('printedBy', 'username name');
        
      if (!kot) {
        throw new ApiError(404, 'KOT not found');
      }
      
      return kot;
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid KOT ID');
      }
      throw error;
    }
  }

  /**
   * Get KOTs with filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array<KOT>>} - List of KOTs
   */
  async getKOTs(filters = {}) {
    // Build query from filters
    const query = {};
    
    if (filters.order) {
      query.order = filters.order;
    }
    
    if (filters.kotStatus) {
      query.kotStatus = filters.kotStatus;
    }
    
    if (filters.station) {
      query.station = filters.station;
    }
    
    if (filters.orderType) {
      query.orderType = filters.orderType;
    }
    
    // Execute query
    const kots = await KOT.find(query)
      .sort({ createdAt: -1 })
      .populate('order', 'orderNumber orderStatus')
      .populate('table', 'tableName')
      .populate('kotItems.dish', 'dishName')
      .populate('kotItems.variant', 'variantName')
      .populate('createdBy', 'username name');
      
    return kots;
  }

  /**
   * Update KOT status
   * @param {string} kotId - KOT ID
   * @param {string} status - New status
   * @param {Object} user - User updating status
   * @returns {Promise<KOT>} - Updated KOT
   */
  async updateKOTStatus(kotId, status, user) {
    try {
      const kot = await KOT.findById(kotId);
      
      if (!kot) {
        throw new ApiError(404, 'KOT not found');
      }
      
      // Check if status is valid
      const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, 'Invalid KOT status');
      }
      
      // Update KOT status
      kot.kotStatus = status;
      kot.updatedBy = user._id;
      
      // Update timing fields based on status
      if (status === 'PREPARING' && !kot.preparationStartTime) {
        kot.preparationStartTime = new Date();
      } else if ((status === 'READY' || status === 'COMPLETED') && !kot.completionTime) {
        kot.completionTime = new Date();
      }
      
      // Save KOT
      await kot.save();
      
      // If completed or cancelled, update individual item statuses
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        for (const item of kot.kotItems) {
          item.kotStatus = status;
        }
        await kot.save();
      }
      
      // See if we need to update the order status
      await this.checkAndUpdateOrderStatus(kot.order);
      
      // Return populated KOT
      return this.getKOTById(kotId);
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid KOT ID');
      }
      throw error;
    }
  }

  /**
   * Mark KOT as printed
   * @param {string} kotId - KOT ID
   * @param {Object} user - User printing the KOT
   * @param {string} printer - Printer ID/name
   * @returns {Promise<KOT>} - Updated KOT
   */
  async markKOTAsPrinted(kotId, user, printer = 'default') {
    try {
      const kot = await KOT.findById(kotId);
      
      if (!kot) {
        throw new ApiError(404, 'KOT not found');
      }
      
      // Update printed info
      kot.printed = true;
      kot.printedAt = new Date();
      kot.printedBy = user._id;
      kot.printCount += 1;
      
      // Save KOT
      await kot.save();
      
      return kot;
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid KOT ID');
      }
      throw error;
    }
  }
  
  /**
   * Check if all KOTs are complete and update order status accordingly
   * @param {string} orderId - Order ID
   * @returns {Promise<void>}
   */
  async checkAndUpdateOrderStatus(orderId) {
    try {
      // Get all KOTs for the order
      const kots = await KOT.find({ order: orderId });
      
      // If no KOTs, do nothing
      if (kots.length === 0) {
        return;
      }
      
      // Check if all KOTs are completed or cancelled
      const allComplete = kots.every(kot => 
        kot.kotStatus === 'COMPLETED' || kot.kotStatus === 'CANCELLED'
      );
      
      // Check if any KOT is ready
      const anyReady = kots.some(kot => kot.kotStatus === 'READY');
      
      // Get current order
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }
      
      // Update order status if all KOTs are complete and order is not already completed/cancelled
      if (allComplete && !['COMPLETED', 'CANCELLED'].includes(order.orderStatus)) {
        await Order.findByIdAndUpdate(orderId, {
          orderStatus: 'READY',
          $push: {
            statusHistory: {
              status: 'READY',
              notes: 'All KOTs completed'
            }
          }
        });
      }
      // If any KOT is ready and order is still in pending/confirmed, mark as ready
      else if (anyReady && ['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.orderStatus)) {
        await Order.findByIdAndUpdate(orderId, {
          orderStatus: 'READY',
          $push: {
            statusHistory: {
              status: 'READY',
              notes: 'Items ready for service'
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking order status:', error);
      // Don't throw - this is a background operation
    }
  }
}

/**
 * Service class for invoice management
 */
class InvoiceService {
  /**
   * Create a new invoice
   * @param {string} orderId - Order ID
   * @param {Object} user - User creating the invoice
   * @returns {Promise<Invoice>} - Created invoice
   */
  async createInvoice(orderId, user) {
    try {
      // Check if order exists
      const order = await Order.findById(orderId)
        .populate('items.dish', 'dishName')
        .populate('items.variant', 'variantName');
        
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }
      
      // Check if invoice already exists for this order
      const existingInvoice = await Invoice.findOne({ order: orderId });
      if (existingInvoice) {
        throw new ApiError(400, 'Invoice already exists for this order');
      }
      
      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();
      
      // Get restaurant details (from environment or settings)
      const restaurantDetails = {
        name: process.env.RESTAURANT_NAME || 'Restaurant Name',
        address: process.env.RESTAURANT_ADDRESS || 'Restaurant Address',
        phone: process.env.RESTAURANT_PHONE || 'Restaurant Phone',
        email: process.env.RESTAURANT_EMAIL || 'restaurant@example.com',
        gstin: process.env.RESTAURANT_GSTIN || '',
        fssaiLicense: process.env.RESTAURANT_FSSAI || ''
      };
      
      // Prepare invoice data
      const invoiceData = {
        invoiceNumber,
        order: orderId,
        orderNumber: order.orderNumber,
        customerDetails: {
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email || '',
          address: order.customer.address || {}
        },
        restaurantDetails,
        // Generate items from order items
        items: order.items.map(item => ({
          name: this.generateItemName(item),
          quantity: item.quantity,
          price: item.price,
          amount: item.itemTotal
        })),
        // Copy tax breakdown
        taxBreakup: order.pricing.taxBreakdown.map(tax => ({
          taxName: tax.taxName,
          taxRate: tax.taxRate,
          taxableAmount: order.pricing.subtotal,
          taxAmount: tax.taxAmount
        })),
        // Copy payment details
        paymentDetails: {
          subtotal: order.pricing.subtotal,
          taxTotal: order.pricing.totalTax,
          discount: order.pricing.discountAmount,
          deliveryCharge: order.pricing.deliveryCharge,
          packagingCharge: order.pricing.packagingCharge,
          serviceCharge: order.pricing.serviceCharge,
          tip: order.pricing.tip,
          roundOff: order.pricing.roundOff,
          grandTotal: order.pricing.total,
          amountPaid: order.payments.reduce((sum, payment) => sum + payment.amount, 0),
          changeReturned: 0, // Will be calculated if needed
          outstandingAmount: 0 // Will be calculated
        },
        // Copy payment methods
        paymentMethods: order.payments.map(payment => ({
          method: payment.method,
          amount: payment.amount,
          transactionId: payment.transactionId
        })),
        // Additional info
        additionalInfo: {
          orderType: order.orderType,
          tableNumber: order.table ? order.table.toString() : '',
          serverName: order.serverInfo?.server?.username || '',
          notes: '',
          terms: process.env.INVOICE_TERMS || 'Thank you for your business!',
          footer: process.env.INVOICE_FOOTER || ''
        },
        // Set payment status
        status: order.paymentStatus === 'PAID' ? 'PAID' : 'ISSUED',
        isPaid: order.paymentStatus === 'PAID',
        createdBy: user._id,
        updatedBy: user._id
      };
      
      // Calculate outstanding amount
      invoiceData.paymentDetails.outstandingAmount = Math.max(
        0, 
        invoiceData.paymentDetails.grandTotal - invoiceData.paymentDetails.amountPaid
      );
      
      // Create and save the invoice
      const invoice = new Invoice(invoiceData);
      await invoice.save();
      
      // Update order with invoice reference and invoice number
      await Order.findByIdAndUpdate(orderId, {
        invoice: invoice._id,
        invoiceNumber: invoiceNumber
      });
      
      // Return populated invoice
      return this.getInvoiceById(invoice._id);
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ApiError(400, 'Invalid invoice data', error.errors);
      }
      throw error;
    }
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Invoice>} - Invoice object
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId)
        .populate('order', 'orderNumber orderDate orderType orderStatus')
        .populate('createdBy', 'username name')
        .populate('updatedBy', 'username name');
        
      if (!invoice) {
        throw new ApiError(404, 'Invoice not found');
      }
      
      return invoice;
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid invoice ID');
      }
      throw error;
    }
  }

  /**
   * Get invoices with filtering
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{invoices: Array, totalCount: number, pageCount: number}>}
   */
  async getInvoices(filters = {}, pagination = { page: 1, limit: 50 }) {
    // Build query from filters
    const query = {};
    
    if (filters.orderId) {
      query.order = filters.orderId;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.isPaid !== undefined) {
      query.isPaid = filters.isPaid === 'true';
    }
    
    if (filters.startDate && filters.endDate) {
      query.invoiceDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      query.invoiceDate = { $gte: new Date(filters.startDate) };
    } else if (filters.endDate) {
      query.invoiceDate = { $lte: new Date(filters.endDate) };
    }
    
    // Search
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { orderNumber: searchRegex },
        { 'customerDetails.name': searchRegex },
        { 'customerDetails.phone': searchRegex }
      ];
    }
    
    // Calculate pagination values
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Execute queries
    const [invoices, totalCount] = await Promise.all([
      Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order', 'orderNumber orderDate orderStatus')
        .populate('createdBy', 'username name'),
      Invoice.countDocuments(query)
    ]);
    
    return {
      invoices,
      totalCount,
      pageCount: Math.ceil(totalCount / limit),
      currentPage: page,
      limit
    };
  }

  /**
   * Mark invoice as printed
   * @param {string} invoiceId - Invoice ID
   * @param {Object} user - User printing the invoice
   * @returns {Promise<Invoice>} - Updated invoice
   */
  async markInvoiceAsPrinted(invoiceId, user) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        throw new ApiError(404, 'Invoice not found');
      }
      
      // Update printed info
      invoice.isPrinted = true;
      invoice.printedAt = new Date();
      invoice.printCount += 1;
      invoice.updatedBy = user._id;
      
      // Save invoice
      await invoice.save();
      
      return invoice;
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid invoice ID');
      }
      throw error;
    }
  }

  /**
   * Mark invoice as emailed
   * @param {string} invoiceId - Invoice ID
   * @param {string} email - Email address
   * @param {Object} user - User sending the email
   * @returns {Promise<Invoice>} - Updated invoice
   */
  async markInvoiceAsEmailed(invoiceId, email, user) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        throw new ApiError(404, 'Invoice not found');
      }
      
      // Update email info
      invoice.isEmailSent = true;
      invoice.emailSentAt = new Date();
      invoice.emailSentTo = email;
      invoice.updatedBy = user._id;
      
      // Save invoice
      await invoice.save();
      
      return invoice;
    } catch (error) {
      if (error.kind === 'ObjectId') {
        throw new ApiError(404, 'Invalid invoice ID');
      }
      throw error;
    }
  }

  /**
   * Generate a human-readable name for an item
   * @param {Object} item - Order item
   * @returns {string} - Formatted name
   */
  generateItemName(item) {
    let name = item.dishName || 'Unknown Item';
    
    // Add variant if exists
    if (item.variantName) {
      name += ` - ${item.variantName}`;
    }
    
    // Add add-ons if exist
    if (item.addOns && item.addOns.length > 0) {
      const addonNames = item.addOns.map(addon => addon.name).join(', ');
      name += ` (${addonNames})`;
    }
    
    return name;
  }
}

// Export service instances
export const orderService = new OrderService();
export const kotService = new KOTService();
export const invoiceService = new InvoiceService();
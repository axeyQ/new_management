// models/OrderModel.js
import mongoose from 'mongoose';
import { generateOrderNumber } from '@/utils/orderUtils';

// Reusable schema for payment methods
const PaymentMethodSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'WALLET', 'OTHER'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  transactionId: {
    type: String
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  notes: String,
  metadata: mongoose.Schema.Types.Mixed
});

// Order item schema with variants and add-ons
const OrderItemSchema = new mongoose.Schema({
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true
  },
  dishName: {
    type: String,
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant'
  },
  variantName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  addOns: [{
    addOn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddOn'
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  specialInstructions: String,
  itemStatus: {
    type: String,
    enum: ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'],
    default: 'PENDING'
  },
  kotGenerated: {
    type: Boolean,
    default: false
  },
  itemTotal: {
    type: Number,
    required: true
  }
});

// Main Order Schema
const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  orderType: {
    type: String,
    enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER', 'DIRECT_TAKEAWAY', 'DIRECT_DELIVERY', 'THIRD_PARTY'],
    required: true
  },
  thirdPartyProvider: {
    type: String,
    enum: [null, 'ZOMATO', 'SWIGGY', 'UBER_EATS', 'OTHER'],
    default: null
  },
  thirdPartyOrderId: String,
  orderStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  orderDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      landmark: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    customerType: {
      type: String,
      enum: ['NEW', 'RETURNING', 'REGISTERED', 'VIP'],
      default: 'NEW'
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    }
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  serverInfo: {
    server: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  items: [OrderItemSchema],
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxBreakdown: [{
      taxName: {
        type: String,
        required: true
      },
      taxRate: {
        type: Number,
        required: true
      },
      taxAmount: {
        type: Number,
        required: true
      }
    }],
    totalTax: {
      type: Number,
      required: true,
      default: 0
    },
    discount: {
      type: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED', 'NONE'],
        default: 'NONE'
      },
      value: {
        type: Number,
        default: 0
      },
      code: String,
      reason: String
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    deliveryCharge: {
      type: Number,
      default: 0
    },
    packagingCharge: {
      type: Number,
      default: 0
    },
    serviceCharge: {
      type: Number,
      default: 0
    },
    tip: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    roundOff: {
      type: Number,
      default: 0
    },
    amountDue: {
      type: Number,
      required: true
    }
  },
  payments: [PaymentMethodSchema],
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'REFUND_PENDING'],
    default: 'UNPAID'
  },
  kots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KOT'
  }],
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  notes: String,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Calculate totals and generate order number before saving
OrderSchema.pre('save', async function(next) {
  // Calculate totals if this is a new document
  if (this.isNew) {
    // Generate order number
    if (!this.orderNumber) {
      this.orderNumber = await generateOrderNumber();
    }
    
    // Add initial status to history
    this.statusHistory.push({
      status: this.orderStatus,
      user: this.createdBy,
      notes: 'Order created'
    });
  } 
  // If order status changed, add to history
  else if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      user: this.updatedBy,
      notes: `Status changed to ${this.orderStatus}`
    });
  }
  
  next();
});

// Calculate payment status
OrderSchema.methods.calculatePaymentStatus = function() {
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  if (totalPaid === 0) {
    this.paymentStatus = 'UNPAID';
  } else if (totalPaid < this.pricing.total) {
    this.paymentStatus = 'PARTIALLY_PAID';
  } else {
    this.paymentStatus = 'PAID';
  }
  
  return this.paymentStatus;
};

// Get outstanding balance
OrderSchema.methods.getOutstandingBalance = function() {
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, this.pricing.total - totalPaid);
};

// Statics for analytics
OrderSchema.statics.getTotalSalesByDate = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        orderStatus: { $in: ['COMPLETED', 'PAID'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
        totalSales: { $sum: "$pricing.total" },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;




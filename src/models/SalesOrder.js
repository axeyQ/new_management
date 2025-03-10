// src/models/SalesOrder.js
import mongoose from 'mongoose';

const SalesOrderSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  refNum: {
    type: String,
    required: true
  },
  orderDateTime: {
    type: Date,
    default: Date.now
  },
  orderMode: {
    type: String,
    enum: ['Dine-in', 'Takeaway', 'Delivery', 'Direct Order-TableQR',
      'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'],
    required: true
  },
  numOfPeople: {
    type: Number
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
    email: {
      type: String
    },
    address: {
      type: String
    }
  },
  itemsSold: [{
    dish: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish'
    },
    dishName: {
      type: String,
      required: true
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Variant'
    },
    variantName: {
      type: String
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
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
        required: true
      }
    }],
    notes: {
      type: String
    }
  }],
  taxDetails: [{
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
  discount: {
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    discountValue: {
      type: Number,
      default: 0
    },
    discountReason: {
      type: String
    }
  },
  payment: [{
    method: {
      type: String,
      enum: ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'ZomatoPay'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    transactionId: {
      type: String
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  }],
  staff: {
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    biller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rider'
    }
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'processing', 'out-for-delivery', 'delivered',
      'cancelled'],
    default: 'pending'
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  // Updated with Zomato-specific status values
  orderStatus: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'out-for-delivery', 'scheduled', 'served', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  subtotalAmount: {
    type: Number,
    required: true
  },
  totalTaxAmount: {
    type: Number,
    required: true
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  packagingCharge: {
    type: Number,
    default: 0
  },
  
  // Zomato-specific tracking information
  zomatoOrderDetails: {
    zomatoOrderId: {
      type: String
    },
    zomatoStatus: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
      default: 'placed'
    },
    deliveryPartner: {
      name: { type: String },
      phone: { type: String },
      arrived: { type: Boolean, default: false },
      arrivedAt: { type: Date }
    },
    estimatedReadyTime: {
      type: Date
    },
    estimatedDeliveryTime: {
      type: Date
    },
    timeline: [{
      status: {
        type: String,
        enum: ['placed', 'accepted', 'preparing', 'ready', 'delivery-partner-assigned', 
               'delivery-partner-arrived', 'out-for-delivery', 'delivered', 'cancelled']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      note: {
        type: String
      }
    }]
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate invoice number automatically
SalesOrderSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    // Get count of orders today for sequence number
    const today = new Date(date.setHours(0, 0, 0, 0));
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const sequence = (count + 1).toString().padStart(4, '0');
    // Format: INV-YYMMDD-XXXX
    this.invoiceNumber = `INV-${year}${month}${day}-${sequence}`;
    // Generate reference number
    this.refNum = `REF-${year}${month}${day}-${sequence}`;
  }
  
  // Initialize Zomato details if it's a Zomato order
  if (this.orderMode === 'Zomato' && !this.zomatoOrderDetails) {
    this.zomatoOrderDetails = {
      zomatoStatus: 'placed',
      timeline: [{
        status: 'placed',
        timestamp: this.orderDateTime || new Date(),
        note: 'Order placed via Zomato'
      }]
    };
  }
  
  next();
});

const SalesOrder = mongoose.models.SalesOrder || mongoose.model('SalesOrder', SalesOrderSchema);
export default SalesOrder;
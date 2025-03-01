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
    enum: ['Dine-in', 'Takeaway', 'Delivery', 'Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'],
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
    variant: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Variant'
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
    enum: ['pending', 'processing', 'out-for-delivery', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  table: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table' 
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
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
  next();
});

const SalesOrder = mongoose.models.SalesOrder || mongoose.model('SalesOrder', SalesOrderSchema);

export default SalesOrder;
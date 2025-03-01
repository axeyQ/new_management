import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  salesOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder',
    required: true
  },
  customerDetails: {
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
    },
    gstin: { 
      type: String 
    }
  },
  restaurantDetails: {
    name: { 
      type: String, 
      required: true 
    },
    address: { 
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
    gstin: { 
      type: String 
    },
    fssaiLicense: { 
      type: String 
    }
  },
  items: [{
    name: { 
      type: String, 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true 
    },
    price: { 
      type: Number, 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    hsnCode: { 
      type: String 
    },
    taxRate: { 
      type: Number 
    }
  }],
  taxBreakup: [{
    taxName: { 
      type: String, 
      required: true 
    },
    taxRate: { 
      type: Number, 
      required: true 
    },
    taxableAmount: { 
      type: Number, 
      required: true 
    },
    taxAmount: { 
      type: Number, 
      required: true 
    }
  }],
  paymentDetails: {
    subtotal: { 
      type: Number, 
      required: true 
    },
    taxTotal: { 
      type: Number, 
      required: true 
    },
    discount: { 
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
    grandTotal: { 
      type: Number, 
      required: true 
    },
    amountPaid: { 
      type: Number, 
      required: true 
    },
    changeReturned: { 
      type: Number, 
      default: 0 
    }
  },
  paymentMethods: [{
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
    }
  }],
  additionalInfo: {
    orderType: {
      type: String,
      enum: ['Dine-in', 'Takeaway', 'Delivery', 'Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'],
      required: true
    },
    tableNumber: { 
      type: String 
    },
    serverName: { 
      type: String 
    },
    notes: { 
      type: String 
    }
  },
  invoiceDate: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  dueDate: { 
    type: Date 
  },
  isPaid: { 
    type: Boolean, 
    default: true 
  },
  isEmailSent: { 
    type: Boolean, 
    default: false 
  },
  emailSentAt: { 
    type: Date 
  },
  isPrinted: { 
    type: Boolean, 
    default: false 
  },
  printedAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

export default Invoice;
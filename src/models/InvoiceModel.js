// models/InvoiceModel.js
import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  customerDetails: {
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
      zipCode: String
    },
    gstin: String
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
    email: String,
    gstin: String,
    fssaiLicense: String,
    logo: String,
    website: String,
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String
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
    hsnCode: String,
    taxRate: Number
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
    serviceCharge: {
      type: Number,
      default: 0
    },
    tip: {
      type: Number,
      default: 0
    },
    roundOff: {
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
    },
    outstandingAmount: {
      type: Number,
      default: 0
    }
  },
  paymentMethods: [{
    method: {
      type: String,
      enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'WALLET', 'OTHER'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    transactionId: String
  }],
  additionalInfo: {
    orderType: {
      type: String,
      enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER', 'DIRECT_TAKEAWAY', 'DIRECT_DELIVERY', 'THIRD_PARTY'],
      required: true
    },
    tableNumber: String,
    serverName: String,
    notes: String,
    terms: String,
    footer: String
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'],
    default: 'DRAFT'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  emailSentTo: String,
  isPrinted: {
    type: Boolean,
    default: false
  },
  printedAt: Date,
  printCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
export default Invoice;
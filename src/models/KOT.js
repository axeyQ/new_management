import mongoose from 'mongoose';

const KOTSchema = new mongoose.Schema({
  kotInvoiceId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  kotFinalId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  refNum: { 
    type: String, 
    required: true 
  },
  kotTokenNum: { 
    type: String, 
    required: true 
  },
  salesOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder',
    required: true
  },
  invoiceNum: { 
    type: String, 
    required: true 
  },
  orderMode: {
    type: String,
    enum: ['Dine-in', 'Takeaway', 'Delivery', 'Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'],
    required: true
  },
  table: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table' 
  },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true }
  },
  items: [{
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
    variantName: {
      type: String
    },
    quantity: { 
      type: Number, 
      required: true 
    },
    addOns: [{
      addOn: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'AddOn'
      },
      addOnName: {
        type: String
      }
    }],
    notes: { 
      type: String 
    }
  }],
  kotStatus: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending'
  },
  printed: { 
    type: Boolean, 
    default: false 
  },
  printerId: { 
    type: String
  },
  printedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Generate KOT IDs automatically
KOTSchema.pre('save', async function(next) {
  if (!this.kotInvoiceId) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get count of KOTs today for sequence number
    const today = new Date(date.setHours(0, 0, 0, 0));
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const sequence = (count + 1).toString().padStart(4, '0');
    
    // Format: KOT-YYMMDD-XXXX
    this.kotInvoiceId = `KOT-${year}${month}${day}-${sequence}`;
    this.kotFinalId = `KF-${year}${month}${day}-${sequence}`;
    this.kotTokenNum = sequence;
  }
  next();
});

const KOT = mongoose.models.KOT || mongoose.model('KOT', KOTSchema);

export default KOT;
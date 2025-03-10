// models/KOTModel.js
import mongoose from 'mongoose';

const KotItemSchema = new mongoose.Schema({
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
  addOns: [{
    addOn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddOn'
    },
    addOnName: String
  }],
  specialInstructions: String,
  kotStatus: {
    type: String,
    enum: ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  }
});

const KOTSchema = new mongoose.Schema({
  kotNumber: {
    type: String,
    required: true,
    unique: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderItem'
  }],
  kotItems: [KotItemSchema],
  kotStatus: {
    type: String,
    enum: ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  orderType: {
    type: String,
    required: true
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  customer: {
    name: String,
    phone: String
  },
  priority: {
    type: Number,
    default: 2, // 1=high, 2=normal, 3=low
  },
  preparationStartTime: Date,
  completionTime: Date,
  estimatedCompletionTime: Date,
  printed: {
    type: Boolean,
    default: false
  },
  printedAt: Date,
  printCount: {
    type: Number,
    default: 0
  },
  printedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  station: {
    type: String,
    enum: ['KITCHEN', 'BAR', 'DESSERT', 'OTHER'],
    default: 'KITCHEN'
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
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true
});

// Generate KOT number with date and sequence
KOTSchema.pre('save', async function(next) {
  // Add to status history if status changed
  if (this.isModified('kotStatus')) {
    this.statusHistory.push({
      status: this.kotStatus,
      user: this.updatedBy,
      notes: `Status changed to ${this.kotStatus}`
    });
  }
  
  next();
});

// Method to calculate preparation time
KOTSchema.methods.calculatePrepTime = function() {
  if (this.preparationStartTime && this.completionTime) {
    return Math.round((this.completionTime - this.preparationStartTime) / (1000 * 60));
  }
  return null;
};

const KOT = mongoose.models.KOT || mongoose.model('KOT', KOTSchema);
export default KOT;
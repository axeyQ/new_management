import mongoose from 'mongoose';

const SubCategorySchema = new mongoose.Schema({
  subCategoryName: {
    type: String,
    required: true,
    unique: true
  },
  image: {
    type: String
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategoryStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  discountStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discount'
  },
  availabilityStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  // Add stock status with order mode support
  stockStatus: {
    // Global flag for backward compatibility
    isOutOfStock: {
      type: Boolean,
      default: false
    },
    // Order mode-specific stock status
    orderModes: {
      dineIn: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      },
      takeaway: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      },
      delivery: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      },
      qrOrdering: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      },
      directTakeaway: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      },
      directDelivery: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      },
      zomato: { 
        isOutOfStock: { type: Boolean, default: false },
        restockTime: { type: Date },
        outOfStockReason: { type: String }
      }
    },
    // Common fields
    restockTime: {
      type: Date
    },
    outOfStockReason: {
      type: String
    },
    autoRestock: {
      type: Boolean,
      default: true
    },
    lastStockUpdate: {
      type: Date
    },
    lastStockUpdateBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const SubCategory = mongoose.models.SubCategory || mongoose.model('SubCategory', SubCategorySchema);
export default SubCategory;
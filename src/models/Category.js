import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    unique: true
  },
  image: {
    type: String
  },
  parentCategory: {
    type: String,
    enum: ['food', 'beverage'],
    default: 'food',
    required: true
  },
  categoryStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  discountStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discount'
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

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export default Category;
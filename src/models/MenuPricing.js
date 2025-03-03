// src/models/MenuPricing.js - Updated to properly support variants
import mongoose from 'mongoose';

const MenuPricingSchema = new mongoose.Schema({
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    default: null
  },
  price: {
    type: Number,
    required: true
  },
  taxSlab: {
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
  },
  finalPrice: {
    type: Number,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
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

// Add an index to ensure unique dish+variant combinations
// This prevents duplicate pricing entries for the same dish+variant
MenuPricingSchema.index({ dish: 1, variant: 1 }, { unique: true });

const MenuPricing = mongoose.models.MenuPricing || mongoose.model('MenuPricing', MenuPricingSchema);
export default MenuPricing;
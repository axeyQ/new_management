// src/models/MenuPricing.js
import mongoose from 'mongoose';

const MenuPricingSchema = new mongoose.Schema({
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  taxSlab: {
    type: String,
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

const MenuPricing = mongoose.models.MenuPricing || mongoose.model('MenuPricing', MenuPricingSchema);
export default MenuPricing;
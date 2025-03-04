import mongoose from 'mongoose';
// Create a simple schema without complex indexes
const MenuPricingSchema = new mongoose.Schema({
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true
  },
  // Make variant optional
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    required: false
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
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Set this option to make Mongoose handle duplicate keys better
  collation: { locale: 'en', strength: 2 }
});

// Add proper compound index that includes menu + dish + variant
MenuPricingSchema.index({ menu: 1, dish: 1, variant: 1 }, { unique: true });

const MenuPricing = mongoose.models.MenuPricing || mongoose.model('MenuPricing', MenuPricingSchema);
export default MenuPricing;
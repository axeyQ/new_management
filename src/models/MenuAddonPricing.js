import mongoose from 'mongoose';

const MenuAddonPricingSchema = new mongoose.Schema({
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  addon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddOn',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  // Tax information
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Add compound index to ensure unique menu+addon combinations
MenuAddonPricingSchema.index({ menu: 1, addon: 1 }, { unique: true });

// Pre-save hook to calculate tax amount and final price
MenuAddonPricingSchema.pre('save', function(next) {
  if (this.isModified('price') || this.isModified('taxRate')) {
    // Recalculate tax amount
    this.taxAmount = (this.price * this.taxRate) / 100;
    // Recalculate final price
    this.finalPrice = this.price + this.taxAmount;
  }
  next();
});

const MenuAddonPricing = mongoose.models.MenuAddonPricing ||
  mongoose.model('MenuAddonPricing', MenuAddonPricingSchema);

export default MenuAddonPricing;
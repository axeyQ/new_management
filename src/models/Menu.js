// src/models/Menu.js
import mongoose from 'mongoose';

const MenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  orderMode: {
    type: String,
    enum: ['Dine-in', 'Takeaway', 'Delivery', 'Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  dishPricing: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuPricing'
  }],
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

// Ensure that direct order modes can only have one menu
MenuSchema.pre('save', async function(next) {
  const directOrderModes = ['Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'];
  
  if (directOrderModes.includes(this.orderMode)) {
    // Check if this is a new menu or an existing one being updated
    const existingMenu = await this.constructor.findOne({
      orderMode: this.orderMode,
      _id: { $ne: this._id } // Skip checking this document if it's an update
    });
    
    if (existingMenu) {
      const error = new Error(`Only one menu can be created for ${this.orderMode} mode`);
      return next(error);
    }
  }
  
  next();
});

const Menu = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
export default Menu;
import mongoose from 'mongoose';

const MenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
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
  isActive: {
    type: Boolean,
    default: true
  },
  // Time restrictions if needed
  availableFrom: {
    type: Date
  },
  availableTo: {
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

const Menu = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
export default Menu;
// src/models/Outlet.js
import mongoose from 'mongoose';

const OutletSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Outlet name is required'],
    trim: true,
    unique: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  // New fields
  website: {
    type: String,
    trim: true
  },
  vatNumber: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  logoUrl: {
    type: String,
    trim: true
  },
  // Existing fields
  currentStatus: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  currentOfflineReason: {
    type: String,
    default: null
  },
  offlineTimestamp: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deliveryRadius: {
    type: Number,
    default: 5 // in kilometers
  },
  deliveryMinimumOrder: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
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

// Virtual property to check if outlet is currently open based on operational hours
OutletSchema.virtual('isOpen').get(async function() {
  try {
    // This implementation would depend on your OperationalHours model
    // Logic to check if the outlet is currently open based on day and time
    // For now, returning true if the outlet is active and online
    return this.isActive && this.currentStatus === 'online';
  } catch (error) {
    console.error('Error checking if outlet is open:', error);
    return false;
  }
});

// Update timestamps on save
OutletSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Create text index for search
OutletSchema.index({ name: 'text', address: 'text', city: 'text' });

const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', OutletSchema);

export default Outlet;
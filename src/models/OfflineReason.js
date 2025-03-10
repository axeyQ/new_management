// src/models/OfflineReason.js
import mongoose from 'mongoose';

const OfflineReasonSchema = new mongoose.Schema({
  reason: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: [3, 'Reason must be at least 3 characters long']
  },
  description: {
    type: String,
    trim: true
  },
  isActive: { 
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

// Update the updatedAt timestamp before saving
OfflineReasonSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Create a text index on reason field to enable text search
OfflineReasonSchema.index({ reason: 'text', description: 'text' });

const OfflineReason = mongoose.models.OfflineReason || mongoose.model('OfflineReason', OfflineReasonSchema);
export default OfflineReason;
// src/models/OutletStatusLog.js
import mongoose from 'mongoose';

const OutletStatusLogSchema = new mongoose.Schema({
  outlet: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Outlet', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['online', 'offline'], 
    required: true 
  },
  reason: { 
    type: String,
    required: function() {
      return this.status === 'offline'; // Reason is required when status is offline
    }
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true // Index for faster queries on timestamp
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
});

// Create compound index for outlet + timestamp to optimize status history queries
OutletStatusLogSchema.index({ outlet: 1, timestamp: -1 });

const OutletStatusLog = mongoose.models.OutletStatusLog || mongoose.model('OutletStatusLog', OutletStatusLogSchema);
export default OutletStatusLog;
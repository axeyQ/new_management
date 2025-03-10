// src/models/StockHistory.js
import mongoose from 'mongoose';

const StockHistorySchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['dish', 'variant'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  action: {
    type: String,
    enum: ['out-of-stock', 'restocked'],
    required: true
  },
  reason: {
    type: String
  },
  restockTime: {
    type: Date
  },
  autoRestock: {
    type: Boolean
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const StockHistory = mongoose.models.StockHistory || mongoose.model('StockHistory', StockHistorySchema);
export default StockHistory;
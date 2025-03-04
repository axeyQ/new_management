import mongoose from 'mongoose';

const AddOnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    default: 0
  },
  availabilityStatus: {
    type: Boolean,
    default: true
  },
  dishReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish'
  },
  // Add variant reference
  variantReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant'
  },
  addonGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddOnGroup'
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

// Compound index for dish + variant references to make sure we don't have duplicates
AddOnSchema.index({ 
  dishReference: 1, 
  variantReference: 1 
}, { 
  unique: true, 
  partialFilterExpression: { dishReference: { $exists: true } }
});

const AddOn = mongoose.models.AddOn || mongoose.model('AddOn', AddOnSchema);

export default AddOn;
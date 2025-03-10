import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const AddOnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number
  },
  availabilityStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  dishReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    sparse: true
  },
  variantReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    sparse: true
  },
  customId: {
    type: String,
    default: function() {
      // Only set a custom ID if this is a custom add-on (no dish reference)
      if (!this.dishReference) {
        return uuidv4();
      }
      return null;
    },
    sparse: true
  },
  dieteryTag: {
    type: String,
    enum: ['veg', 'non veg', 'egg'],
    default: 'veg',
    required: true
  }
});

// Create a unique compound index that includes customId for custom add-ons
AddOnSchema.index(
  { 
    dishReference: 1, 
    variantReference: 1, 
    customId: 1 
  }, 
  { 
    unique: true,
    // Make the index sparse so that null values don't conflict
    sparse: true 
  }
);

// Pre-save hook to ensure proper indexing
AddOnSchema.pre('save', function(next) {
  // If this is a custom add-on (no dish reference), ensure customId is set
  if (!this.dishReference && !this.customId) {
    this.customId = uuidv4();
  }
  next();
});

const AddOn = mongoose.models.AddOn || mongoose.model('AddOn', AddOnSchema);
export default AddOn;
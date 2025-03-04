import mongoose from 'mongoose';

const AddOnGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  addOns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddOn'
  }],
  // Keep as ObjectId reference to match existing database schema
  availabilityStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  // New fields for selection requirements
  isCompulsory: {
    type: Boolean,
    default: false
  },
  minSelection: {
    type: Number,
    default: 0,
    min: 0
  },
  maxSelection: {
    type: Number,
    default: 0,  // 0 means unlimited
    min: 0
  },
  allowMultiple: {
    type: Boolean,
    default: false
  },
  maxQuantityPerItem: {
    type: Number,
    default: 1,
    min: 1
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

// Add validation logic for min/max selection
AddOnGroupSchema.pre('save', function(next) {
  // If group is compulsory, minSelection must be at least 1
  if (this.isCompulsory && this.minSelection < 1) {
    this.minSelection = 1;
  }
  
  // maxSelection should be greater than or equal to minSelection if set
  if (this.maxSelection > 0 && this.maxSelection < this.minSelection) {
    this.maxSelection = this.minSelection;
  }
  
  next();
});

const AddOnGroup = mongoose.models.AddOnGroup || mongoose.model('AddOnGroup', AddOnGroupSchema);
export default AddOnGroup;
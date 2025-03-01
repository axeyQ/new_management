import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  variantName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  image: { 
    type: String 
  },
  description: { 
    type: String 
  },
  shortCode: { 
    type: String 
  },
  sales: { 
    type: Number, 
    default: 0 
  },
  availabilityStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Status' 
  },
  discountStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discount' 
  }, 
  packagingCharges: {
    type: { 
      type: String, 
      enum: ['fixed', 'percentage'], 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    appliedAt: { 
      type: String, 
      enum: ['dish', 'billing'], 
      required: true 
    }
  },
  gstItemType: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GSTItemType'
  },
  taxes: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tax' 
  },
  natureTags: {
    cuisine: { type: String, required: true },
    spiciness: { type: String, required: true },
    sweetnessSaltness: { type: String, required: true },
    texture: { type: String, required: true },
    oil: { type: String, required: true },
    temperature: { type: String, required: true },
    cookingStyle: { type: String, required: true },
    other: { type: String }
  },
  statInclusion: { 
    type: Boolean, 
    default: false 
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

const Variant = mongoose.models.Variant || mongoose.model('Variant', VariantSchema);

export default Variant;
import mongoose from 'mongoose';

const SubCategorySchema = new mongoose.Schema({
  subCategoryName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  image: { 
    type: String 
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    required: true 
  },
  subCategoryStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Status' 
  },
  discountStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discount' 
  },
  availabilityStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Status' 
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

const SubCategory = mongoose.models.SubCategory || mongoose.model('SubCategory', SubCategorySchema);

export default SubCategory;
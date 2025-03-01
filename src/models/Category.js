import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  categoryName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  image: { 
    type: String 
  },
  parentCategory: { 
    type: String,
    enum: ['food', 'beverage'],
    default: 'food',
    required: true
  },
  categoryStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Status' 
  },
  discountStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discount' 
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

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

export default Category;
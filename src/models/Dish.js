import mongoose from 'mongoose';
import NutritionInfoSchema from './NutritionInfo';

const DishSchema = new mongoose.Schema({
  dishName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  image: { 
    type: String 
  },
  subCategory: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SubCategory' 
  }],
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
  variations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Variant' 
  }],
  availabilityStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Status' 
  },
  discountStatus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discount' 
  },
  dieteryTag: { 
    type: String, 
    enum: ['veg', 'non veg', 'egg'],
    default: 'veg', 
    required: true 
  },
  specialTag: { 
    type: String, 
    enum: ["Chef's Special", 'Gluten Free', 'Jain', 'Sugar Free', 'Vegan'] 
  },
  spiceLevel: { 
    type: String, 
    enum: ['Low Spicy', 'Very Spicy', 'Medium Spicy'] 
  },
  frostType: { 
    type: String, 
    enum: ['Freshly Frosted', 'Pre Frosted'] 
  },
  servingInfo: {
    portionSize: { type: String },
    quantity: { type: Number },
    unit: { type: String, enum: ['grams', 'ml', 'pieces'] },
    serves: { type: Number }
  },
  nutritionPerServingInfo: NutritionInfoSchema,
  allergen: [{ 
    type: String, 
    enum: ['Crustacean', 'Tree Nuts', 'Peanut', 'Gluten', 'Fish', 'Soybeans', 'Milk', 'Sulphate', 'Egg'] 
  }],
  addOns: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AddOnGroup' 
  },
  packagingCharges: {
    type: { 
      type: String, 
      enum: ['fixed', 'percentage'], 
      required: true 
    },
    amount: { type: Number, required: true },
    appliedAt: { 
      type: String, 
      enum: ['dish', 'billing'], 
      required: true 
    }
  },
  gstItemType: { 
    type: String, 
    enum: ['goods', 'services'], 
    required: true 
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

const Dish = mongoose.models.Dish || mongoose.model('Dish', DishSchema);

export default Dish;
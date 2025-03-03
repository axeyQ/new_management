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
    // Removed required here too
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
    enum: ['veg', 'non veg', 'egg', ''],
    default: 'veg'
  },
  specialTag: { 
    type: String, 
    enum: ["Chef's Special", 'Gluten Free', 'Jain', 'Sugar Free', 'Vegan', ''],
    default: ''
  },
  spiceLevel: { 
    type: String, 
    enum: ['Low Spicy', 'Very Spicy', 'Medium Spicy', ''],
    default: ''
  },
  frostType: { 
    type: String, 
    enum: ['Freshly Frosted', 'Pre Frosted', ''],
    default: ''
  },
servingInfo: {
  portionSize: { type: String },
  quantity: { type: Number },
  // Option 1: Make it validate only when the field has a value
  unit: { 
    type: String, 
    enum: ['grams', 'ml', 'pieces'],
    // This makes the enum validation only apply when there's a value
    validate: {
      validator: function(v) {
        return v === '' || ['grams', 'ml', 'pieces'].includes(v);
      },
      message: props => `${props.value} is not a valid unit!`
    }
  },
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
      default: 'fixed'
    },
    amount: { 
      type: Number, 
      default: 0
    },
    appliedAt: { 
      type: String, 
      enum: ['dish', 'billing'],
      default: 'dish'
    }
  },
  gstItemType: { 
    type: String, 
    enum: ['goods', 'services'],
    default: 'goods'
  },
  taxes: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tax' 
  },
  natureTags: {
    cuisine: { type: String, default: '' },
    spiciness: { type: String, default: '' },
    sweetnessSaltness: { type: String, default: '' },
    texture: { type: String, default: '' },
    oil: { type: String, default: '' },
    temperature: { type: String, default: '' },
    cookingStyle: { type: String, default: '' },
    other: { type: String, default: '' }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add a pre-save hook to ensure natureTags are properly set
DishSchema.pre('save', function(next) {
  // Set default empty strings for all natureTags if they're undefined
  if (!this.natureTags) {
    this.natureTags = {
      cuisine: '',
      spiciness: '',
      sweetnessSaltness: '',
      texture: '',
      oil: '',
      temperature: '',
      cookingStyle: '',
      other: ''
    };
  } else {
    // Ensure all natureTags fields have at least empty string values
    this.natureTags.cuisine = this.natureTags.cuisine || '';
    this.natureTags.spiciness = this.natureTags.spiciness || '';
    this.natureTags.sweetnessSaltness = this.natureTags.sweetnessSaltness || '';
    this.natureTags.texture = this.natureTags.texture || '';
    this.natureTags.oil = this.natureTags.oil || '';
    this.natureTags.temperature = this.natureTags.temperature || '';
    this.natureTags.cookingStyle = this.natureTags.cookingStyle || '';
    this.natureTags.other = this.natureTags.other || '';
  }
  
  // Handle other empty enum fields
  if (this.specialTag === undefined || this.specialTag === null) this.specialTag = '';
  if (this.spiceLevel === undefined || this.spiceLevel === null) this.spiceLevel = '';
  if (this.frostType === undefined || this.frostType === null) this.frostType = '';
  
  // Handle servingInfo
  if (!this.servingInfo) {
    this.servingInfo = {
      portionSize: '',
      quantity: 0,
      unit: '',
      serves: 0
    };
  } else {
    // Ensure unit is never null or undefined
    if (this.servingInfo.unit === null || this.servingInfo.unit === undefined) {
      this.servingInfo.unit = '';
    }
  }
  
  next();
});

const Dish = mongoose.models.Dish || mongoose.model('Dish', DishSchema);

export default Dish;
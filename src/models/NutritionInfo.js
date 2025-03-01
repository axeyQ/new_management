import mongoose from 'mongoose';

const NutritionInfoSchema = new mongoose.Schema({
  calories: { type: Number },
  protein: { type: Number },
  carbohydrates: { type: Number },
  fat: { type: Number },
  fiber: { type: Number },
  sugar: { type: Number },
  sodium: { type: Number }
});

export default NutritionInfoSchema;
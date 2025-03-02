// src/models/AddOn.js - Modified version
import mongoose from 'mongoose';

const AddOnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number
  },
  // Change this from ObjectId reference to boolean
  availabilityStatus: {
    type: Boolean,
    default: true
  },
  dishReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish'
  }
});

const AddOn = mongoose.models.AddOn || mongoose.model('AddOn', AddOnSchema);
export default AddOn;
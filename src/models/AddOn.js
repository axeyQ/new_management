import mongoose from 'mongoose';

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
    ref: 'Dish' 
  } // Optional reference to an existing dish
});

// Make sure to create and export the model properly
const AddOn = mongoose.models.AddOn || mongoose.model('AddOn', AddOnSchema);

export default AddOn;
import mongoose from 'mongoose';
import AddOn from './AddOn'; // Make sure this import is present

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

const AddOnGroup = mongoose.models.AddOnGroup || mongoose.model('AddOnGroup', AddOnGroupSchema);

export default AddOnGroup;
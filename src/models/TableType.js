import mongoose from 'mongoose';

const TableTypeSchema = new mongoose.Schema({
  tableTypeName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  tableTypeDescription: { 
    type: String
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

const TableType = mongoose.models.TableType || mongoose.model('TableType', TableTypeSchema);
export default TableType;
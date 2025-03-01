import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  tableName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  tableDescription: { 
    type: String
  },
  image: {
    type: String
  },
  capacity: {
    type: Number, 
    required: true, 
    default: 1
  },
  status: {
    type: Boolean, 
    required: true, 
    default: true
  },
  tableType: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TableType' 
  },
  positionX: {
    type: Number,
    default: 0
  },
  positionY: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
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

const Table = mongoose.models.Table || mongoose.model('Table', TableSchema);
export default Table;
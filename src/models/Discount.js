import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema({
  dineIn: { 
    type: Boolean, 
    default: true, 
    required: true
  },
  takeaway: { 
    type: Boolean, 
    default: true, 
    required: true
  },
  delivery: { 
    type: Boolean, 
    default: true, 
    required: true
  },
  qrOrdering: { 
    type: Boolean, 
    default: true, 
    required: true
  },
  takeawayCustomerEnd: { 
    type: Boolean, 
    default: true, 
    required: true
  },
  deliveryCustomerEnd: { 
    type: Boolean, 
    default: true, 
    required: true
  },
  zomato: { 
    type: Boolean, 
    default: true, 
    required: true
  },
});

const Discount = mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);

export default Discount;
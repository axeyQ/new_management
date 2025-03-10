// src/models/OperationalHours.js
import mongoose from 'mongoose';

// Define a timeSlot schema for embedded use
const TimeSlotSchema = new mongoose.Schema({
  openTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v); // HH:MM 24hr format validation
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM in 24-hour format.`
    }
  },
  closeTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v); // HH:MM 24hr format validation
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM in 24-hour format.`
    }
  }
}, { _id: true }); // Enable _id for easier management

// Add validation to the TimeSlotSchema
TimeSlotSchema.pre('validate', function(next) {
  if (this.openTime && this.closeTime) {
    if (this.openTime >= this.closeTime) {
      this.invalidate('closeTime', 'Close time must be after open time');
    }
  }
  next();
});

const OperationalHoursSchema = new mongoose.Schema({
  outlet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outlet',
    required: true
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  }, // 0 = Sunday, 6 = Saturday
  isOpen: {
    type: Boolean,
    default: true
  },
  // Keep original fields for backward compatibility
  openTime: {
    type: String,
    validate: {
      validator: function(v) {
        // Only validate if a value is provided
        if (!v) return true;
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v); // HH:MM 24hr format validation
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM in 24-hour format.`
    }
  },
  closeTime: {
    type: String,
    validate: {
      validator: function(v) {
        // Only validate if a value is provided
        if (!v) return true;
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v); // HH:MM 24hr format validation
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM in 24-hour format.`
    }
  },
  // New field for multiple time slots
  timeSlots: {
    type: [TimeSlotSchema],
    default: [],
    validate: {
      validator: function(slots) {
        // If using timeSlots, must have at least one when isOpen is true
        if (this.isOpen && !this.openTime && !this.closeTime && slots.length === 0) {
          return false;
        }
        return true;
      },
      message: 'At least one time slot is required when the outlet is open'
    }
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
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Update the updatedAt timestamp before saving
OperationalHoursSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Add compound index to ensure uniqueness for outlet + day combination
OperationalHoursSchema.index({ outlet: 1, dayOfWeek: 1 }, { unique: true });

// Validate that closeTime is after openTime if using the original fields
OperationalHoursSchema.pre('validate', function(next) {
  if (this.openTime && this.closeTime) {
    if (this.openTime >= this.closeTime) {
      this.invalidate('closeTime', 'Close time must be after open time');
    }
  }

  // Validate time slots don't overlap
  if (this.timeSlots && this.timeSlots.length > 1) {
    const sortedSlots = [...this.timeSlots].sort((a, b) => a.openTime.localeCompare(b.openTime));
    
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      if (sortedSlots[i].closeTime > sortedSlots[i + 1].openTime) {
        this.invalidate('timeSlots', 'Time slots cannot overlap');
        break;
      }
    }
  }
  
  next();
});

const OperationalHours = mongoose.models.OperationalHours || 
  mongoose.model('OperationalHours', OperationalHoursSchema);

export default OperationalHours;
const mongoose = require('mongoose');

// DOCTOR SCHEDULE - Manages doctor availability
const doctorScheduleSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  
  // Weekly schedule
  dayOfWeek: {
    type: Number, 
    required: true,
    min: 0,
    max: 6
  },
  
  startTime: {
    type: String, 
    required: true
  },
  
  endTime: {
    type: String, 
    required: true
  },
  
  breakStartTime: {
    type: String, 
    default: null
  },
  
  breakEndTime: {
    type: String, 
    default: null
  },
  
  // Slot configuration
  slotDuration: {
    type: Number, 
    default: 30,
    min: 15,
    max: 120
  },
  
  maxAppointmentsPerDay: {
    type: Number,
    default: 20,
    min: 1
  },
  
  // Availability status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Special dates (holidays, leaves)
  exceptions: [{
    date: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      enum: ['holiday', 'leave', 'emergency', 'other'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      maxlength: 200
    }
  }]
  
}, { 
  timestamps: true,
  indexes: [
    { doctor: 1, dayOfWeek: 1 },
    { doctor: 1, isActive: 1 }
  ]
});

// Method to check if doctor is available on a specific date/time
doctorScheduleSchema.methods.isAvailableOn = function(date, time) {
  const dayOfWeek = date.getDay();
  
  // Check if this schedule applies to the requested day
  if (this.dayOfWeek !== dayOfWeek || !this.isActive) {
    return false;
  }
  
  // Check if time is within working hours
  if (time < this.startTime || time > this.endTime) {
    return false;
  }
  
  // Check if time is during break
  if (this.breakStartTime && this.breakEndTime) {
    if (time >= this.breakStartTime && time <= this.breakEndTime) {
      return false;
    }
  }
  
  // Check exceptions for this specific date
  const dateStr = date.toDateString();
  const exception = this.exceptions.find(ex => ex.date.toDateString() === dateStr);
  if (exception) {
    return exception.isAvailable;
  }
  
  return true;
};

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);

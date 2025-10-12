const mongoose = require('mongoose');

// SIMPLIFIED APPOINTMENT MODEL - Only booking essentials
const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  
  // Basic appointment details (patient provides)
  appointmentType: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'routine-checkup'],
    default: 'consultation'
  },
  
  symptoms: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // System-managed fields
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
  },
  
  // Timestamps for tracking
  bookedAt: {
    type: Date,
    default: Date.now
  },
  
  confirmedAt: {
    type: Date
  },
  
  cancelledAt: {
    type: Date
  },
  
  completedAt: {
    type: Date
  }
  
}, { 
  timestamps: true,
  indexes: [
    { patient: 1, date: 1 },
    { doctor: 1, date: 1 },
    { status: 1, date: 1 }
  ]
});

// Simple method to check if appointment is in the past
appointmentSchema.virtual('isPast').get(function() {
  const appointmentDateTime = new Date(`${this.date.toDateString()} ${this.time}`);
  return appointmentDateTime < new Date();
});

module.exports = mongoose.model('Appointment', appointmentSchema);

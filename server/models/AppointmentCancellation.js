const mongoose = require('mongoose');

// APPOINTMENT CANCELLATION - Separate model for cancellation tracking
const appointmentCancellationSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
  },
  
  // Cancellation details
  reason: {
    type: String,
    enum: [
      'patient-request',
      'doctor-unavailable', 
      'emergency',
      'weather',
      'system-error',
      'other'
    ],
    required: true
  },
  
  reasonDetails: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  cancelledBy: {
    type: String,
    enum: ['patient', 'doctor', 'admin', 'system'],
    required: true
  },
  
  cancelledByUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Rescheduling info (if applicable)
  isRescheduled: {
    type: Boolean,
    default: false
  },
  
  newAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Timestamps
  cancelledAt: {
    type: Date,
    default: Date.now
  }
  
}, { 
  timestamps: true,
  indexes: [
    { appointment: 1 },
    { cancelledBy: 1 },
    { cancelledAt: -1 }
  ]
});

module.exports = mongoose.model('AppointmentCancellation', appointmentCancellationSchema);

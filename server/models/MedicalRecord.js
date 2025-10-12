const mongoose = require('mongoose');

// MEDICAL RECORD - Created AFTER appointment is completed
const medicalRecordSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
  },
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
  
  // Medical information (filled by doctor during/after appointment)
  diagnosis: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  
  notes: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  
  prescription: [{
    medication: String,
    dosage: String,
    instructions: String,
    duration: String
  }],
  
  // Follow-up information
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  followUpDate: {
    type: Date
  },
  
  followUpNotes: {
    type: String,
    maxlength: 500
  },
  
  // System tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
  
}, { 
  timestamps: true,
  indexes: [
    { patient: 1, createdAt: -1 },
    { doctor: 1, createdAt: -1 },
    { appointment: 1 }
  ]
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);

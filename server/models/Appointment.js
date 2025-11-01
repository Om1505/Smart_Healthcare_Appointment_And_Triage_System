const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientNameForVisit: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'], 
    default: 'pending', 
    required: true,
  },
  consultationFeeAtBooking: { 
    type: Number,
    required: true,
  },

  reasonForVisit: { type: String, default: '' },
  symptoms: { type: String, default: '' },
  symptomDuration: { type: String, default: '' },
  previousTreatments: { type: String, default: '' },
  medications: { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);